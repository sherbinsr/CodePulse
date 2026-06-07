"""Add GitLab support: provider fields, gitlab_id/gitlab_token on users, composite repo unique key

Revision ID: 006
Revises: 005
Create Date: 2026-06-07
"""
import sqlalchemy as sa
from alembic import op

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users ──────────────────────────────────────────────────────────────
    # Make github_id nullable (GitLab-only users won't have one)
    op.alter_column("users", "github_id", existing_type=sa.Integer(), nullable=True)
    # Make github_token nullable (same reason)
    op.alter_column("users", "github_token", existing_type=sa.Text(), nullable=True)
    # Add GitLab columns
    op.add_column("users", sa.Column("gitlab_id", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("gitlab_token", sa.Text(), nullable=True))
    op.create_index("ix_users_gitlab_id", "users", ["gitlab_id"], unique=True)

    # ── repositories ───────────────────────────────────────────────────────
    # Add provider column (default github for existing rows)
    op.add_column(
        "repositories",
        sa.Column("provider", sa.String(20), nullable=False, server_default="github"),
    )
    op.create_index("ix_repositories_provider", "repositories", ["provider"])
    # Make github_id nullable (GitLab repos won't have one)
    op.alter_column("repositories", "github_id", existing_type=sa.BigInteger(), nullable=True)
    # Drop old unique index on full_name alone, replace with (full_name, provider)
    op.drop_index("ix_repositories_full_name", table_name="repositories")
    op.create_index(
        "uq_repositories_full_name_provider",
        "repositories",
        ["full_name", "provider"],
        unique=True,
    )

    # ── pull_requests ───────────────────────────────────────────────────────
    op.add_column(
        "pull_requests",
        sa.Column("provider", sa.String(20), nullable=False, server_default="github"),
    )
    op.create_index("ix_pull_requests_provider", "pull_requests", ["provider"])
    op.alter_column("pull_requests", "github_id", existing_type=sa.BigInteger(), nullable=True)

    # ── workflow_runs ────────────────────────────────────────────────────────
    op.add_column(
        "workflow_runs",
        sa.Column("provider", sa.String(20), nullable=False, server_default="github"),
    )
    op.create_index("ix_workflow_runs_provider", "workflow_runs", ["provider"])
    op.alter_column("workflow_runs", "github_run_id", existing_type=sa.BigInteger(), nullable=True)

    # ── commits ──────────────────────────────────────────────────────────────
    op.add_column(
        "commits",
        sa.Column("provider", sa.String(20), nullable=False, server_default="github"),
    )
    op.create_index("ix_commits_provider", "commits", ["provider"])
    # Widen sha column to 64 chars to accommodate GitLab's 40-char hex SHAs (same, but future-proof)
    op.alter_column(
        "commits",
        "sha",
        existing_type=sa.String(40),
        type_=sa.String(64),
        existing_nullable=False,
    )

    # ── sync_jobs ─────────────────────────────────────────────────────────────
    op.add_column(
        "sync_jobs",
        sa.Column("provider", sa.String(20), nullable=False, server_default="github"),
    )
    op.create_index("ix_sync_jobs_provider", "sync_jobs", ["provider"])


def downgrade() -> None:
    op.drop_index("ix_sync_jobs_provider", table_name="sync_jobs")
    op.drop_column("sync_jobs", "provider")

    op.alter_column("commits", "sha", existing_type=sa.String(64), type_=sa.String(40), existing_nullable=False)
    op.drop_index("ix_commits_provider", table_name="commits")
    op.drop_column("commits", "provider")

    op.alter_column("workflow_runs", "github_run_id", existing_type=sa.BigInteger(), nullable=False)
    op.drop_index("ix_workflow_runs_provider", table_name="workflow_runs")
    op.drop_column("workflow_runs", "provider")

    op.alter_column("pull_requests", "github_id", existing_type=sa.BigInteger(), nullable=False)
    op.drop_index("ix_pull_requests_provider", table_name="pull_requests")
    op.drop_column("pull_requests", "provider")

    op.drop_index("uq_repositories_full_name_provider", table_name="repositories")
    op.create_index("ix_repositories_full_name", "repositories", ["full_name"], unique=True)
    op.alter_column("repositories", "github_id", existing_type=sa.BigInteger(), nullable=False)
    op.drop_index("ix_repositories_provider", table_name="repositories")
    op.drop_column("repositories", "provider")

    op.drop_index("ix_users_gitlab_id", table_name="users")
    op.drop_column("users", "gitlab_token")
    op.drop_column("users", "gitlab_id")
    op.alter_column("users", "github_token", existing_type=sa.Text(), nullable=False)
    op.alter_column("users", "github_id", existing_type=sa.Integer(), nullable=False)
