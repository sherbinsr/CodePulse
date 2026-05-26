from datetime import datetime
from sqlalchemy import String, DateTime, Integer, Text, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class PullRequest(Base):
    __tablename__ = "pull_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    github_id: Mapped[int] = mapped_column(index=True)
    number: Mapped[int] = mapped_column(Integer)
    repo_full_name: Mapped[str] = mapped_column(String(512), index=True)
    org: Mapped[str] = mapped_column(String(255), index=True)
    title: Mapped[str] = mapped_column(Text)
    state: Mapped[str] = mapped_column(String(20), index=True)  # OPEN / CLOSED / MERGED
    author_login: Mapped[str] = mapped_column(String(255), index=True)
    author_avatar: Mapped[str | None] = mapped_column(Text)
    additions: Mapped[int] = mapped_column(Integer, default=0)
    deletions: Mapped[int] = mapped_column(Integer, default=0)
    changed_files: Mapped[int] = mapped_column(Integer, default=0)
    comments_count: Mapped[int] = mapped_column(Integer, default=0)
    reviews_count: Mapped[int] = mapped_column(Integer, default=0)
    # time to merge in hours (null if not merged)
    time_to_merge_hours: Mapped[float | None] = mapped_column(Float)
    # time to first review in hours
    time_to_first_review_hours: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    merged_at: Mapped[datetime | None] = mapped_column(DateTime)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime)
    synced_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PRReview(Base):
    __tablename__ = "pr_reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    pr_id: Mapped[int] = mapped_column(Integer, ForeignKey("pull_requests.id"), index=True)
    repo_full_name: Mapped[str] = mapped_column(String(512), index=True)
    org: Mapped[str] = mapped_column(String(255), index=True)
    pr_number: Mapped[int] = mapped_column(Integer)
    pr_author_login: Mapped[str] = mapped_column(String(255), index=True)
    reviewer_login: Mapped[str] = mapped_column(String(255), index=True)
    reviewer_avatar: Mapped[str | None] = mapped_column(Text)
    state: Mapped[str] = mapped_column(String(50))  # APPROVED / CHANGES_REQUESTED / COMMENTED
    submitted_at: Mapped[datetime] = mapped_column(DateTime, index=True)


class SyncJob(Base):
    __tablename__ = "sync_jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    org: Mapped[str] = mapped_column(String(255), index=True)
    user_login: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending/running/done/failed
    repos_synced: Mapped[int] = mapped_column(Integer, default=0)
    prs_synced: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime)
