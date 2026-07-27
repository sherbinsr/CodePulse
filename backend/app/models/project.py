from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class GitHubProject(Base):
    __tablename__ = "github_projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    github_id: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    org: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    closed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    fields_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    items = relationship("GitHubProjectItem", back_populates="project", cascade="all, delete-orphan")


class GitHubIssue(Base):
    __tablename__ = "github_issues"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    github_id: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    number: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    repository_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("repositories.id", ondelete="SET NULL"), nullable=True
    )
    repo_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    owner: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    state: Mapped[str] = mapped_column(String(50), default="open", nullable=False)
    author_login: Mapped[str] = mapped_column(String(255), nullable=False)
    author_avatar: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    assignees_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    labels_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    milestone: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    priority: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    comments_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    project_items = relationship("GitHubProjectItem", back_populates="issue", cascade="all, delete-orphan")


class GitHubProjectItem(Base):
    __tablename__ = "github_project_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    github_id: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("github_projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    issue_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("github_issues.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(100), default="Todo", nullable=False, index=True)
    status_option_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    project = relationship("GitHubProject", back_populates="items")
    issue = relationship("GitHubIssue", back_populates="project_items")


# ── Built-in Repository Projects & Tasks ──────────────────────────────────────

class RepoProject(Base):
    __tablename__ = "repo_projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    org: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    repo_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    repository_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    key_prefix: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    columns_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    tasks = relationship("ProjectTask", back_populates="project", cascade="all, delete-orphan")


class ProjectTask(Base):
    __tablename__ = "project_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("repo_projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    issue_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("github_issues.id", ondelete="SET NULL"), nullable=True
    )
    ticket_key: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)

    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(100), default="Todo", nullable=False, index=True)
    priority: Mapped[str] = mapped_column(String(50), default="Medium", nullable=False)
    assignees_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    labels_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    story_points: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    project = relationship("RepoProject", back_populates="tasks")
    issue = relationship("GitHubIssue")
