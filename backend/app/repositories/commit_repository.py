from datetime import datetime, timedelta

from sqlalchemy import and_, case, delete, extract, func, insert, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.commit import Commit


class CommitRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def delete_by_repo(self, repo_full_name: str) -> None:
        await self.db.execute(delete(Commit).where(Commit.repo_full_name == repo_full_name))

    async def bulk_insert(self, commits: list[dict]) -> None:
        if commits:
            await self.db.execute(insert(Commit), commits)

    async def get_commit_activity(self, org: str) -> list[dict]:
        after_hours = or_(
            extract("hour", Commit.committed_at) < 9,
            extract("hour", Commit.committed_at) >= 20,
        )
        weekend = or_(
            extract("dow", Commit.committed_at) == 0,
            extract("dow", Commit.committed_at) == 6,
        )
        rows = await self.db.execute(
            select(
                Commit.author_login,
                func.max(Commit.author_avatar).label("author_avatar"),
                func.count(Commit.id).label("total_commits"),
                func.count(func.distinct(func.date(Commit.committed_at))).label("active_days"),
                func.sum(case((after_hours, 1), else_=0)).label("after_hours_commits"),
                func.sum(case((weekend, 1), else_=0)).label("weekend_commits"),
                func.count(func.distinct(Commit.repo_full_name)).label("repos_contributed"),
            )
            .where(and_(Commit.org == org, Commit.author_login.isnot(None)))
            .group_by(Commit.author_login)
            .order_by(func.count(Commit.id).desc())
        )
        result = []
        for r in rows:
            total = r.total_commits
            after_hours_n = int(r.after_hours_commits or 0)
            weekend_n = int(r.weekend_commits or 0)
            active = r.active_days or 1
            result.append({
                "author_login": r.author_login,
                "author_avatar": r.author_avatar,
                "total_commits": total,
                "active_days": r.active_days,
                "commits_per_active_day": round(total / active, 1),
                "after_hours_commits": after_hours_n,
                "weekend_commits": weekend_n,
                "after_hours_pct": round(after_hours_n / total * 100, 1) if total else 0.0,
                "weekend_pct": round(weekend_n / total * 100, 1) if total else 0.0,
                "repos_contributed": r.repos_contributed,
            })
        return result

    async def get_code_churn(self, org: str) -> list[dict]:
        since = datetime.utcnow() - timedelta(weeks=8)
        week_expr = func.date_trunc("week", Commit.committed_at).label("week")
        rows = await self.db.execute(
            select(
                week_expr,
                Commit.repo_full_name,
                func.count(Commit.id).label("total_commits"),
                func.count(func.distinct(Commit.author_login)).label("unique_authors"),
            )
            .where(and_(Commit.org == org, Commit.committed_at >= since))
            .group_by(text("week"), Commit.repo_full_name)
            .order_by(text("week"))
        )
        return [
            {
                "week": r.week.strftime("%Y-%m-%d") if r.week else "",
                "repo_name": r.repo_full_name.split("/")[-1],
                "total_commits": r.total_commits,
                "unique_authors": r.unique_authors,
            }
            for r in rows
        ]
