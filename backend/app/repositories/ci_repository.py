from datetime import datetime, timedelta

from sqlalchemy import and_, case, delete, func, insert, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workflow_run import WorkflowRun


class CIRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def delete_by_repo(self, repo_full_name: str) -> None:
        await self.db.execute(
            delete(WorkflowRun).where(WorkflowRun.repo_full_name == repo_full_name)
        )

    async def bulk_insert(self, runs: list[dict]) -> None:
        if runs:
            await self.db.execute(insert(WorkflowRun), runs)

    async def get_ci_summary(self, org: str) -> list[dict]:
        rows = await self.db.execute(
            select(
                WorkflowRun.repo_full_name,
                func.count(WorkflowRun.id).label("total_runs"),
                func.sum(case((WorkflowRun.conclusion == "success", 1), else_=0)).label(
                    "successful_runs"
                ),
                func.sum(case((WorkflowRun.conclusion == "failure", 1), else_=0)).label(
                    "failed_runs"
                ),
                func.sum(
                    case(
                        (
                            and_(WorkflowRun.run_attempt == 1, WorkflowRun.conclusion == "success"),
                            1,
                        ),
                        else_=0,
                    )
                ).label("first_try_success"),
                func.avg(
                    case(
                        (WorkflowRun.conclusion == "success", WorkflowRun.duration_seconds),
                        else_=None,
                    )
                ).label("avg_duration_seconds"),
            )
            .where(and_(WorkflowRun.org == org, WorkflowRun.status == "completed"))
            .group_by(WorkflowRun.repo_full_name)
            .order_by(func.count(WorkflowRun.id).desc())
        )
        return [
            {
                "repo": r.repo_full_name,
                "name": r.repo_full_name.split("/")[-1],
                "total_runs": r.total_runs,
                "successful_runs": int(r.successful_runs or 0),
                "failed_runs": int(r.failed_runs or 0),
                "first_try_pass_rate": round(int(r.first_try_success or 0) / r.total_runs * 100, 1)
                if r.total_runs
                else 0.0,
                "overall_pass_rate": round(int(r.successful_runs or 0) / r.total_runs * 100, 1)
                if r.total_runs
                else 0.0,
                "avg_duration_seconds": round(r.avg_duration_seconds, 0)
                if r.avg_duration_seconds
                else None,
            }
            for r in rows
        ]

    async def get_build_trends(self, org: str) -> list[dict]:
        since = datetime.utcnow() - timedelta(weeks=8)
        week_expr = func.date_trunc("week", WorkflowRun.created_at).label("week")
        rows = await self.db.execute(
            select(
                week_expr,
                WorkflowRun.repo_full_name,
                func.avg(WorkflowRun.duration_seconds).label("avg_duration_seconds"),
                func.count(WorkflowRun.id).label("run_count"),
            )
            .where(
                and_(
                    WorkflowRun.org == org,
                    WorkflowRun.conclusion == "success",
                    WorkflowRun.duration_seconds.isnot(None),
                    WorkflowRun.created_at >= since,
                )
            )
            .group_by(text("week"), WorkflowRun.repo_full_name)
            .order_by(text("week"))
        )
        return [
            {
                "week": r.week.strftime("%Y-%m-%d") if r.week else "",
                "repo_name": r.repo_full_name.split("/")[-1],
                "avg_duration_seconds": round(r.avg_duration_seconds, 0)
                if r.avg_duration_seconds
                else 0.0,
                "run_count": r.run_count,
            }
            for r in rows
        ]

    async def get_flaky_workflows(self, org: str) -> list[dict]:
        flaky_expr = func.sum(
            case(
                (and_(WorkflowRun.run_attempt > 1, WorkflowRun.conclusion == "success"), 1), else_=0
            )
        )
        rows = await self.db.execute(
            select(
                WorkflowRun.workflow_name,
                WorkflowRun.repo_full_name,
                flaky_expr.label("flaky_count"),
                func.count(WorkflowRun.id).label("total_runs"),
            )
            .where(and_(WorkflowRun.org == org, WorkflowRun.status == "completed"))
            .group_by(WorkflowRun.workflow_name, WorkflowRun.repo_full_name)
            .having(flaky_expr > 0)
            .order_by(flaky_expr.desc())
            .limit(20)
        )
        return [
            {
                "workflow_name": r.workflow_name,
                "repo_name": r.repo_full_name.split("/")[-1],
                "flaky_count": int(r.flaky_count or 0),
                "total_runs": r.total_runs,
                "flakiness_rate": round(int(r.flaky_count or 0) / r.total_runs * 100, 1)
                if r.total_runs
                else 0.0,
            }
            for r in rows
        ]
