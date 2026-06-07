from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.repository import Repository


class RepoRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_full_name(self, full_name: str, provider: str = "github") -> Optional[Repository]:
        result = await self.db.execute(
            select(Repository).where(
                Repository.full_name == full_name, Repository.provider == provider
            )
        )
        return result.scalar_one_or_none()

    async def list_by_org(self, org: str, provider: Optional[str] = None) -> list:
        q = select(Repository).where(Repository.owner == org)
        if provider:
            q = q.where(Repository.provider == provider)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def upsert(self, full_name: str, provider: str = "github", **kwargs) -> Repository:
        repo = await self.get_by_full_name(full_name, provider)
        if repo is None:
            repo = Repository(full_name=full_name, provider=provider, **kwargs)
            self.db.add(repo)
        else:
            for key, value in kwargs.items():
                setattr(repo, key, value)
        repo.synced_at = datetime.utcnow()
        await self.db.flush()
        return repo
