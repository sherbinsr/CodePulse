"""Initial schema: users, repositories, pull_requests, pr_reviews, sync_jobs

Revision ID: 001
Revises:
Create Date: 2026-05-26
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("github_id", sa.Integer(), nullable=False),
        sa.Column("login", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255)),
        sa.Column("email", sa.String(255)),
        sa.Column("avatar_url", sa.Text()),
        sa.Column("github_token", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("github_id"),
        sa.UniqueConstraint("login"),
    )
    op.create_index("ix_users_github_id", "users", ["github_id"])
    op.create_index("ix_users_login", "users", ["login"])

    op.create_table(
        "repositories",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("github_id", sa.Integer(), nullable=False),
        sa.Column("owner", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(512), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("is_private", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("default_branch", sa.String(255), nullable=False, server_default="main"),
        sa.Column("stars", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("forks", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("language", sa.String(100)),
        sa.Column("synced_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("github_id"),
        sa.UniqueConstraint("full_name"),
    )
    op.create_index("ix_repositories_owner", "repositories", ["owner"])
    op.create_index("ix_repositories_full_name", "repositories", ["full_name"])

    op.create_table(
        "pull_requests",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("github_id", sa.Integer(), nullable=False),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("repo_full_name", sa.String(512), nullable=False),
        sa.Column("org", sa.String(255), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("state", sa.String(20), nullable=False),
        sa.Column("author_login", sa.String(255), nullable=False),
        sa.Column("author_avatar", sa.Text()),
        sa.Column("additions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("deletions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("changed_files", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("comments_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reviews_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("time_to_merge_hours", sa.Float()),
        sa.Column("time_to_first_review_hours", sa.Float()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("merged_at", sa.DateTime()),
        sa.Column("closed_at", sa.DateTime()),
        sa.Column("synced_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_pull_requests_org", "pull_requests", ["org"])
    op.create_index("ix_pull_requests_repo_full_name", "pull_requests", ["repo_full_name"])
    op.create_index("ix_pull_requests_author_login", "pull_requests", ["author_login"])
    op.create_index("ix_pull_requests_state", "pull_requests", ["state"])
    op.create_index("ix_pull_requests_created_at", "pull_requests", ["created_at"])

    op.create_table(
        "pr_reviews",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("pr_id", sa.Integer(), sa.ForeignKey("pull_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("repo_full_name", sa.String(512), nullable=False),
        sa.Column("org", sa.String(255), nullable=False),
        sa.Column("pr_number", sa.Integer(), nullable=False),
        sa.Column("pr_author_login", sa.String(255), nullable=False),
        sa.Column("reviewer_login", sa.String(255), nullable=False),
        sa.Column("reviewer_avatar", sa.Text()),
        sa.Column("state", sa.String(50), nullable=False),
        sa.Column("submitted_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_pr_reviews_pr_id", "pr_reviews", ["pr_id"])
    op.create_index("ix_pr_reviews_org", "pr_reviews", ["org"])
    op.create_index("ix_pr_reviews_reviewer_login", "pr_reviews", ["reviewer_login"])
    op.create_index("ix_pr_reviews_pr_author_login", "pr_reviews", ["pr_author_login"])

    op.create_table(
        "sync_jobs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("org", sa.String(255), nullable=False),
        sa.Column("triggered_by", sa.String(255), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("repos_synced", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("prs_synced", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error", sa.Text()),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("finished_at", sa.DateTime()),
    )
    op.create_index("ix_sync_jobs_org", "sync_jobs", ["org"])


def downgrade() -> None:
    op.drop_table("sync_jobs")
    op.drop_table("pr_reviews")
    op.drop_table("pull_requests")
    op.drop_table("repositories")
    op.drop_table("users")
