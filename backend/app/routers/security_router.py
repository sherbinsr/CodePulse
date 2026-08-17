"""Security Router: Run vulnerability assessments and query scan reports."""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.security import (
    OrgSecuritySummary,
    VulnerabilityScanRequest,
    VulnerabilityScanResponse,
    VulnerabilityScanSummary,
)
from app.services.security_service import SecurityService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/security", tags=["Security & Vulnerability Assessment"])


@router.post("/scan", response_model=VulnerabilityScanResponse)
async def trigger_vulnerability_scan(
    payload: VulnerabilityScanRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger an AI-driven vulnerability assessment for a repository."""
    logger.info(
        "User %s triggered vulnerability scan for repo %s/%s",
        current_user.login,
        payload.org,
        payload.repo_name,
    )
    svc = SecurityService(db)
    scan = await svc.run_assessment(
        org=payload.org,
        repo_name=payload.repo_name,
        provider=payload.provider,
        user=current_user,
        custom_openai_key=payload.openai_api_key,
        model=payload.model,
    )
    return scan


@router.get("/{org}/scans", response_model=List[VulnerabilityScanSummary])
async def list_vulnerability_scans(
    org: str,
    repo: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List past vulnerability scans for an organization or repository."""
    svc = SecurityService(db)
    return await svc.get_scans_for_org(org=org, repo_name=repo, limit=limit)


@router.get("/scans/{scan_id}", response_model=VulnerabilityScanResponse)
async def get_vulnerability_scan(
    scan_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve detailed findings and roadmap for a specific vulnerability scan."""
    svc = SecurityService(db)
    scan = await svc.get_scan_by_id(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Vulnerability scan not found.")
    return scan


@router.delete("/scans/{scan_id}")
async def delete_vulnerability_scan(
    scan_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a past vulnerability scan."""
    svc = SecurityService(db)
    success = await svc.delete_scan(scan_id)
    if not success:
        raise HTTPException(status_code=404, detail="Scan not found.")
    return {"message": "Scan deleted successfully"}


@router.get("/{org}/summary", response_model=OrgSecuritySummary)
async def get_organization_security_summary(
    org: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get high-level organizational security score and vulnerability totals."""
    svc = SecurityService(db)
    return await svc.get_org_security_summary(org)
