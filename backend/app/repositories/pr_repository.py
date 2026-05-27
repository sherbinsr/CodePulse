from typing import Optional

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pull_request import PRReview, PullRequest


class PRRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def delete_by_repo(self, repo_full_name: str) -> None:
        await self.db.execute(
            delete(PRReview).where(PRReview.repo_full_name == repo_full_name)
        )
        await self.db.execute(
            delete(PullRequest).where(PullRequest.repo_full_name == repo_full_name)
        )

    async def create_pr(self, **kwargs) -> PullRequest:
        pr = PullRequest(**kwargs)
        self.db.add(pr)
        await self.db.flush()
        return pr

    async def create_review(self, **kwargs) -> PRReview:
        review = PRReview(**kwargs)
        self.db.add(review)
        return review

    async def list_prs(
        self,
        org: str,
        repo: Optional[str] = None,
        author: Optional[str] = None,
        state: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[PullRequest], int]:
        base = select(PullRequest).where(PullRequest.org == org)
        count_base = select(func.count(PullRequest.id)).where(PullRequest.org == org)

        if repo:
            base = base.where(PullRequest.repo_full_name == repo)
            count_base = count_base.where(PullRequest.repo_full_name == repo)
        if author:
            base = base.where(PullRequest.author_login == author)
            count_base = count_base.where(PullRequest.author_login == author)
        if state:
            base = base.where(PullRequest.state == state.upper())
            count_base = count_base.where(PullRequest.state == state.upper())

        total = await self.db.scalar(count_base)
        rows = await self.db.execute(
            base.order_by(PullRequest.created_at.desc()).limit(limit).offset(offset)
        )
        return list(rows.scalars().all()), total or 0
