from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Integer, BigInteger
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    github_run_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    repo_full_name: Mapped[str] = mapped_column(String(512), index=True, nullable=False)
    org: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    workflow_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    conclusion: Mapped[Optional[str]] = mapped_column(String(50))
    head_branch: Mapped[Optional[str]] = mapped_column(String(255))
    run_attempt: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, index=True, nullable=False)
    synced_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
