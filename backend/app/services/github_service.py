"""GitHub API client: REST + GraphQL."""

import asyncio
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
            body
            headRefName
            baseRefName
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


PR_USER_ANALYTICS_QUERY = """
query PRUserAnalytics($org: String!, $repoCursor: String) {
  user(login: $org) {
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
            body
            headRefName
            baseRefName
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
        logger.debug(
            "GraphQL request with variables: %s",
            {k: v for k, v in variables.items() if k != "token"},
        )
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    resp = await client.post(
                        settings.github_graphql_url,
                        json={"query": query, "variables": variables},
                        headers=self._headers,
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    if "errors" in data:
                        logger.warning("GraphQL error response: %s", data["errors"])
                        if not data.get("data"):
                            raise ValueError(f"GraphQL error: {data['errors']}")
                    return data.get("data") or {}
            except (httpx.HTTPStatusError, httpx.RequestError) as e:
                if attempt == 2:
                    raise
                logger.warning("GraphQL request failed (attempt %d/3): %s. Retrying...", attempt + 1, e)
                await asyncio.sleep(1)
        return {}

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
        repos = await self._rest_get_paginated(
            "/user/repos", {"affiliation": "collaborator", "sort": "updated"}
        )
        for repo in repos:
            owner = repo.get("owner", {})
            if owner.get("type") == "Organization" and owner.get("login") not in seen:
                seen.add(owner["login"])
                orgs_list.append(
                    {
                        "login": owner["login"],
                        "avatar_url": owner.get("avatar_url"),
                        "description": None,
                    }
                )

        return orgs_list

    async def fetch_org_repos_with_prs(self, org: str) -> list:
        """Paginate through all repos + their PRs/reviews via GraphQL (supports org and user accounts)."""
        logger.info("Fetching repos and PRs for org/user: %s", org)
        all_repos = []
        cursor: Optional[str] = None
        page = 0
        use_user = False
        while True:
            page += 1
            query = PR_USER_ANALYTICS_QUERY if use_user else PR_ANALYTICS_QUERY
            try:
                data = await self._graphql(query, {"org": org, "repoCursor": cursor})
            except Exception as e:
                if not use_user:
                    logger.info("Org GraphQL query failed for %s, trying user query: %s", org, e)
                    use_user = True
                    query = PR_USER_ANALYTICS_QUERY
                    data = await self._graphql(query, {"org": org, "repoCursor": cursor})
                else:
                    raise

            target_entity = data.get("user") if use_user else data.get("organization")
            if not target_entity and not use_user:
                use_user = True
                data = await self._graphql(PR_USER_ANALYTICS_QUERY, {"org": org, "repoCursor": cursor})
                target_entity = data.get("user")

            if not target_entity or "repositories" not in target_entity:
                break

            nodes = target_entity["repositories"]["nodes"]
            all_repos.extend(nodes)
            logger.debug(
                "Fetched page %d: %d repos (total so far: %d)", page, len(nodes), len(all_repos)
            )
            page_info = target_entity["repositories"]["pageInfo"]
            if not page_info.get("hasNextPage"):
                break
            cursor = page_info.get("endCursor")
        logger.info("Fetched %d repos for org/user: %s", len(all_repos), org)
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
                logger.warning(
                    "Failed to fetch workflow runs for %s (page %d): %s", repo_full_name, page, exc
                )
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

    async def fetch_repo_docs_folder(
        self, owner: str, repo: str, default_branch: str = "main"
    ) -> list[dict]:
        """Fetch documentation files inside the docs/ folder of a repository."""
        logger.info("Fetching docs folder files for %s/%s (branch: %s)", owner, repo, default_branch)
        results: list[dict] = []
        doc_files_to_fetch: list[str] = []

        # 1. Try recursive git tree endpoint
        try:
            tree_data = await self._rest_get(
                f"/repos/{owner}/{repo}/git/trees/{default_branch}",
                params={"recursive": "1"},
            )
            tree_items = tree_data.get("tree", []) if isinstance(tree_data, dict) else []
            for item in tree_items:
                path = item.get("path", "")
                item_type = item.get("type", "")
                if item_type == "blob" and (path.startswith("docs/") or path.startswith("doc/")):
                    doc_files_to_fetch.append(path)
        except Exception as exc:
            logger.warning("Recursive git tree query failed for %s/%s: %s", owner, repo, exc)

        # 2. Fallback to /contents/docs if tree returned nothing
        if not doc_files_to_fetch:
            for folder_name in ["docs", "doc"]:
                try:
                    contents = await self._rest_get(f"/repos/{owner}/{repo}/contents/{folder_name}")
                    if isinstance(contents, list):
                        for item in contents:
                            if item.get("type") == "file":
                                doc_files_to_fetch.append(item.get("path", ""))
                except Exception as exc:
                    logger.debug("Failed to list contents for %s/%s/%s: %s", owner, repo, folder_name, exc)

        if not doc_files_to_fetch:
            logger.info("No docs folder files found for %s/%s", owner, repo)
            return results

        # Limit to top 25 doc files per repo to avoid excessive API calls
        doc_files_to_fetch = doc_files_to_fetch[:25]

        for file_path in doc_files_to_fetch:
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
                    file_data = await self._rest_get(f"/repos/{owner}/{repo}/contents/{file_path}")
                    content_str = ""
                    if isinstance(file_data, dict):
                        encoding = file_data.get("encoding")
                        raw_content = file_data.get("content", "")
                        if encoding == "base64" and raw_content:
                            try:
                                import base64
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
                except Exception as fetch_err:
                    logger.warning("Failed to fetch file content for %s/%s/%s: %s", owner, repo, file_path, fetch_err)

        logger.info("Successfully fetched %d docs from docs/ folder for %s/%s", len(results), owner, repo)
        return results

    # ── GitHub Projects (v2) & Issues Methods ─────────────────────────────────

    async def get_org_projects_v2(self, org: str) -> list[dict]:
        """Fetch Projects (v2) across organization, user account, and viewer contexts."""
        query = """
        query AllProjectsV2($login: String!) {
          organization(login: $login) {
            projectsV2(first: 30) {
              nodes {
                id
                number
                title
                url
                closed
                fields(first: 20) {
                  nodes {
                    ... on ProjectV2SingleSelectField {
                      id
                      name
                      options {
                        id
                        name
                      }
                    }
                  }
                }
              }
            }
          }
          user(login: $login) {
            projectsV2(first: 30) {
              nodes {
                id
                number
                title
                url
                closed
                fields(first: 20) {
                  nodes {
                    ... on ProjectV2SingleSelectField {
                      id
                      name
                      options {
                        id
                        name
                      }
                    }
                  }
                }
              }
            }
          }
          viewer {
            projectsV2(first: 30) {
              nodes {
                id
                number
                title
                url
                closed
                fields(first: 20) {
                  nodes {
                    ... on ProjectV2SingleSelectField {
                      id
                      name
                      options {
                        id
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
        """
        seen_ids = set()
        projects = []
        try:
            data = await self._graphql(query, {"login": org})

            # Check organization
            org_data = data.get("organization") or {}
            for p in org_data.get("projectsV2", {}).get("nodes", []):
                if p["id"] not in seen_ids:
                    seen_ids.add(p["id"])
                    projects.append(p)

            # Check user profile
            user_data = data.get("user") or {}
            for p in user_data.get("projectsV2", {}).get("nodes", []):
                if p["id"] not in seen_ids:
                    seen_ids.add(p["id"])
                    projects.append(p)

            # Check authenticated viewer profile
            viewer_data = data.get("viewer") or {}
            for p in viewer_data.get("projectsV2", {}).get("nodes", []):
                if p["id"] not in seen_ids:
                    seen_ids.add(p["id"])
                    projects.append(p)

            return projects
        except Exception as e:
            logger.warning("Failed to fetch Projects v2 for org %s: %s", org, e)

            # Fallback try user query alone or viewer
            try:
                fallback_query = """
                query ViewerProjects {
                  viewer {
                    projectsV2(first: 30) {
                      nodes {
                        id
                        number
                        title
                        url
                        closed
                        fields(first: 20) {
                          nodes {
                            ... on ProjectV2SingleSelectField {
                              id
                              name
                              options {
                                id
                                name
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
                """
                fb_data = await self._graphql(fallback_query, {})
                return fb_data.get("viewer", {}).get("projectsV2", {}).get("nodes", [])
            except Exception as fb_err:
                logger.warning("Fallback viewer projects query failed: %s", fb_err)
                return []

    async def get_project_by_number(self, owner: str, number: int) -> Optional[dict]:
        """Fetch specific Project v2 by owner/org login and project number."""
        query = """
        query ProjectByNumber($login: String!, $number: Int!) {
          organization(login: $login) {
            projectV2(number: $number) {
              id
              number
              title
              url
              closed
              fields(first: 20) {
                nodes {
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                    options {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
          user(login: $login) {
            projectV2(number: $number) {
              id
              number
              title
              url
              closed
              fields(first: 20) {
                nodes {
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                    options {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }
        """
        try:
            data = await self._graphql(query, {"login": owner, "number": number})
            org_proj = (data.get("organization") or {}).get("projectV2")
            if org_proj:
                return org_proj
            user_proj = (data.get("user") or {}).get("projectV2")
            if user_proj:
                return user_proj
            return None
        except Exception as e:
            logger.warning("Failed to fetch project #%d for owner %s: %s", number, owner, e)
            return None


    async def get_project_v2_details(self, project_id: str) -> dict:
        """Fetch project columns, fields, and board items for a Project v2."""
        query = """
        query ProjectV2Items($projectId: ID!) {
          node(id: $projectId) {
            ... on ProjectV2 {
              id
              title
              number
              url
              closed
              fields(first: 20) {
                nodes {
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                    options {
                      id
                      name
                    }
                  }
                }
              }
              items(first: 100) {
                nodes {
                  id
                  fieldValueByName(name: "Status") {
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                      optionId
                    }
                  }
                  content {
                    ... on Issue {
                      id
                      databaseId
                      number
                      title
                      body
                      state
                      createdAt
                      updatedAt
                      closedAt
                      author {
                        login
                        avatarUrl
                      }
                      repository {
                        name
                        nameWithOwner
                        owner {
                          login
                        }
                      }
                      assignees(first: 10) {
                        nodes {
                          login
                          avatarUrl
                        }
                      }
                      labels(first: 10) {
                        nodes {
                          name
                          color
                        }
                      }
                      milestone {
                        title
                      }
                      comments {
                        totalCount
                      }
                    }
                  }
                }
              }
            }
          }
        }
        """
        data = await self._graphql(query, {"projectId": project_id})
        return data.get("node") or {}

    async def update_project_v2_item_field(
        self, project_id: str, item_id: str, field_id: str, option_id: str
    ) -> dict:
        """Update single select status field for a Project v2 item."""
        mutation = """
        mutation UpdateProjectV2ItemFieldValue($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
          updateProjectV2ItemFieldValue(
            input: {
              projectId: $projectId
              itemId: $itemId
              fieldId: $fieldId
              value: { singleSelectOptionId: $optionId }
            }
          ) {
            projectV2Item {
              id
            }
          }
        }
        """
        return await self._graphql(
            mutation,
            {
                "projectId": project_id,
                "itemId": item_id,
                "fieldId": field_id,
                "optionId": option_id,
            },
        )

    async def add_item_to_project_v2(self, project_id: str, content_id: str) -> dict:
        """Add an issue/PR content node to a Project v2."""
        mutation = """
        mutation AddProjectV2ItemById($projectId: ID!, $contentId: ID!) {
          addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
            item {
              id
            }
          }
        }
        """
        return await self._graphql(mutation, {"projectId": project_id, "contentId": content_id})

    # REST Operations for Issues & Comments
    async def create_issue(
        self,
        owner: str,
        repo: str,
        title: str,
        body: str = "",
        assignees: Optional[list[str]] = None,
        labels: Optional[list[str]] = None,
        milestone: Optional[int] = None,
    ) -> dict:
        """Create issue via REST API."""
        payload: dict = {"title": title, "body": body}
        if assignees:
            payload["assignees"] = assignees
        if labels:
            payload["labels"] = labels
        if milestone:
            payload["milestone"] = milestone

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{settings.github_api_url}/repos/{owner}/{repo}/issues",
                headers=self._headers,
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()

    async def update_issue(
        self,
        owner: str,
        repo: str,
        issue_number: int,
        title: Optional[str] = None,
        body: Optional[str] = None,
        state: Optional[str] = None,
        assignees: Optional[list[str]] = None,
        labels: Optional[list[str]] = None,
    ) -> dict:
        """Update existing issue title, body, state (open/closed), assignees or labels."""
        payload: dict = {}
        if title is not None:
            payload["title"] = title
        if body is not None:
            payload["body"] = body
        if state is not None:
            payload["state"] = state
        if assignees is not None:
            payload["assignees"] = assignees
        if labels is not None:
            payload["labels"] = labels

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.patch(
                f"{settings.github_api_url}/repos/{owner}/{repo}/issues/{issue_number}",
                headers=self._headers,
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()

    async def get_issue_comments(self, owner: str, repo: str, issue_number: int) -> list[dict]:
        """Fetch comments for an issue."""
        return await self._rest_get_paginated(f"/repos/{owner}/{repo}/issues/{issue_number}/comments")

    async def create_issue_comment(self, owner: str, repo: str, issue_number: int, body: str) -> dict:
        """Post new comment on an issue."""
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{settings.github_api_url}/repos/{owner}/{repo}/issues/{issue_number}/comments",
                headers=self._headers,
                json={"body": body},
            )
            resp.raise_for_status()
            return resp.json()

    async def get_issue_timeline(self, owner: str, repo: str, issue_number: int) -> list[dict]:
        """Fetch timeline events (linked PRs, cross-references, commits) for an issue."""
        try:
            return await self._rest_get_paginated(f"/repos/{owner}/{repo}/issues/{issue_number}/timeline")
        except Exception as e:
            logger.warning("Failed to fetch timeline for issue %s/%s#%d: %s", owner, repo, issue_number, e)
            return []

    async def get_repo_branches(self, owner: str, repo: str) -> list[dict]:
        """Fetch all branches for a repository from GitHub REST API."""
        try:
            branches = await self._rest_get_paginated(f"/repos/{owner}/{repo}/branches")
            return [
                {
                    "name": b["name"],
                    "protected": b.get("protected", False),
                    "commit_sha": b.get("commit", {}).get("sha"),
                }
                for b in branches
            ]
        except Exception as e:
            logger.warning("Failed to fetch branches for %s/%s: %s", owner, repo, e)
            return []

    async def get_repo_issues(self, owner: str, repo: str, state: str = "all") -> list[dict]:
        """Fetch all issues for a repository from GitHub REST API."""
        try:
            return await self._rest_get_paginated(f"/repos/{owner}/{repo}/issues", {"state": state, "per_page": 100})
        except Exception as e:
            logger.warning("Failed to fetch repo issues for %s/%s: %s", owner, repo, e)
            return []

    async def get_repo_releases(self, owner: str, repo: str) -> list[dict]:
        """Fetch releases and release notes for a repository from GitHub REST API."""
        try:
            return await self._rest_get_paginated(f"/repos/{owner}/{repo}/releases")
        except Exception as e:
            logger.warning("Failed to fetch repo releases for %s/%s: %s", owner, repo, e)
            return []

    async def get_repo_tags(self, owner: str, repo: str) -> list[dict]:
        """Fetch git tags for a repository from GitHub REST API."""
        try:
            return await self._rest_get_paginated(f"/repos/{owner}/{repo}/tags")
        except Exception as e:
            logger.warning("Failed to fetch repo tags for %s/%s: %s", owner, repo, e)
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

