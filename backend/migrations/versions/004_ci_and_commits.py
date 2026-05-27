"""Add workflow_runs and commits tables

Revision ID: 004
Revises: 003
Create Date: 2026-05-27
"""
import sqlalchemy as sa
from alembic import op

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "workflow_runs",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("github_run_id", sa.BigInteger, nullable=False),
        sa.Column("repo_full_name", sa.String(512), nullable=False),
        sa.Column("org", sa.String(255), nullable=False),
        sa.Column("workflow_name", sa.String(255), nullable=False),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("conclusion", sa.String(50), nullable=True),
        sa.Column("head_branch", sa.String(255), nullable=True),
        sa.Column("run_attempt", sa.Integer, nullable=False, server_default="1"),
        sa.Column("duration_seconds", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("synced_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_workflow_runs_repo_full_name", "workflow_runs", ["repo_full_name"])
    op.create_index("ix_workflow_runs_org", "workflow_runs", ["org"])
    op.create_index("ix_workflow_runs_created_at", "workflow_runs", ["created_at"])

    op.create_table(
        "commits",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("sha", sa.String(40), nullable=False),
        sa.Column("repo_full_name", sa.String(512), nullable=False),
        sa.Column("org", sa.String(255), nullable=False),
        sa.Column("author_login", sa.String(255), nullable=True),
        sa.Column("author_avatar", sa.Text, nullable=True),
        sa.Column("author_name", sa.String(255), nullable=False),
        sa.Column("committed_at", sa.DateTime, nullable=False),
        sa.Column("synced_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_commits_repo_full_name", "commits", ["repo_full_name"])
    op.create_index("ix_commits_org", "commits", ["org"])
    op.create_index("ix_commits_author_login", "commits", ["author_login"])
    op.create_index("ix_commits_committed_at", "commits", ["committed_at"])


def downgrade() -> None:
    op.drop_table("workflow_runs")
    op.drop_table("commits")
