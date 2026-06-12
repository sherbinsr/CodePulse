"""Orchestrates the background sync for GitHub and GitLab."""

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
from app.services.gitlab_service import GitLabService

logger = logging.getLogger(__name__)


def _github_run_duration(r: dict) -> Optional[int]:
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

    async def run(self, org: str, token: str, job_id: int, provider: str = "github") -> None:
        logger.info("Sync job %d started for org: %s provider: %s", job_id, org, provider)
        await self.sync_repo.update_status(job_id, "running")

        try:
            if provider == "gitlab":
                await self._run_gitlab(org, token, job_id)
            else:
                await self._run_github(org, token, job_id)
        except Exception as exc:
            logger.error("Sync job %d failed for org %s: %s", job_id, org, exc, exc_info=True)
            await self.db.rollback()
            await self.sync_repo.update_status(job_id, "failed", error=str(exc))
            raise

    # ── GitHub ────────────────────────────────────────────────────────────────

    async def _run_github(self, org: str, token: str, job_id: int) -> None:
        gh = GitHubService(token)
        repos_synced = 0
        prs_synced = 0

        repo_nodes = await gh.fetch_org_repos_with_prs(org)
        logger.info("Sync job %d: processing %d repos for org: %s", job_id, len(repo_nodes), org)

        for node in repo_nodes:
            full_name = node["nameWithOwner"]
            default_branch = (node.get("defaultBranchRef") or {}).get("name", "main")

            await self.repo_repo.upsert(
                full_name=full_name,
                provider="github",
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

            await self.pr_repo.delete_by_repo(full_name, provider="github")

            pr_nodes = node.get("pullRequests", {}).get("nodes", [])
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
                    provider="github",
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

            try:
                runs_data = await gh.fetch_workflow_runs(full_name)
                await self.ci_repo.delete_by_repo(full_name, provider="github")
                if runs_data:
                    now = datetime.utcnow()
                    await self.ci_repo.bulk_insert(
                        [
                            {
                                "github_run_id": r["id"],
                                "provider": "github",
                                "repo_full_name": full_name,
                                "org": org,
                                "workflow_name": r.get("name", ""),
                                "status": r.get("status", ""),
                                "conclusion": r.get("conclusion"),
                                "head_branch": r.get("head_branch"),
                                "run_attempt": r.get("run_attempt", 1),
                                "duration_seconds": _github_run_duration(r),
                                "created_at": gh.parse_datetime(r["created_at"]) or now,
                                "synced_at": now,
                            }
                            for r in runs_data
                            if r.get("created_at")
                        ]
                    )
            except Exception as exc:
                logger.error("CI sync failed for %s (non-fatal): %s", full_name, exc)

            try:
                since_iso = (datetime.utcnow() - timedelta(days=90)).strftime("%Y-%m-%dT%H:%M:%SZ")
                commits_data = await gh.fetch_commits(full_name, since_iso)
                await self.commit_repo.delete_by_repo(full_name, provider="github")
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
                                "provider": "github",
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
            job_id, "done", repos_synced=repos_synced, prs_synced=prs_synced
        )
        logger.info(
            "Sync job %d completed: %d repos, %d PRs for org: %s",
            job_id,
            repos_synced,
            prs_synced,
            org,
        )

    # ── GitLab ────────────────────────────────────────────────────────────────

    async def _run_gitlab(self, group_path: str, token: str, job_id: int) -> None:
        gl = GitLabService(token)
        repos_synced = 0
        prs_synced = 0

        projects = await gl.fetch_group_projects(group_path)
        logger.info(
            "Sync job %d: processing %d projects for group: %s", job_id, len(projects), group_path
        )

        for project in projects:
            project_id = project["id"]
            full_name = project["path_with_namespace"]
            default_branch = project.get("default_branch") or "main"

            await self.repo_repo.upsert(
                full_name=full_name,
                provider="gitlab",
                github_id=None,
                owner=group_path,
                name=project["path"],
                description=project.get("description"),
                is_private=project.get("visibility", "private") != "public",
                default_branch=default_branch,
                stars=project.get("star_count", 0),
                forks=project.get("forks_count", 0),
                language=None,
            )

            await self.pr_repo.delete_by_repo(full_name, provider="gitlab")

            mrs = await gl.fetch_project_mrs(project_id)
            logger.debug("Processing %d MRs for project: %s", len(mrs), full_name)

            for mr in mrs:
                created = gl.parse_datetime(mr.get("created_at"))
                merged = gl.parse_datetime(mr.get("merged_at"))
                closed = gl.parse_datetime(mr.get("closed_at"))
                author = mr.get("author") or {}
                reviewers = mr.get("reviewers") or []

                pr = await self.pr_repo.create_pr(
                    github_id=mr["id"],
                    provider="gitlab",
                    number=mr["iid"],
                    repo_full_name=full_name,
                    org=group_path,
                    title=mr["title"],
                    state=gl.map_mr_state(mr.get("state", "opened")),
                    author_login=author.get("username", "ghost"),
                    author_avatar=author.get("avatar_url"),
                    additions=0,
                    deletions=0,
                    changed_files=int(mr.get("changes_count") or 0),
                    comments_count=mr.get("user_notes_count", 0),
                    reviews_count=len(reviewers),
                    time_to_merge_hours=gl.hours_between(created, merged),
                    time_to_first_review_hours=None,
                    created_at=created or datetime.utcnow(),
                    merged_at=merged,
                    closed_at=closed,
                )

                # Store reviewers as review records
                for reviewer in reviewers:
                    if not reviewer.get("username"):
                        continue
                    await self.pr_repo.create_review(
                        pr_id=pr.id,
                        repo_full_name=full_name,
                        org=group_path,
                        pr_number=pr.number,
                        pr_author_login=pr.author_login,
                        reviewer_login=reviewer["username"],
                        reviewer_avatar=reviewer.get("avatar_url"),
                        state="APPROVED",
                        submitted_at=merged or closed or datetime.utcnow(),
                    )

                prs_synced += 1

            # Sync GitLab pipelines as CI runs (non-fatal)
            try:
                pipelines = await gl.fetch_pipelines(project_id)
                await self.ci_repo.delete_by_repo(full_name, provider="gitlab")
                if pipelines:
                    now = datetime.utcnow()
                    await self.ci_repo.bulk_insert(
                        [
                            {
                                "github_run_id": p["id"],
                                "provider": "gitlab",
                                "repo_full_name": full_name,
                                "org": group_path,
                                "workflow_name": p.get("name") or p.get("ref", "pipeline"),
                                "status": "completed",
                                "conclusion": gl.pipeline_conclusion(p.get("status", "failed")),
                                "head_branch": p.get("ref"),
                                "run_attempt": 1,
                                "duration_seconds": p.get("duration"),
                                "created_at": gl.parse_datetime(p.get("created_at")) or now,
                                "synced_at": now,
                            }
                            for p in pipelines
                            if p.get("created_at")
                        ]
                    )
            except Exception as exc:
                logger.error("CI sync failed for %s (non-fatal): %s", full_name, exc)

            # Sync commits (last 90 days, non-fatal)
            try:
                since_iso = (datetime.utcnow() - timedelta(days=90)).isoformat() + "Z"
                commits_data = await gl.fetch_commits(project_id, since_iso)
                await self.commit_repo.delete_by_repo(full_name, provider="gitlab")
                if commits_data:
                    now = datetime.utcnow()
                    rows = []
                    for c in commits_data:
                        committed_at = gl.parse_datetime(
                            c.get("committed_date") or c.get("created_at")
                        )
                        if not committed_at:
                            continue
                        rows.append(
                            {
                                "sha": c["id"],
                                "provider": "gitlab",
                                "repo_full_name": full_name,
                                "org": group_path,
                                "author_login": c.get("author_name"),
                                "author_avatar": None,
                                "author_name": c.get("author_name", ""),
                                "committed_at": committed_at,
                                "synced_at": now,
                            }
                        )
                    await self.commit_repo.bulk_insert(rows)
            except Exception as exc:
                logger.error("Commit sync failed for %s (non-fatal): %s", full_name, exc)

            repos_synced += 1
            logger.info(
                "Sync job %d: completed project %s (%d/%d)",
                job_id,
                full_name,
                repos_synced,
                len(projects),
            )
            await self.db.commit()

        await self.sync_repo.update_status(
            job_id, "done", repos_synced=repos_synced, prs_synced=prs_synced
        )
        logger.info(
            "Sync job %d completed: %d projects, %d MRs for group: %s",
            job_id,
            repos_synced,
            prs_synced,
            group_path,
        )
