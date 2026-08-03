from typing import Optional

from sqlalchemy import case, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pull_request import PRReview, PullRequest


class PRRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def delete_by_repo(self, repo_full_name: str, provider: str = "github") -> None:
        await self.db.execute(
            delete(PRReview).where(
                PRReview.repo_full_name == repo_full_name,
            )
        )
        await self.db.execute(
            delete(PullRequest).where(
                PullRequest.repo_full_name == repo_full_name,
                PullRequest.provider == provider,
            )
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
        action_status: Optional[str] = None,
        base_branch: Optional[str] = None,
        head_branch: Optional[str] = None,
        sort_by: Optional[str] = None,
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
        if action_status:
            act = action_status.lower()
            if act in ["failure", "failed"]:
                base = base.where(PullRequest.action_status.in_(["failure", "failed"]))
                count_base = count_base.where(PullRequest.action_status.in_(["failure", "failed"]))
            elif act in ["success", "passed"]:
                base = base.where(PullRequest.action_status.in_(["success", "passed"]))
                count_base = count_base.where(PullRequest.action_status.in_(["success", "passed"]))
            else:
                base = base.where(PullRequest.action_status == act)
                count_base = count_base.where(PullRequest.action_status == act)

        if base_branch:
            base = base.where(PullRequest.base_branch.ilike(f"%{base_branch}%"))
            count_base = count_base.where(PullRequest.base_branch.ilike(f"%{base_branch}%"))
        if head_branch:
            base = base.where(PullRequest.head_branch.ilike(f"%{head_branch}%"))
            count_base = count_base.where(PullRequest.head_branch.ilike(f"%{head_branch}%"))

        if sort_by == "action_failed_first":
            order_clause = case(
                (PullRequest.action_status.in_(["failure", "failed"]), 0),
                else_=1,
            )
            base = base.order_by(order_clause, PullRequest.created_at.desc())
        elif sort_by == "action_passed_first":
            order_clause = case(
                (PullRequest.action_status.in_(["success", "passed"]), 0),
                else_=1,
            )
            base = base.order_by(order_clause, PullRequest.created_at.desc())
        elif sort_by == "env_priority":
            env_order = case(
                (PullRequest.base_branch.in_(["prod", "main", "master"]), 0),
                (PullRequest.base_branch == "staging", 1),
                (PullRequest.base_branch == "qa", 2),
                (PullRequest.base_branch == "dev", 3),
                else_=4,
            )
            base = base.order_by(env_order, PullRequest.created_at.desc())
        elif sort_by in ["to_branch", "base_branch"]:
            base = base.order_by(PullRequest.base_branch.asc(), PullRequest.created_at.desc())
        elif sort_by in ["from_branch", "head_branch"]:
            base = base.order_by(PullRequest.head_branch.asc(), PullRequest.created_at.desc())
        else:
            base = base.order_by(PullRequest.created_at.desc())

        total = await self.db.scalar(count_base)
        rows = await self.db.execute(base.limit(limit).offset(offset))
        return list(rows.scalars().all()), total or 0

