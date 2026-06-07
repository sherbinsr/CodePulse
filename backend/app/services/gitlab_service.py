"""GitLab API client: REST v4."""

import logging
from datetime import datetime
from typing import Any, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_STATE_MAP = {"opened": "OPEN", "closed": "CLOSED", "merged": "MERGED"}
_CONCLUSION_MAP = {
    "success": "success",
    "failed": "failure",
    "canceled": "cancelled",
    "skipped": "skipped",
}


class GitLabService:
    def __init__(self, token: str):
        self._token = token
        self._headers = {"Authorization": f"Bearer {token}"}
        self._base = settings.gitlab_api_url

    async def _get(self, path: str, params: Optional[dict] = None) -> Any:
        logger.debug("GitLab GET %s params=%s", path, params)
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{self._base}{path}",
                headers=self._headers,
                params=params or {},
            )
            resp.raise_for_status()
            return resp.json()

    async def _get_paginated(self, path: str, extra_params: Optional[dict] = None) -> list:
        results = []
        page = 1
        while True:
            params = {"per_page": 100, "page": page, **(extra_params or {})}
            batch = await self._get(path, params)
            if not batch:
                break
            results.extend(batch)
            if len(batch) < 100:
                break
            page += 1
        return results

    async def get_authenticated_user(self) -> dict:
        return await self._get("/user")

    async def get_user_groups(self) -> list:
        """Return all groups the authenticated user is a member of."""
        # min_access_level=10 = Guest (lowest level with any access)
        groups = await self._get_paginated("/groups", {"min_access_level": 10, "top_level_only": True})
        return [
            {
                "login": g["path"],
                "full_path": g["full_path"],
                "name": g["name"],
                "avatar_url": g.get("avatar_url"),
                "description": g.get("description"),
                "id": g["id"],
            }
            for g in groups
        ]

    async def fetch_group_projects(self, group_path: str) -> list:
        """Fetch all non-archived projects in a group."""
        encoded = group_path.replace("/", "%2F")
        projects = await self._get_paginated(
            f"/groups/{encoded}/projects",
            {"include_subgroups": False, "archived": False, "order_by": "last_activity_at"},
        )
        return projects

    async def fetch_project_mrs(self, project_id: int) -> list:
        """Fetch all merge requests for a project (all states)."""
        return await self._get_paginated(
            f"/projects/{project_id}/merge_requests",
            {"scope": "all", "state": "all", "order_by": "created_at", "sort": "desc"},
        )

    async def fetch_pipelines(self, project_id: int) -> list:
        """Fetch up to 500 completed pipelines for a project."""
        runs: list[dict] = []
        for status in ("success", "failed", "canceled"):
            batch = await self._get_paginated(
                f"/projects/{project_id}/pipelines",
                {"status": status, "order_by": "id", "sort": "desc"},
            )
            runs.extend(batch[:200])
        return runs

    async def fetch_commits(self, project_id: int, since: str) -> list:
        """Fetch commits since ISO datetime string."""
        try:
            return await self._get_paginated(
                f"/projects/{project_id}/repository/commits",
                {"since": since, "all": True},
            )
        except Exception as exc:
            logger.warning("Failed to fetch commits for project %d: %s", project_id, exc)
            return []

    @staticmethod
    def parse_datetime(dt_str: Optional[str]) -> Optional[datetime]:
        if not dt_str:
            return None
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00")).replace(tzinfo=None)

    @staticmethod
    def hours_between(start: Optional[datetime], end: Optional[datetime]) -> Optional[float]:
        if not start or not end:
            return None
        return round((end - start).total_seconds() / 3600, 2)

    @staticmethod
    def map_mr_state(state: str) -> str:
        return _STATE_MAP.get(state, "CLOSED")

    @staticmethod
    def pipeline_conclusion(status: str) -> str:
        return _CONCLUSION_MAP.get(status, "failure")

    @staticmethod
    async def exchange_code(code: str) -> str:
        logger.info("Exchanging GitLab OAuth code for access token")
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://gitlab.com/oauth/token",
                json={
                    "client_id": settings.gitlab_client_id,
                    "client_secret": settings.gitlab_client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": settings.gitlab_redirect_uri,
                },
                headers={"Accept": "application/json"},
            )
            resp.raise_for_status()
            data = resp.json()
            if "error" in data:
                logger.error("GitLab OAuth error: %s", data.get("error_description", data["error"]))
                raise ValueError(data.get("error_description", data["error"]))
            logger.debug("GitLab OAuth token exchange successful")
            return data["access_token"]
