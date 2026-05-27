from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.analytics_repository import AnalyticsRepository
from app.repositories.pr_repository import PRRepository
from app.schemas.analytics import (
    OrgOverviewOut, DeveloperStatOut, RepoStatOut,
    MonthlyTrendOut, ReviewNetworkOut, DigestOut,
    DigestContributorOut, DigestRepoOut,
)
from app.schemas.pull_request import PullRequestOut, PRListResponse


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.analytics_repo = AnalyticsRepository(db)
        self.pr_repo = PRRepository(db)

    async def get_overview(self, org: str) -> OrgOverviewOut:
        data = await self.analytics_repo.get_org_overview(org)
        return OrgOverviewOut(**data)

    async def get_developer_stats(self, org: str) -> list:
        rows = await self.analytics_repo.get_developer_stats(org)
        return [DeveloperStatOut(**r) for r in rows]

    async def get_repo_stats(self, org: str) -> list:
        rows = await self.analytics_repo.get_repo_stats(org)
        return [RepoStatOut(**r) for r in rows]

    async def get_monthly_trends(self, org: str, months: int = 6) -> list:
        rows = await self.analytics_repo.get_monthly_trends(org, months)
        return [MonthlyTrendOut(**r) for r in rows]

    async def get_digest(self, org: str, period: str) -> DigestOut:
        from datetime import datetime, timedelta
        period_map = {
            "1w": (7,   "Last 1 Week"),
            "2w": (14,  "Last 2 Weeks"),
            "3w": (21,  "Last 3 Weeks"),
            "1m": (30,  "Last 1 Month"),
            "2m": (60,  "Last 2 Months"),
            "3m": (90,  "Last 3 Months"),
            "6m": (180, "Last 6 Months"),
        }
        days, label = period_map.get(period, (30, "Last 1 Month"))
        since = datetime.utcnow() - timedelta(days=days)
        data = await self.analytics_repo.get_digest(org, since)
        top_contributors = [DigestContributorOut(**c) for c in data.pop("top_contributors")]
        top_repos = [DigestRepoOut(**r) for r in data.pop("top_repos")]
        return DigestOut(
            org=org,
            period_label=label,
            top_contributors=top_contributors,
            top_repos=top_repos,
            **data,
        )

    async def get_review_network(self, org: str) -> list:
        rows = await self.analytics_repo.get_review_network(org)
        return [ReviewNetworkOut(**r) for r in rows]

    async def get_pr_list(
        self,
        org: str,
        repo: Optional[str],
        author: Optional[str],
        state: Optional[str],
        limit: int,
        offset: int,
    ) -> PRListResponse:
        prs, total = await self.pr_repo.list_prs(org, repo, author, state, limit, offset)
        return PRListResponse(
            data=[
                PullRequestOut(
                    id=pr.id,
                    number=pr.number,
                    repo=pr.repo_full_name,
                    title=pr.title,
                    state=pr.state,
                    author=pr.author_login,
                    author_avatar=pr.author_avatar,
                    additions=pr.additions,
                    deletions=pr.deletions,
                    changed_files=pr.changed_files,
                    reviews_count=pr.reviews_count,
                    time_to_merge_hours=pr.time_to_merge_hours,
                    time_to_first_review_hours=pr.time_to_first_review_hours,
                    created_at=pr.created_at,
                    merged_at=pr.merged_at,
                    closed_at=pr.closed_at,
                )
                for pr in prs
            ],
            total=total,
            limit=limit,
            offset=offset,
        )
