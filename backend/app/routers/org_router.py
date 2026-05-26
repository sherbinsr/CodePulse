from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, AsyncSessionLocal
from app.routers.deps import get_current_user
from app.services.github_service import GitHubService
from app.services.sync_service import SyncService
from app.repositories.sync_repository import SyncRepository
from app.schemas.organization import OrgOut, SyncTriggerResponse, SyncStatusOut
from app.models.user import User

router = APIRouter(prefix="/orgs", tags=["Organizations"])


@router.get("", response_model=list[OrgOut])
async def list_orgs(current_user: User = Depends(get_current_user)):
    """List GitHub organizations the authenticated user belongs to."""
    gh = GitHubService(current_user.github_token)
    orgs = await gh.get_user_orgs()
    return [OrgOut(login=o["login"], avatar_url=o.get("avatar_url"), description=o.get("description")) for o in orgs]


@router.get("/debug")
async def debug_orgs(current_user: User = Depends(get_current_user)):
    """Show raw GitHub API responses for org membership — for troubleshooting only."""
    gh = GitHubService(current_user.github_token)
    user_orgs = await gh._rest_get("/user/orgs", {"per_page": 100})
    memberships = await gh._rest_get("/user/memberships/orgs", {"state": "active", "per_page": 100})
    scopes_resp = await gh._rest_get_with_headers("/user")
    return {
        "token_scopes": scopes_resp.get("x-oauth-scopes", "unknown"),
        "user_orgs": [o.get("login") for o in (user_orgs or [])],
        "memberships": [
            {"org": m.get("organization", {}).get("login"), "state": m.get("state"), "role": m.get("role")}
            for m in (memberships or [])
        ],
    }


@router.post("/{org}/sync", response_model=SyncTriggerResponse)
async def trigger_sync(
    org: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kick off a background sync for the given organization."""
    sync_repo = SyncRepository(db)

    running = await sync_repo.get_running(org)
    if running:
        return SyncTriggerResponse(job_id=running.id, status=running.status, message="Sync already in progress")

    job = await sync_repo.create(org=org, triggered_by=current_user.login)

    async def _run(job_id: int, org_: str, token: str):
        async with AsyncSessionLocal() as bg_db:
            await SyncService(bg_db).run(org_, token, job_id)

    background_tasks.add_task(_run, job.id, org, current_user.github_token)
    return SyncTriggerResponse(job_id=job.id, status="pending", message=f"Sync started for {org}")


@router.get("/{org}/sync/status", response_model=SyncStatusOut)
async def sync_status(
    org: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the latest sync job status for an organization."""
    job = await SyncRepository(db).get_latest(org)
    if not job:
        return SyncStatusOut(status="never_synced")
    return SyncStatusOut(
        status=job.status,
        job_id=job.id,
        repos_synced=job.repos_synced,
        prs_synced=job.prs_synced,
        error=job.error,
        started_at=job.started_at,
        finished_at=job.finished_at,
    )
