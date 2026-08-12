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
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # ── users ──────────────────────────────────────────────────────────────
    if inspector.has_table("users"):
        user_cols = [c["name"] for c in inspector.get_columns("users")]
        user_indexes = [i["name"] for i in inspector.get_indexes("users")]
        try:
            op.alter_column("users", "github_id", existing_type=sa.Integer(), nullable=True)
            op.alter_column("users", "github_token", existing_type=sa.Text(), nullable=True)
        except Exception:
            pass
        if "gitlab_id" not in user_cols:
            try:
                op.add_column("users", sa.Column("gitlab_id", sa.Integer(), nullable=True))
            except Exception:
                pass
        if "gitlab_token" not in user_cols:
            try:
                op.add_column("users", sa.Column("gitlab_token", sa.Text(), nullable=True))
            except Exception:
                pass
        if "ix_users_gitlab_id" not in user_indexes:
            try:
                op.create_index("ix_users_gitlab_id", "users", ["gitlab_id"], unique=True, if_not_exists=True)
            except Exception:
                pass

    # ── repositories ───────────────────────────────────────────────────────
    if inspector.has_table("repositories"):
        repo_cols = [c["name"] for c in inspector.get_columns("repositories")]
        repo_indexes = [i["name"] for i in inspector.get_indexes("repositories")]
        repo_constraints = [c["name"] for c in inspector.get_unique_constraints("repositories")]

        if "provider" not in repo_cols:
            try:
                op.add_column(
                    "repositories",
                    sa.Column("provider", sa.String(20), nullable=False, server_default="github"),
                )
            except Exception:
                pass
        if "ix_repositories_provider" not in repo_indexes:
            try:
                op.create_index("ix_repositories_provider", "repositories", ["provider"], if_not_exists=True)
            except Exception:
                pass
        try:
            op.alter_column("repositories", "github_id", existing_type=sa.BigInteger(), nullable=True)
        except Exception:
            pass
        if "ix_repositories_github_id" in repo_indexes:
            try:
                op.drop_index("ix_repositories_github_id", table_name="repositories")
            except Exception:
                pass
        try:
            op.create_index("ix_repositories_github_id", "repositories", ["github_id"], if_not_exists=True)
        except Exception:
            pass

        if "ix_repositories_full_name" in repo_indexes:
            try:
                op.drop_index("ix_repositories_full_name", table_name="repositories")
            except Exception:
                pass
        try:
            op.create_index("ix_repositories_full_name", "repositories", ["full_name"], if_not_exists=True)
        except Exception:
            pass

        if "uq_repositories_full_name_provider" not in repo_constraints:
            try:
                op.create_unique_constraint(
                    "uq_repositories_full_name_provider",
                    "repositories",
                    ["full_name", "provider"],
                )
            except Exception:
                pass

    # ── pull_requests ───────────────────────────────────────────────────────
    if inspector.has_table("pull_requests"):
        pr_cols = [c["name"] for c in inspector.get_columns("pull_requests")]
        pr_indexes = [i["name"] for i in inspector.get_indexes("pull_requests")]
        if "provider" not in pr_cols:
            try:
                op.add_column(
                    "pull_requests",
                    sa.Column("provider", sa.String(20), nullable=False, server_default="github"),
                )
            except Exception:
                pass
        if "ix_pull_requests_provider" not in pr_indexes:
            try:
                op.create_index("ix_pull_requests_provider", "pull_requests", ["provider"], if_not_exists=True)
            except Exception:
                pass
        try:
            op.alter_column("pull_requests", "github_id", existing_type=sa.BigInteger(), nullable=True)
        except Exception:
            pass

    # ── workflow_runs ────────────────────────────────────────────────────────
    if inspector.has_table("workflow_runs"):
        wf_cols = [c["name"] for c in inspector.get_columns("workflow_runs")]
        wf_indexes = [i["name"] for i in inspector.get_indexes("workflow_runs")]
        if "provider" not in wf_cols:
            try:
                op.add_column(
                    "workflow_runs",
                    sa.Column("provider", sa.String(20), nullable=False, server_default="github"),
                )
            except Exception:
                pass
        if "ix_workflow_runs_provider" not in wf_indexes:
            try:
                op.create_index("ix_workflow_runs_provider", "workflow_runs", ["provider"], if_not_exists=True)
            except Exception:
                pass
        try:
            op.alter_column("workflow_runs", "github_run_id", existing_type=sa.BigInteger(), nullable=True)
        except Exception:
            pass

    # ── commits ──────────────────────────────────────────────────────────────
    if inspector.has_table("commits"):
        cm_cols = [c["name"] for c in inspector.get_columns("commits")]
        cm_indexes = [i["name"] for i in inspector.get_indexes("commits")]
        if "provider" not in cm_cols:
            try:
                op.add_column(
                    "commits",
                    sa.Column("provider", sa.String(20), nullable=False, server_default="github"),
                )
            except Exception:
                pass
        if "ix_commits_provider" not in cm_indexes:
            try:
                op.create_index("ix_commits_provider", "commits", ["provider"], if_not_exists=True)
            except Exception:
                pass
        try:
            op.alter_column(
                "commits",
                "sha",
                existing_type=sa.String(40),
                type_=sa.String(64),
                existing_nullable=False,
            )
        except Exception:
            pass

    # ── sync_jobs ─────────────────────────────────────────────────────────────
    if inspector.has_table("sync_jobs"):
        sj_cols = [c["name"] for c in inspector.get_columns("sync_jobs")]
        sj_indexes = [i["name"] for i in inspector.get_indexes("sync_jobs")]
        if "provider" not in sj_cols:
            try:
                op.add_column(
                    "sync_jobs",
                    sa.Column("provider", sa.String(20), nullable=False, server_default="github"),
                )
            except Exception:
                pass
        if "ix_sync_jobs_provider" not in sj_indexes:
            try:
                op.create_index("ix_sync_jobs_provider", "sync_jobs", ["provider"], if_not_exists=True)
            except Exception:
                pass



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

    op.drop_constraint("uq_repositories_full_name_provider", "repositories", type_="unique")
    op.drop_index("ix_repositories_full_name", table_name="repositories")
    op.create_index("ix_repositories_full_name", "repositories", ["full_name"], unique=True)
    op.drop_index("ix_repositories_github_id", table_name="repositories")
    op.create_index("ix_repositories_github_id", "repositories", ["github_id"], unique=True)
    op.alter_column("repositories", "github_id", existing_type=sa.BigInteger(), nullable=False)
    op.drop_index("ix_repositories_provider", table_name="repositories")
    op.drop_column("repositories", "provider")

    op.drop_index("ix_users_gitlab_id", table_name="users")
    op.drop_column("users", "gitlab_token")
    op.drop_column("users", "gitlab_id")
    op.alter_column("users", "github_token", existing_type=sa.Text(), nullable=False)
    op.alter_column("users", "github_id", existing_type=sa.Integer(), nullable=False)
