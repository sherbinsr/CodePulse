from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.analytics_repository import AnalyticsRepository
from app.repositories.pr_repository import PRRepository
from app.schemas.analytics import (
    OrgOverviewOut, DeveloperStatOut, RepoStatOut,
    MonthlyTrendOut, ReviewNetworkOut,
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
