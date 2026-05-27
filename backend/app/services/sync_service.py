"""Orchestrates the background sync: GitHub API → repositories → DB."""

import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.ci_repository import CIRepository
from app.repositories.commit_repository import CommitRepository
from app.repositories.pr_repository import PRRepository
from app.repositories.repo_repository import RepoRepository
from app.repositories.sync_repository import SyncRepository
from app.services.github_service import GitHubService

logger = logging.getLogger(__name__)


def _run_duration(r: dict) -> Optional[int]:
    from app.services.github_service import GitHubService

    created = GitHubService.parse_datetime(r.get("created_at"))
    updated = GitHubService.parse_datetime(r.get("updated_at"))
    if created and updated:
        return max(0, int((updated - created).total_seconds()))
    return None


class SyncService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.pr_repo = PRRepository(db)
        self.repo_repo = RepoRepository(db)
        self.sync_repo = SyncRepository(db)
        self.ci_repo = CIRepository(db)
        self.commit_repo = CommitRepository(db)

    async def run(self, org: str, token: str, job_id: int) -> None:
        logger.info("Sync job %d started for org: %s", job_id, org)
        await self.sync_repo.update_status(job_id, "running")
        gh = GitHubService(token)
        repos_synced = 0
        prs_synced = 0

        try:
            repo_nodes = await gh.fetch_org_repos_with_prs(org)
            logger.info(
                "Sync job %d: processing %d repos for org: %s", job_id, len(repo_nodes), org
            )

            for node in repo_nodes:
                full_name = node["nameWithOwner"]
                default_branch = (node.get("defaultBranchRef") or {}).get("name", "main")
                logger.debug("Syncing repo: %s (default branch: %s)", full_name, default_branch)

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

                pr_nodes = node.get("pullRequests", {}).get("nodes", [])
                logger.debug("Processing %d PRs for repo: %s", len(pr_nodes), full_name)

                for pr_node in pr_nodes:
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

                # Sync CI workflow runs (supplementary — failures are non-fatal)
                try:
                    runs_data = await gh.fetch_workflow_runs(full_name)
                    await self.ci_repo.delete_by_repo(full_name)
                    if runs_data:
                        now = datetime.utcnow()
                        await self.ci_repo.bulk_insert(
                            [
                                {
                                    "github_run_id": r["id"],
                                    "repo_full_name": full_name,
                                    "org": org,
                                    "workflow_name": r.get("name", ""),
                                    "status": r.get("status", ""),
                                    "conclusion": r.get("conclusion"),
                                    "head_branch": r.get("head_branch"),
                                    "run_attempt": r.get("run_attempt", 1),
                                    "duration_seconds": _run_duration(r),
                                    "created_at": gh.parse_datetime(r["created_at"]) or now,
                                    "synced_at": now,
                                }
                                for r in runs_data
                                if r.get("created_at")
                            ]
                        )
                        logger.debug("Inserted %d CI runs for %s", len(runs_data), full_name)
                except Exception as exc:
                    logger.error("CI sync failed for %s (non-fatal): %s", full_name, exc)

                # Sync commits (last 90 days, supplementary — failures are non-fatal)
                try:
                    since_iso = (datetime.utcnow() - timedelta(days=90)).strftime(
                        "%Y-%m-%dT%H:%M:%SZ"
                    )
                    commits_data = await gh.fetch_commits(full_name, since_iso)
                    await self.commit_repo.delete_by_repo(full_name)
                    if commits_data:
                        now = datetime.utcnow()
                        rows = []
                        for c in commits_data:
                            date_str = c.get("commit", {}).get("author", {}).get("date")
                            committed_at = gh.parse_datetime(date_str)
                            if not committed_at:
                                continue
                            author_gh = c.get("author") or {}
                            rows.append(
                                {
                                    "sha": c["sha"],
                                    "repo_full_name": full_name,
                                    "org": org,
                                    "author_login": author_gh.get("login"),
                                    "author_avatar": author_gh.get("avatar_url"),
                                    "author_name": c.get("commit", {})
                                    .get("author", {})
                                    .get("name", ""),
                                    "committed_at": committed_at,
                                    "synced_at": now,
                                }
                            )
                        await self.commit_repo.bulk_insert(rows)
                        logger.debug("Inserted %d commits for %s", len(rows), full_name)
                except Exception as exc:
                    logger.error("Commit sync failed for %s (non-fatal): %s", full_name, exc)

                repos_synced += 1
                logger.info(
                    "Sync job %d: completed repo %s (%d/%d)",
                    job_id,
                    full_name,
                    repos_synced,
                    len(repo_nodes),
                )
                await self.db.commit()

            await self.sync_repo.update_status(
                job_id,
                "done",
                repos_synced=repos_synced,
                prs_synced=prs_synced,
            )
            logger.info(
                "Sync job %d completed: %d repos, %d PRs synced for org: %s",
                job_id,
                repos_synced,
                prs_synced,
                org,
            )

        except Exception as exc:
            logger.error("Sync job %d failed for org %s: %s", job_id, org, exc, exc_info=True)
            await self.db.rollback()
            await self.sync_repo.update_status(job_id, "failed", error=str(exc))
            raise
