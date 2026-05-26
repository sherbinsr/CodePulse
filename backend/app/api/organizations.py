from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.pull_request import SyncJob
from app.services.github import GitHubClient
from app.services.sync import sync_org

router = APIRouter(prefix="/orgs", tags=["organizations"])


@router.get("")
async def list_orgs(
    current_user: User = Depends(get_current_user),
):
    """List GitHub organizations the authenticated user belongs to."""
    client = GitHubClient(current_user.github_token)
    orgs = await client.get_user_orgs()
    return [
        {
            "login": o["login"],
            "avatar_url": o.get("avatar_url"),
            "description": o.get("description"),
        }
        for o in orgs
    ]


@router.post("/{org}/sync")
async def trigger_sync(
    org: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kick off a background sync of all PRs for the given org."""
    # Check if a sync is already running
    result = await db.execute(
        select(SyncJob)
        .where(SyncJob.org == org, SyncJob.status.in_(["pending", "running"]))
        .order_by(SyncJob.started_at.desc())
        .limit(1)
    )
    running = result.scalar_one_or_none()
    if running:
        return {"job_id": running.id, "status": running.status, "message": "Sync already in progress"}

    job = SyncJob(org=org, user_login=current_user.login, status="pending")
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Run in background — create a fresh db session for the background task
    from app.database import AsyncSessionLocal

    async def _run_sync(job_id: int, org_: str, token: str):
        async with AsyncSessionLocal() as bg_db:
            await sync_org(org_, token, bg_db, job_id)

    background_tasks.add_task(_run_sync, job.id, org, current_user.github_token)
    return {"job_id": job.id, "status": "pending", "message": f"Sync started for {org}"}


@router.get("/{org}/sync/status")
async def sync_status(
    org: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SyncJob)
        .where(SyncJob.org == org)
        .order_by(SyncJob.started_at.desc())
        .limit(1)
    )
    job = result.scalar_one_or_none()
    if not job:
        return {"status": "never_synced"}
    return {
        "job_id": job.id,
        "status": job.status,
        "repos_synced": job.repos_synced,
        "prs_synced": job.prs_synced,
        "error": job.error,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "finished_at": job.finished_at.isoformat() if job.finished_at else None,
    }
