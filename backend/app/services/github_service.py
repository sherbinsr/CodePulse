"""GitHub API client: REST + GraphQL."""
import logging
from datetime import datetime
from typing import Any, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

PR_ANALYTICS_QUERY = """
query PRAnalytics($org: String!, $repoCursor: String) {
  organization(login: $org) {
    login
    name
    avatarUrl
    repositories(
      first: 50
      after: $repoCursor
      orderBy: { field: UPDATED_AT, direction: DESC }
      isArchived: false
    ) {
      pageInfo { hasNextPage endCursor }
      nodes {
        name
        nameWithOwner
        databaseId
        description
        isPrivate
        defaultBranchRef { name }
        stargazerCount
        forkCount
        primaryLanguage { name }
        pullRequests(
          first: 100
          states: [OPEN, CLOSED, MERGED]
          orderBy: { field: CREATED_AT, direction: DESC }
        ) {
          totalCount
          nodes {
            number
            databaseId
            title
            state
            additions
            deletions
            changedFiles
            comments { totalCount }
            createdAt
            mergedAt
            closedAt
            author { login avatarUrl }
            reviews(first: 50) {
              nodes {
                author { login avatarUrl }
                state
                submittedAt
              }
            }
          }
        }
      }
    }
  }
}
"""


class GitHubService:
    def __init__(self, token: str):
        self._headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    async def _graphql(self, query: str, variables: dict) -> dict:
        logger.debug("GraphQL request with variables: %s", {k: v for k, v in variables.items() if k != "token"})
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                settings.github_graphql_url,
                json={"query": query, "variables": variables},
                headers=self._headers,
            )
            resp.raise_for_status()
            data = resp.json()
            if "errors" in data:
                logger.error("GraphQL error response: %s", data["errors"])
                raise ValueError(f"GraphQL error: {data['errors']}")
            return data["data"]

    async def _rest_get(self, path: str, params: Optional[dict] = None) -> Any:
        logger.debug("REST GET %s params=%s", path, params)
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{settings.github_api_url}{path}",
                headers=self._headers,
                params=params or {},
            )
            resp.raise_for_status()
            return resp.json()

    async def _rest_get_with_headers(self, path: str, params: Optional[dict] = None) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{settings.github_api_url}{path}",
                headers=self._headers,
                params=params or {},
            )
            resp.raise_for_status()
            return {"data": resp.json(), "x-oauth-scopes": resp.headers.get("x-oauth-scopes", "")}

    async def get_authenticated_user(self) -> dict:
        return await self._rest_get("/user")

    async def _rest_get_paginated(self, path: str, extra_params: Optional[dict] = None) -> list:
        """Fetch all pages from a GitHub REST list endpoint."""
        results = []
        page = 1
        while True:
            params = {"per_page": 100, "page": page, **(extra_params or {})}
            batch = await self._rest_get(path, params)
            if not batch:
                break
            results.extend(batch)
            if len(batch) < 100:
                break
            page += 1
        return results

    async def get_user_orgs(self) -> list:
        # 1. Orgs where the user is a member
        orgs_list = await self._rest_get_paginated("/user/orgs")
        seen = {o["login"] for o in orgs_list}

        # 2. Orgs where the user is a member (via memberships endpoint, catches
        #    orgs with third-party restrictions that approved the app after login)
        memberships = await self._rest_get_paginated("/user/memberships/orgs", {"state": "active"})
        for m in memberships:
            org_data = m.get("organization", {})
            login = org_data.get("login")
            if login and login not in seen:
                seen.add(login)
                orgs_list.append(org_data)

        # 3. Orgs where the user is only an outside collaborator — these are
        #    invisible to the membership endpoints but appear in their repo list
        repos = await self._rest_get_paginated("/user/repos", {"affiliation": "collaborator", "sort": "updated"})
        for repo in repos:
            owner = repo.get("owner", {})
            if owner.get("type") == "Organization" and owner.get("login") not in seen:
                seen.add(owner["login"])
                orgs_list.append({
                    "login": owner["login"],
                    "avatar_url": owner.get("avatar_url"),
                    "description": None,
                })

        return orgs_list

    async def fetch_org_repos_with_prs(self, org: str) -> list:
        """Paginate through all repos + their PRs/reviews via GraphQL."""
        logger.info("Fetching repos and PRs for org: %s", org)
        all_repos = []
        cursor: Optional[str] = None
        page = 0
        while True:
            page += 1
            data = await self._graphql(PR_ANALYTICS_QUERY, {"org": org, "repoCursor": cursor})
            nodes = data["organization"]["repositories"]["nodes"]
            all_repos.extend(nodes)
            logger.debug("Fetched page %d: %d repos (total so far: %d)", page, len(nodes), len(all_repos))
            page_info = data["organization"]["repositories"]["pageInfo"]
            if not page_info["hasNextPage"]:
                break
            cursor = page_info["endCursor"]
        logger.info("Fetched %d repos for org: %s", len(all_repos), org)
        return all_repos

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

    async def fetch_workflow_runs(self, repo_full_name: str) -> list[dict]:
        """Fetch up to 1000 completed workflow runs for a repo."""
        logger.debug("Fetching workflow runs for %s", repo_full_name)
        runs: list[dict] = []
        page = 1
        while page <= 10:
            try:
                data = await self._rest_get(
                    f"/repos/{repo_full_name}/actions/runs",
                    {"per_page": 100, "page": page, "status": "completed"},
                )
            except Exception as exc:
                logger.warning("Failed to fetch workflow runs for %s (page %d): %s", repo_full_name, page, exc)
                break
            batch = data.get("workflow_runs", []) if isinstance(data, dict) else []
            if not batch:
                break
            runs.extend(batch)
            if len(batch) < 100:
                break
            page += 1
        logger.debug("Fetched %d workflow runs for %s", len(runs), repo_full_name)
        return runs

    async def fetch_commits(self, repo_full_name: str, since: str) -> list[dict]:
        """Fetch commits since ISO datetime string (e.g. '2026-01-01T00:00:00Z')."""
        logger.debug("Fetching commits for %s since %s", repo_full_name, since)
        try:
            commits = await self._rest_get_paginated(
                f"/repos/{repo_full_name}/commits",
                {"since": since},
            )
            logger.debug("Fetched %d commits for %s", len(commits), repo_full_name)
            return commits
        except Exception as exc:
            logger.warning("Failed to fetch commits for %s: %s", repo_full_name, exc)
            return []

    @staticmethod
    async def exchange_code(code: str) -> str:
        logger.info("Exchanging GitHub OAuth code for access token")
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://github.com/login/oauth/access_token",
                json={
                    "client_id": settings.github_client_id,
                    "client_secret": settings.github_client_secret,
                    "code": code,
                    "redirect_uri": settings.github_redirect_uri,
                },
                headers={"Accept": "application/json"},
            )
            resp.raise_for_status()
            data = resp.json()
            if "error" in data:
                logger.error("GitHub OAuth error: %s", data.get("error_description", data["error"]))
                raise ValueError(data.get("error_description", data["error"]))
            logger.debug("GitHub OAuth token exchange successful")
            return data["access_token"]
