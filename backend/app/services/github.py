from datetime import datetime
from typing import Any
import httpx
from app.config import settings

GRAPHQL_URL = settings.github_graphql_url
REST_URL = settings.github_api_url

PR_ANALYTICS_QUERY = """
query PRAnalytics($org: String!, $repoCursor: String) {
  organization(login: $org) {
    login
    name
    avatarUrl
    description
    membersWithRole(first: 100) {
      totalCount
      nodes { login name avatarUrl }
    }
    repositories(
      first: 50
      after: $repoCursor
      orderBy: { field: UPDATED_AT, direction: DESC }
      isArchived: false
    ) {
      pageInfo { hasNextPage endCursor }
      totalCount
      nodes {
        name
        nameWithOwner
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
              totalCount
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


class GitHubClient:
    def __init__(self, token: str):
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    async def graphql(self, query: str, variables: dict) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                GRAPHQL_URL,
                json={"query": query, "variables": variables},
                headers=self.headers,
            )
            resp.raise_for_status()
            data = resp.json()
            if "errors" in data:
                raise ValueError(f"GraphQL errors: {data['errors']}")
            return data["data"]

    async def rest_get(self, path: str, params: dict | None = None) -> Any:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{REST_URL}{path}",
                headers=self.headers,
                params=params or {},
            )
            resp.raise_for_status()
            return resp.json()

    async def get_authenticated_user(self) -> dict:
        return await self.rest_get("/user")

    async def get_user_orgs(self) -> list[dict]:
        return await self.rest_get("/user/orgs", {"per_page": 100})

    async def fetch_org_analytics(self, org: str) -> list[dict]:
        """Fetch all repos + PRs + reviews for an org via GraphQL (paginated)."""
        all_repos = []
        cursor = None

        while True:
            data = await self.graphql(
                PR_ANALYTICS_QUERY, {"org": org, "repoCursor": cursor}
            )
            org_data = data["organization"]
            repos = org_data["repositories"]["nodes"]
            all_repos.extend(repos)

            page_info = org_data["repositories"]["pageInfo"]
            if not page_info["hasNextPage"]:
                break
            cursor = page_info["endCursor"]

        return all_repos

    async def exchange_code_for_token(self, code: str) -> str:
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
                raise ValueError(f"GitHub OAuth error: {data.get('error_description', data['error'])}")
            return data["access_token"]


def parse_dt(dt_str: str | None) -> datetime | None:
    if not dt_str:
        return None
    return datetime.fromisoformat(dt_str.replace("Z", "+00:00")).replace(tzinfo=None)


def calc_hours(start: datetime | None, end: datetime | None) -> float | None:
    if not start or not end:
        return None
    delta = end - start
    return round(delta.total_seconds() / 3600, 2)
