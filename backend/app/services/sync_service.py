"""Orchestrates the background sync: GitHub API → repositories → DB."""
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.github_service import GitHubService
from app.repositories.pr_repository import PRRepository
from app.repositories.repo_repository import RepoRepository
from app.repositories.sync_repository import SyncRepository


class SyncService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.pr_repo = PRRepository(db)
        self.repo_repo = RepoRepository(db)
        self.sync_repo = SyncRepository(db)

    async def run(self, org: str, token: str, job_id: int) -> None:
        await self.sync_repo.update_status(job_id, "running")
        gh = GitHubService(token)
        repos_synced = 0
        prs_synced = 0

        try:
            repo_nodes = await gh.fetch_org_repos_with_prs(org)

            for node in repo_nodes:
                full_name = node["nameWithOwner"]
                default_branch = (node.get("defaultBranchRef") or {}).get("name", "main")

                await self.repo_repo.upsert(
                    full_name=full_name,
                    github_id=node.get("databaseId", 0),
                    owner=org,
                    name=node["name"],
                    description=node.get("description"),
                    is_private=node.get("isPrivate", False),
                    default_branch=default_branch,
                    stars=node.get("stargazerCount", 0),
                    forks=node.get("forkCount", 0),
                    language=(node.get("primaryLanguage") or {}).get("name"),
                )

                # Full refresh: wipe then re-insert
                await self.pr_repo.delete_by_repo(full_name)

                for pr_node in node.get("pullRequests", {}).get("nodes", []):
                    created = gh.parse_datetime(pr_node["createdAt"])
                    merged = gh.parse_datetime(pr_node.get("mergedAt"))
                    closed = gh.parse_datetime(pr_node.get("closedAt"))
                    author = pr_node.get("author") or {}
                    review_nodes = pr_node.get("reviews", {}).get("nodes", [])

                    first_review_at = None
                    for rv in review_nodes:
                        rv_at = gh.parse_datetime(rv.get("submittedAt"))
                        if rv_at and (first_review_at is None or rv_at < first_review_at):
                            first_review_at = rv_at

                    pr = await self.pr_repo.create_pr(
                        github_id=pr_node["databaseId"],
                        number=pr_node["number"],
                        repo_full_name=full_name,
                        org=org,
                        title=pr_node["title"],
                        state=pr_node["state"],
                        author_login=author.get("login", "ghost"),
                        author_avatar=author.get("avatarUrl"),
                        additions=pr_node.get("additions", 0),
                        deletions=pr_node.get("deletions", 0),
                        changed_files=pr_node.get("changedFiles", 0),
                        comments_count=pr_node.get("comments", {}).get("totalCount", 0),
                        reviews_count=len(review_nodes),
                        time_to_merge_hours=gh.hours_between(created, merged),
                        time_to_first_review_hours=gh.hours_between(created, first_review_at),
                        created_at=created,
                        merged_at=merged,
                        closed_at=closed,
                    )

                    for rv_node in review_nodes:
                        rv_author = rv_node.get("author") or {}
                        if not rv_author.get("login"):
                            continue
                        await self.pr_repo.create_review(
                            pr_id=pr.id,
                            repo_full_name=full_name,
                            org=org,
                            pr_number=pr.number,
                            pr_author_login=pr.author_login,
                            reviewer_login=rv_author["login"],
                            reviewer_avatar=rv_author.get("avatarUrl"),
                            state=rv_node["state"],
                            submitted_at=gh.parse_datetime(rv_node["submittedAt"]),
                        )

                    prs_synced += 1

                repos_synced += 1
                await self.db.commit()

            await self.sync_repo.update_status(
                job_id, "done",
                repos_synced=repos_synced,
                prs_synced=prs_synced,
            )

        except Exception as exc:
            await self.db.rollback()
            await self.sync_repo.update_status(job_id, "failed", error=str(exc))
            raise
