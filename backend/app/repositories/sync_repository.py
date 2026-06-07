from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sync_job import SyncJob


class SyncRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_latest(self, org: str, provider: str = "github") -> Optional[SyncJob]:
        result = await self.db.execute(
            select(SyncJob)
            .where(SyncJob.org == org, SyncJob.provider == provider)
            .order_by(SyncJob.started_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_running(self, org: str, provider: str = "github") -> Optional[SyncJob]:
        result = await self.db.execute(
            select(SyncJob)
            .where(
                SyncJob.org == org,
                SyncJob.provider == provider,
                SyncJob.status.in_(["pending", "running"]),
            )
            .order_by(SyncJob.started_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def create(self, org: str, triggered_by: str, provider: str = "github") -> SyncJob:
        job = SyncJob(org=org, provider=provider, triggered_by=triggered_by, status="pending")
        self.db.add(job)
        await self.db.commit()
        await self.db.refresh(job)
        return job

    async def update_status(
        self,
        job_id: int,
        status: str,
        repos_synced: Optional[int] = None,
        prs_synced: Optional[int] = None,
        error: Optional[str] = None,
    ) -> None:
        job = await self.db.get(SyncJob, job_id)
        if not job:
            return
        job.status = status
        if repos_synced is not None:
            job.repos_synced = repos_synced
        if prs_synced is not None:
            job.prs_synced = prs_synced
        if error is not None:
            job.error = error
        if status in ("done", "failed"):
            job.finished_at = datetime.utcnow()
        await self.db.commit()
