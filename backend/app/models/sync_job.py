from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class SyncJob(Base):
    __tablename__ = "sync_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    org: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    triggered_by: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    repos_synced: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    prs_synced: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error: Mapped[Optional[str]] = mapped_column(Text)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
