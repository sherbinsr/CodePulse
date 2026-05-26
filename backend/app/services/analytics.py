"""Aggregate analytics queries from PostgreSQL."""
from datetime import datetime, timedelta
from sqlalchemy import select, func, case, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pull_request import PullRequest, PRReview
from app.models.repository import Repository


async def get_org_overview(org: str, db: AsyncSession) -> dict:
    total_repos = await db.scalar(
        select(func.count(Repository.id)).where(Repository.owner == org)
    )
    total_prs = await db.scalar(
        select(func.count(PullRequest.id)).where(PullRequest.org == org)
    )
    merged_prs = await db.scalar(
        select(func.count(PullRequest.id)).where(
            and_(PullRequest.org == org, PullRequest.state == "MERGED")
        )
    )
    open_prs = await db.scalar(
        select(func.count(PullRequest.id)).where(
            and_(PullRequest.org == org, PullRequest.state == "OPEN")
        )
    )
    avg_merge_time = await db.scalar(
        select(func.avg(PullRequest.time_to_merge_hours)).where(
            and_(PullRequest.org == org, PullRequest.time_to_merge_hours.isnot(None))
        )
    )
    avg_review_time = await db.scalar(
        select(func.avg(PullRequest.time_to_first_review_hours)).where(
            and_(PullRequest.org == org, PullRequest.time_to_first_review_hours.isnot(None))
        )
    )
    total_reviews = await db.scalar(
        select(func.count(PRReview.id)).where(PRReview.org == org)
    )
    unique_contributors = await db.scalar(
        select(func.count(func.distinct(PullRequest.author_login))).where(PullRequest.org == org)
    )

    return {
        "total_repos": total_repos or 0,
        "total_prs": total_prs or 0,
        "merged_prs": merged_prs or 0,
        "open_prs": open_prs or 0,
        "closed_prs": (total_prs or 0) - (merged_prs or 0) - (open_prs or 0),
        "avg_merge_time_hours": round(avg_merge_time, 1) if avg_merge_time else None,
        "avg_review_time_hours": round(avg_review_time, 1) if avg_review_time else None,
        "total_reviews": total_reviews or 0,
        "unique_contributors": unique_contributors or 0,
        "merge_rate": round((merged_prs or 0) / (total_prs or 1) * 100, 1),
    }


async def get_developer_stats(org: str, db: AsyncSession) -> list[dict]:
    pr_counts = await db.execute(
        select(
            PullRequest.author_login,
            PullRequest.author_avatar,
            func.count(PullRequest.id).label("total_prs"),
            func.sum(case((PullRequest.state == "MERGED", 1), else_=0)).label("merged_prs"),
            func.sum(case((PullRequest.state == "OPEN", 1), else_=0)).label("open_prs"),
            func.avg(PullRequest.time_to_merge_hours).label("avg_merge_hours"),
            func.sum(PullRequest.additions).label("total_additions"),
            func.sum(PullRequest.deletions).label("total_deletions"),
        )
        .where(PullRequest.org == org)
        .group_by(PullRequest.author_login, PullRequest.author_avatar)
        .order_by(func.count(PullRequest.id).desc())
    )

    review_counts = await db.execute(
        select(
            PRReview.reviewer_login,
            PRReview.reviewer_avatar,
            func.count(PRReview.id).label("reviews_given"),
            func.sum(case((PRReview.state == "APPROVED", 1), else_=0)).label("approvals"),
            func.sum(case((PRReview.state == "CHANGES_REQUESTED", 1), else_=0)).label("change_requests"),
        )
        .where(PRReview.org == org)
        .group_by(PRReview.reviewer_login, PRReview.reviewer_avatar)
    )
    review_map = {
        r.reviewer_login: {
            "reviews_given": r.reviews_given,
            "approvals": r.approvals,
            "change_requests": r.change_requests,
            "reviewer_avatar": r.reviewer_avatar,
        }
        for r in review_counts
    }

    result = []
    for row in pr_counts:
        rv = review_map.get(row.author_login, {})
        result.append({
            "login": row.author_login,
            "avatar_url": row.author_avatar or rv.get("reviewer_avatar"),
            "total_prs": row.total_prs,
            "merged_prs": int(row.merged_prs or 0),
            "open_prs": int(row.open_prs or 0),
            "merge_rate": round(int(row.merged_prs or 0) / row.total_prs * 100, 1),
            "avg_merge_hours": round(row.avg_merge_hours, 1) if row.avg_merge_hours else None,
            "total_additions": int(row.total_additions or 0),
            "total_deletions": int(row.total_deletions or 0),
            "reviews_given": rv.get("reviews_given", 0),
            "approvals": rv.get("approvals", 0),
            "change_requests": rv.get("change_requests", 0),
        })
    return result


async def get_repo_stats(org: str, db: AsyncSession) -> list[dict]:
    rows = await db.execute(
        select(
            PullRequest.repo_full_name,
            func.count(PullRequest.id).label("total_prs"),
            func.sum(case((PullRequest.state == "MERGED", 1), else_=0)).label("merged"),
            func.sum(case((PullRequest.state == "OPEN", 1), else_=0)).label("open"),
            func.avg(PullRequest.time_to_merge_hours).label("avg_merge_hours"),
            func.avg(PullRequest.time_to_first_review_hours).label("avg_review_hours"),
            func.count(func.distinct(PullRequest.author_login)).label("contributors"),
        )
        .where(PullRequest.org == org)
        .group_by(PullRequest.repo_full_name)
        .order_by(func.count(PullRequest.id).desc())
    )
    return [
        {
            "repo": r.repo_full_name,
            "name": r.repo_full_name.split("/")[-1],
            "total_prs": r.total_prs,
            "merged_prs": int(r.merged or 0),
            "open_prs": int(r.open or 0),
            "merge_rate": round(int(r.merged or 0) / r.total_prs * 100, 1),
            "avg_merge_hours": round(r.avg_merge_hours, 1) if r.avg_merge_hours else None,
            "avg_review_hours": round(r.avg_review_hours, 1) if r.avg_review_hours else None,
            "contributors": r.contributors,
        }
        for r in rows
    ]


async def get_monthly_trends(org: str, db: AsyncSession, months: int = 6) -> list[dict]:
    since = datetime.utcnow() - timedelta(days=30 * months)
    rows = await db.execute(
        select(
            func.date_trunc("month", PullRequest.created_at).label("month"),
            func.count(PullRequest.id).label("total"),
            func.sum(case((PullRequest.state == "MERGED", 1), else_=0)).label("merged"),
            func.count(func.distinct(PullRequest.author_login)).label("contributors"),
        )
        .where(and_(PullRequest.org == org, PullRequest.created_at >= since))
        .group_by(func.date_trunc("month", PullRequest.created_at))
        .order_by(func.date_trunc("month", PullRequest.created_at))
    )
    return [
        {
            "month": r.month.strftime("%Y-%m") if r.month else None,
            "total_prs": r.total,
            "merged_prs": int(r.merged or 0),
            "contributors": r.contributors,
        }
        for r in rows
    ]


async def get_review_network(org: str, db: AsyncSession) -> list[dict]:
    """Who reviewed whose PRs."""
    rows = await db.execute(
        select(
            PRReview.pr_author_login,
            PRReview.reviewer_login,
            func.count(PRReview.id).label("review_count"),
        )
        .where(
            and_(
                PRReview.org == org,
                PRReview.reviewer_login != PRReview.pr_author_login,
            )
        )
        .group_by(PRReview.pr_author_login, PRReview.reviewer_login)
        .order_by(func.count(PRReview.id).desc())
        .limit(100)
    )
    return [
        {
            "pr_author": r.pr_author_login,
            "reviewer": r.reviewer_login,
            "review_count": r.review_count,
        }
        for r in rows
    ]


async def get_pr_list(
    org: str,
    db: AsyncSession,
    repo: str | None = None,
    author: str | None = None,
    state: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[dict], int]:
    query = select(PullRequest).where(PullRequest.org == org)
    count_query = select(func.count(PullRequest.id)).where(PullRequest.org == org)

    if repo:
        query = query.where(PullRequest.repo_full_name == repo)
        count_query = count_query.where(PullRequest.repo_full_name == repo)
    if author:
        query = query.where(PullRequest.author_login == author)
        count_query = count_query.where(PullRequest.author_login == author)
    if state:
        query = query.where(PullRequest.state == state.upper())
        count_query = count_query.where(PullRequest.state == state.upper())

    total = await db.scalar(count_query)
    rows = await db.execute(
        query.order_by(PullRequest.created_at.desc()).limit(limit).offset(offset)
    )
    prs = rows.scalars().all()

    return [
        {
            "id": pr.id,
            "number": pr.number,
            "repo": pr.repo_full_name,
            "title": pr.title,
            "state": pr.state,
            "author": pr.author_login,
            "author_avatar": pr.author_avatar,
            "additions": pr.additions,
            "deletions": pr.deletions,
            "changed_files": pr.changed_files,
            "reviews_count": pr.reviews_count,
            "time_to_merge_hours": pr.time_to_merge_hours,
            "time_to_first_review_hours": pr.time_to_first_review_hours,
            "created_at": pr.created_at.isoformat() if pr.created_at else None,
            "merged_at": pr.merged_at.isoformat() if pr.merged_at else None,
            "closed_at": pr.closed_at.isoformat() if pr.closed_at else None,
        }
        for pr in prs
    ], total or 0
