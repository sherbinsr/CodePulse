import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal, get_db
from app.models.user import User
from app.repositories.sync_repository import SyncRepository
from app.routers.deps import get_current_user
from app.schemas.organization import OrgOut, SyncStatusOut, SyncTriggerResponse
from app.services.github_service import GitHubService
from app.services.gitlab_service import GitLabService
from app.services.sync_service import SyncService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/orgs", tags=["Organizations"])


@router.get("", response_model=list[OrgOut])
async def list_orgs(current_user: User = Depends(get_current_user)):
    """List all organizations/groups for the authenticated user across linked providers."""
    logger.info("Listing orgs for user: %s", current_user.login)
    orgs: list[OrgOut] = []

    if current_user.github_token:
        gh = GitHubService(current_user.github_token)
        gh_orgs = await gh.get_user_orgs()
        logger.debug("Found %d GitHub orgs for user: %s", len(gh_orgs), current_user.login)
        orgs.extend(
            OrgOut(
                login=o["login"],
                avatar_url=o.get("avatar_url"),
                description=o.get("description"),
                provider="github",
            )
            for o in gh_orgs
        )

    if current_user.gitlab_token:
        gl = GitLabService(current_user.gitlab_token)
        gl_groups = await gl.get_user_groups()
        logger.debug("Found %d GitLab groups for user: %s", len(gl_groups), current_user.login)
        orgs.extend(
            OrgOut(
                login=g["login"],
                avatar_url=g.get("avatar_url"),
                description=g.get("description"),
                provider="gitlab",
            )
            for g in gl_groups
        )

    return orgs


@router.get("/debug")
async def debug_orgs(current_user: User = Depends(get_current_user)):
    """Show raw provider API responses for troubleshooting."""
    result: dict = {}

    if current_user.github_token:
        gh = GitHubService(current_user.github_token)
        user_orgs = await gh._rest_get("/user/orgs", {"per_page": 100})
        memberships = await gh._rest_get("/user/memberships/orgs", {"state": "active", "per_page": 100})
        scopes_resp = await gh._rest_get_with_headers("/user")
        result["github"] = {
            "token_scopes": scopes_resp.get("x-oauth-scopes", "unknown"),
            "user_orgs": [o.get("login") for o in (user_orgs or [])],
            "memberships": [
                {"org": m.get("organization", {}).get("login"), "state": m.get("state")}
                for m in (memberships or [])
            ],
        }

    if current_user.gitlab_token:
        gl = GitLabService(current_user.gitlab_token)
        gl_groups = await gl.get_user_groups()
        result["gitlab"] = {"groups": [g["login"] for g in gl_groups]}

    return result


@router.post("/{org}/sync", response_model=SyncTriggerResponse)
async def trigger_sync(
    org: str,
    background_tasks: BackgroundTasks,
    provider: str = Query(default="github", pattern="^(github|gitlab)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kick off a background sync for the given organization/group."""
    if provider == "gitlab" and not current_user.gitlab_token:
        raise HTTPException(status_code=400, detail="GitLab account not linked. Please sign in with GitLab.")
    if provider == "github" and not current_user.github_token:
        raise HTTPException(status_code=400, detail="GitHub account not linked. Please sign in with GitHub.")

    sync_repo = SyncRepository(db)
    running = await sync_repo.get_running(org, provider)
    if running:
        logger.info("Sync already running for org: %s provider: %s (job_id=%d)", org, provider, running.id)
        return SyncTriggerResponse(
            job_id=running.id, status=running.status, message="Sync already in progress"
        )

    job = await sync_repo.create(org=org, triggered_by=current_user.login, provider=provider)
    logger.info("Sync job %d created for org: %s provider: %s by user: %s", job.id, org, provider, current_user.login)

    token = current_user.gitlab_token if provider == "gitlab" else current_user.github_token

    async def _run(job_id: int, org_: str, token_: str, provider_: str):
        async with AsyncSessionLocal() as bg_db:
            await SyncService(bg_db).run(org_, token_, job_id, provider_)

    background_tasks.add_task(_run, job.id, org, token, provider)
    return SyncTriggerResponse(job_id=job.id, status="pending", message=f"Sync started for {org}")


@router.get("/{org}/sync/status", response_model=SyncStatusOut)
async def sync_status(
    org: str,
    provider: str = Query(default="github", pattern="^(github|gitlab)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the latest sync job status for an organization."""
    job = await SyncRepository(db).get_latest(org, provider)
    if not job:
        logger.debug("No sync job found for org: %s provider: %s", org, provider)
        return SyncStatusOut(status="never_synced")
    logger.debug("Sync status for org %s provider %s: %s (job_id=%d)", org, provider, job.status, job.id)
    return SyncStatusOut(
        status=job.status,
        job_id=job.id,
        repos_synced=job.repos_synced,
        prs_synced=job.prs_synced,
        error=job.error,
        started_at=job.started_at,
        finished_at=job.finished_at,
    )
