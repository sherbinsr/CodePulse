"""Background sync: fetches GitHub data and stores it in PostgreSQL."""
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.models.pull_request import PullRequest, PRReview, SyncJob
from app.models.repository import Repository
from app.services.github import GitHubClient, parse_dt, calc_hours


async def sync_org(org: str, token: str, db: AsyncSession, job_id: int) -> None:
    client = GitHubClient(token)

    async def update_job(status: str, **kwargs):
        job = await db.get(SyncJob, job_id)
        if job:
            job.status = status
            for k, v in kwargs.items():
                setattr(job, k, v)
            await db.commit()

    try:
        await update_job("running")
        repos_data = await client.fetch_org_analytics(org)

        repos_synced = 0
        prs_synced = 0

        for repo_node in repos_data:
            repo_name = repo_node["nameWithOwner"]
            default_branch = (repo_node.get("defaultBranchRef") or {}).get("name", "main")

            # Upsert repository
            result = await db.execute(
                select(Repository).where(Repository.full_name == repo_name)
            )
            repo = result.scalar_one_or_none()
            if not repo:
                repo = Repository(full_name=repo_name, owner=org, name=repo_node["name"])
                db.add(repo)

            repo.description = repo_node.get("description")
            repo.is_private = repo_node.get("isPrivate", False)
            repo.default_branch = default_branch
            repo.stars = repo_node.get("stargazerCount", 0)
            repo.forks = repo_node.get("forkCount", 0)
            repo.language = (repo_node.get("primaryLanguage") or {}).get("name")
            repo.synced_at = datetime.utcnow()
            await db.flush()

            # Delete old PRs/reviews for this repo (full refresh)
            old_prs = await db.execute(
                select(PullRequest.id).where(PullRequest.repo_full_name == repo_name)
            )
            old_pr_ids = [r[0] for r in old_prs.all()]
            if old_pr_ids:
                await db.execute(
                    delete(PRReview).where(PRReview.repo_full_name == repo_name)
                )
                await db.execute(
                    delete(PullRequest).where(PullRequest.repo_full_name == repo_name)
                )

            # Insert PRs and reviews
            for pr_node in repo_node.get("pullRequests", {}).get("nodes", []):
                created = parse_dt(pr_node["createdAt"])
                merged = parse_dt(pr_node.get("mergedAt"))
                closed = parse_dt(pr_node.get("closedAt"))
                author = pr_node.get("author") or {}
                reviews_nodes = pr_node.get("reviews", {}).get("nodes", [])

                # First review time
                first_review_at = None
                for rv in reviews_nodes:
                    rv_at = parse_dt(rv.get("submittedAt"))
                    if rv_at and (first_review_at is None or rv_at < first_review_at):
                        first_review_at = rv_at

                pr = PullRequest(
                    github_id=pr_node["databaseId"],
                    number=pr_node["number"],
                    repo_full_name=repo_name,
                    org=org,
                    title=pr_node["title"],
                    state=pr_node["state"],
                    author_login=author.get("login", "ghost"),
                    author_avatar=author.get("avatarUrl"),
                    additions=pr_node.get("additions", 0),
                    deletions=pr_node.get("deletions", 0),
                    changed_files=pr_node.get("changedFiles", 0),
                    comments_count=pr_node.get("comments", {}).get("totalCount", 0),
                    reviews_count=len(reviews_nodes),
                    time_to_merge_hours=calc_hours(created, merged),
                    time_to_first_review_hours=calc_hours(created, first_review_at),
                    created_at=created,
                    merged_at=merged,
                    closed_at=closed,
                )
                db.add(pr)
                await db.flush()

                for rv_node in reviews_nodes:
                    rv_author = rv_node.get("author") or {}
                    if not rv_author.get("login"):
                        continue
                    db.add(PRReview(
                        pr_id=pr.id,
                        repo_full_name=repo_name,
                        org=org,
                        pr_number=pr.number,
                        pr_author_login=pr.author_login,
                        reviewer_login=rv_author["login"],
                        reviewer_avatar=rv_author.get("avatarUrl"),
                        state=rv_node["state"],
                        submitted_at=parse_dt(rv_node["submittedAt"]),
                    ))

                prs_synced += 1

            repos_synced += 1
            await db.commit()

        await update_job("done", repos_synced=repos_synced, prs_synced=prs_synced, finished_at=datetime.utcnow())

    except Exception as e:
        await db.rollback()
        await update_job("failed", error=str(e), finished_at=datetime.utcnow())
        raise
