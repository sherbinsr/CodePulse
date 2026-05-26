from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services import analytics as svc

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/{org}/overview")
async def org_overview(
    org: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await svc.get_org_overview(org, db)


@router.get("/{org}/developers")
async def developer_stats(
    org: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await svc.get_developer_stats(org, db)


@router.get("/{org}/repositories")
async def repo_stats(
    org: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await svc.get_repo_stats(org, db)


@router.get("/{org}/trends")
async def monthly_trends(
    org: str,
    months: int = Query(6, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await svc.get_monthly_trends(org, db, months)


@router.get("/{org}/review-network")
async def review_network(
    org: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await svc.get_review_network(org, db)


@router.get("/{org}/prs")
async def pr_list(
    org: str,
    repo: str | None = Query(None),
    author: str | None = Query(None),
    state: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    prs, total = await svc.get_pr_list(org, db, repo, author, state, limit, offset)
    return {"data": prs, "total": total, "limit": limit, "offset": offset}
