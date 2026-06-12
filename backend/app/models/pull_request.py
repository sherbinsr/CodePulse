from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PullRequest(Base):
    __tablename__ = "pull_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    github_id: Mapped[Optional[int]] = mapped_column(BigInteger, index=True)
    provider: Mapped[str] = mapped_column(String(20), default="github", nullable=False, index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    repo_full_name: Mapped[str] = mapped_column(String(512), index=True, nullable=False)
    org: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    state: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    author_login: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    author_avatar: Mapped[Optional[str]] = mapped_column(Text)
    additions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    deletions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    changed_files: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    comments_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reviews_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    time_to_merge_hours: Mapped[Optional[float]] = mapped_column(Float)
    time_to_first_review_hours: Mapped[Optional[float]] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, index=True, nullable=False)
    merged_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    synced_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class PRReview(Base):
    __tablename__ = "pr_reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    pr_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("pull_requests.id", ondelete="CASCADE"), index=True, nullable=False
    )
    repo_full_name: Mapped[str] = mapped_column(String(512), index=True, nullable=False)
    org: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    pr_number: Mapped[int] = mapped_column(Integer, nullable=False)
    pr_author_login: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    reviewer_login: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    reviewer_avatar: Mapped[Optional[str]] = mapped_column(Text)
    state: Mapped[str] = mapped_column(String(50), nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, index=True, nullable=False)
