from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.deps import get_current_user
from app.services.analytics_service import AnalyticsService
from app.schemas.analytics import (
    OrgOverviewOut, DeveloperStatOut, RepoStatOut,
    MonthlyTrendOut, ReviewNetworkOut, DigestOut,
)
from app.schemas.pull_request import PRListResponse
from app.models.user import User

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/{org}/overview", response_model=OrgOverviewOut)
async def org_overview(
    org: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AnalyticsService(db).get_overview(org)


@router.get("/{org}/developers", response_model=list[DeveloperStatOut])
async def developer_stats(
    org: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AnalyticsService(db).get_developer_stats(org)


@router.get("/{org}/repositories", response_model=list[RepoStatOut])
async def repo_stats(
    org: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AnalyticsService(db).get_repo_stats(org)


@router.get("/{org}/trends", response_model=list[MonthlyTrendOut])
async def monthly_trends(
    org: str,
    months: int = Query(6, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AnalyticsService(db).get_monthly_trends(org, months)


@router.get("/{org}/review-network", response_model=list[ReviewNetworkOut])
async def review_network(
    org: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AnalyticsService(db).get_review_network(org)


@router.get("/{org}/digest", response_model=DigestOut)
async def org_digest(
    org: str,
    period: str = Query("1w", pattern="^(1w|2w|3w|1m|2m|3m|6m)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AnalyticsService(db).get_digest(org, period)


@router.get("/{org}/prs", response_model=PRListResponse)
async def pr_list(
    org: str,
    repo: Optional[str] = Query(None),
    author: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AnalyticsService(db).get_pr_list(org, repo, author, state, limit, offset)
