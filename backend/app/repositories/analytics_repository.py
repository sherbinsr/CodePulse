from datetime import datetime, timedelta

from sqlalchemy import and_, case, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pull_request import PRReview, PullRequest
from app.models.repository import Repository


class AnalyticsRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_org_overview(self, org: str) -> dict:
        total_repos = await self.db.scalar(
            select(func.count(Repository.id)).where(Repository.owner == org)
        )
        total_prs = await self.db.scalar(
            select(func.count(PullRequest.id)).where(PullRequest.org == org)
        )
        merged_prs = await self.db.scalar(
            select(func.count(PullRequest.id)).where(
                and_(PullRequest.org == org, PullRequest.state == "MERGED")
            )
        )
        open_prs = await self.db.scalar(
            select(func.count(PullRequest.id)).where(
                and_(PullRequest.org == org, PullRequest.state == "OPEN")
            )
        )
        avg_merge_time = await self.db.scalar(
            select(func.avg(PullRequest.time_to_merge_hours)).where(
                and_(PullRequest.org == org, PullRequest.time_to_merge_hours.isnot(None))
            )
        )
        avg_review_time = await self.db.scalar(
            select(func.avg(PullRequest.time_to_first_review_hours)).where(
                and_(PullRequest.org == org, PullRequest.time_to_first_review_hours.isnot(None))
            )
        )
        total_reviews = await self.db.scalar(
            select(func.count(PRReview.id)).where(PRReview.org == org)
        )
        unique_contributors = await self.db.scalar(
            select(func.count(func.distinct(PullRequest.author_login))).where(PullRequest.org == org)
        )
        total = total_prs or 0
        merged = merged_prs or 0
        open_ = open_prs or 0
        return {
            "total_repos": total_repos or 0,
            "total_prs": total,
            "merged_prs": merged,
            "open_prs": open_,
            "closed_prs": total - merged - open_,
            "merge_rate": round(merged / total * 100, 1) if total else 0.0,
            "avg_merge_time_hours": round(avg_merge_time, 1) if avg_merge_time else None,
            "avg_review_time_hours": round(avg_review_time, 1) if avg_review_time else None,
            "total_reviews": total_reviews or 0,
            "unique_contributors": unique_contributors or 0,
        }

    async def get_developer_stats(self, org: str) -> list[dict]:
        pr_rows = await self.db.execute(
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
        review_rows = await self.db.execute(
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
            for r in review_rows
        }
        result = []
        for row in pr_rows:
            rv = review_map.get(row.author_login, {})
            merged = int(row.merged_prs or 0)
            total = row.total_prs
            result.append({
                "login": row.author_login,
                "avatar_url": row.author_avatar or rv.get("reviewer_avatar"),
                "total_prs": total,
                "merged_prs": merged,
                "open_prs": int(row.open_prs or 0),
                "merge_rate": round(merged / total * 100, 1) if total else 0.0,
                "avg_merge_hours": round(row.avg_merge_hours, 1) if row.avg_merge_hours else None,
                "total_additions": int(row.total_additions or 0),
                "total_deletions": int(row.total_deletions or 0),
                "reviews_given": rv.get("reviews_given", 0),
                "approvals": rv.get("approvals", 0),
                "change_requests": rv.get("change_requests", 0),
            })
        return result

    async def get_repo_stats(self, org: str) -> list[dict]:
        rows = await self.db.execute(
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
                "merge_rate": round(int(r.merged or 0) / r.total_prs * 100, 1) if r.total_prs else 0.0,
                "avg_merge_hours": round(r.avg_merge_hours, 1) if r.avg_merge_hours else None,
                "avg_review_hours": round(r.avg_review_hours, 1) if r.avg_review_hours else None,
                "contributors": r.contributors,
            }
            for r in rows
        ]

    async def get_monthly_trends(self, org: str, months: int = 6) -> list[dict]:
        since = datetime.utcnow() - timedelta(days=30 * months)
        month_expr = func.date_trunc("month", PullRequest.created_at).label("month")
        rows = await self.db.execute(
            select(
                month_expr,
                func.count(PullRequest.id).label("total"),
                func.sum(case((PullRequest.state == "MERGED", 1), else_=0)).label("merged"),
                func.count(func.distinct(PullRequest.author_login)).label("contributors"),
            )
            .where(and_(PullRequest.org == org, PullRequest.created_at >= since))
            .group_by(text("month"))
            .order_by(text("month"))
        )
        return [
            {
                "month": r.month.strftime("%Y-%m") if r.month else "",
                "total_prs": r.total,
                "merged_prs": int(r.merged or 0),
                "contributors": r.contributors,
            }
            for r in rows
        ]

    async def get_digest(self, org: str, since: datetime) -> dict:
        until = datetime.utcnow()
        period_filter = and_(PullRequest.org == org, PullRequest.created_at >= since)

        total_prs = await self.db.scalar(
            select(func.count(PullRequest.id)).where(period_filter)
        ) or 0
        merged_prs = await self.db.scalar(
            select(func.count(PullRequest.id)).where(
                and_(period_filter, PullRequest.state == "MERGED")
            )
        ) or 0
        open_prs = await self.db.scalar(
            select(func.count(PullRequest.id)).where(
                and_(period_filter, PullRequest.state == "OPEN")
            )
        ) or 0
        avg_merge = await self.db.scalar(
            select(func.avg(PullRequest.time_to_merge_hours)).where(
                and_(period_filter, PullRequest.time_to_merge_hours.isnot(None))
            )
        )
        avg_review = await self.db.scalar(
            select(func.avg(PullRequest.time_to_first_review_hours)).where(
                and_(period_filter, PullRequest.time_to_first_review_hours.isnot(None))
            )
        )
        unique_contributors = await self.db.scalar(
            select(func.count(func.distinct(PullRequest.author_login))).where(period_filter)
        ) or 0
        total_reviews = await self.db.scalar(
            select(func.count(PRReview.id)).where(
                and_(PRReview.org == org, PRReview.submitted_at >= since)
            )
        ) or 0

        contrib_rows = await self.db.execute(
            select(
                PullRequest.author_login,
                PullRequest.author_avatar,
                func.count(PullRequest.id).label("total_prs"),
                func.sum(case((PullRequest.state == "MERGED", 1), else_=0)).label("merged_prs"),
            )
            .where(period_filter)
            .group_by(PullRequest.author_login, PullRequest.author_avatar)
            .order_by(func.count(PullRequest.id).desc())
            .limit(5)
        )
        review_counts = await self.db.execute(
            select(
                PRReview.reviewer_login,
                func.count(PRReview.id).label("reviews_given"),
            )
            .where(and_(PRReview.org == org, PRReview.submitted_at >= since))
            .group_by(PRReview.reviewer_login)
        )
        review_map = {r.reviewer_login: r.reviews_given for r in review_counts}

        top_contributors = [
            {
                "login": r.author_login,
                "avatar_url": r.author_avatar,
                "total_prs": r.total_prs,
                "merged_prs": int(r.merged_prs or 0),
                "reviews_given": review_map.get(r.author_login, 0),
            }
            for r in contrib_rows
        ]

        repo_rows = await self.db.execute(
            select(
                PullRequest.repo_full_name,
                func.count(PullRequest.id).label("total_prs"),
                func.sum(case((PullRequest.state == "MERGED", 1), else_=0)).label("merged_prs"),
            )
            .where(period_filter)
            .group_by(PullRequest.repo_full_name)
            .order_by(func.count(PullRequest.id).desc())
            .limit(5)
        )
        top_repos = [
            {
                "name": r.repo_full_name.split("/")[-1],
                "total_prs": r.total_prs,
                "merged_prs": int(r.merged_prs or 0),
                "merge_rate": round(int(r.merged_prs or 0) / r.total_prs * 100, 1) if r.total_prs else 0.0,
            }
            for r in repo_rows
        ]

        return {
            "total_prs": total_prs,
            "merged_prs": merged_prs,
            "open_prs": open_prs,
            "merge_rate": round(merged_prs / total_prs * 100, 1) if total_prs else 0.0,
            "avg_merge_hours": round(avg_merge, 1) if avg_merge else None,
            "avg_review_hours": round(avg_review, 1) if avg_review else None,
            "unique_contributors": unique_contributors,
            "total_reviews": total_reviews,
            "top_contributors": top_contributors,
            "top_repos": top_repos,
            "since": since.strftime("%Y-%m-%d"),
            "until": until.strftime("%Y-%m-%d"),
        }

    async def get_review_network(self, org: str) -> list[dict]:
        rows = await self.db.execute(
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
