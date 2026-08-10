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
        groups = await self._get_paginated(
            "/groups", {"min_access_level": 10, "top_level_only": True}
        )
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

    async def fetch_repo_docs_folder(
        self, project_id: int, default_branch: str = "main"
    ) -> list[dict]:
        """Fetch documentation files inside the docs/ folder of a GitLab project."""
        logger.info("Fetching docs folder files for GitLab project %d (ref: %s)", project_id, default_branch)
        results: list[dict] = []
        files_to_fetch: list[str] = []

        for folder_name in ["docs", "doc"]:
            try:
                tree_items = await self._get_paginated(
                    f"/projects/{project_id}/repository/tree",
                    extra_params={"path": folder_name, "recursive": True, "ref": default_branch},
                )
                for item in tree_items:
                    if item.get("type") == "blob":
                        files_to_fetch.append(item.get("path", ""))
            except Exception as exc:
                logger.warning("Failed to fetch tree for GitLab project %d folder %s: %s", project_id, folder_name, exc)

        if not files_to_fetch:
            return results

        files_to_fetch = files_to_fetch[:25]

        for file_path in files_to_fetch:
            fname = file_path.split("/")[-1]
            ext = fname.split(".")[-1].lower() if "." in fname else ""
            if ext in ["md", "markdown", "rst", "txt", "pdf", "doc", "docx", "json", "yaml", "yml"]:
                if ext in ["md", "markdown"]:
                    file_type = "markdown"
                elif ext in ["doc", "docx"]:
                    file_type = "doc"
                elif ext == "pdf":
                    file_type = "pdf"
                else:
                    file_type = "txt"

                try:
                    import urllib.parse
                    encoded_path = urllib.parse.quote(file_path, safe="")
                    file_meta = await self._get(
                        f"/projects/{project_id}/repository/files/{encoded_path}",
                        params={"ref": default_branch},
                    )
                    content_str = ""
                    if isinstance(file_meta, dict):
                        encoding = file_meta.get("encoding")
                        raw_content = file_meta.get("content", "")
                        if encoding == "base64" and raw_content:
                            import base64
                            try:
                                decoded_bytes = base64.b64decode(raw_content)
                                if file_type in ["markdown", "txt"]:
                                    content_str = decoded_bytes.decode("utf-8", errors="replace")
                                else:
                                    content_str = f"[Binary Document File: {fname}]"
                            except Exception:
                                content_str = f"[Document File: {fname}]"
                        else:
                            content_str = raw_content or f"[Document File: {fname}]"

                    results.append(
                        {
                            "path": file_path,
                            "file_name": file_path,
                            "file_type": file_type,
                            "content": content_str,
                        }
                    )
                except Exception as err:
                    logger.warning("Failed to fetch GitLab file %s for project %d: %s", file_path, project_id, err)

        return results

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
