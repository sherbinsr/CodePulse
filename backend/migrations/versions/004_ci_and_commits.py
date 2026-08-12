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
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("workflow_runs"):
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
        try:
            op.create_index("ix_workflow_runs_repo_full_name", "workflow_runs", ["repo_full_name"], if_not_exists=True)
            op.create_index("ix_workflow_runs_org", "workflow_runs", ["org"], if_not_exists=True)
            op.create_index("ix_workflow_runs_created_at", "workflow_runs", ["created_at"], if_not_exists=True)
        except Exception:
            pass
    else:
        wf_indexes = [idx["name"] for idx in inspector.get_indexes("workflow_runs")]
        if "ix_workflow_runs_repo_full_name" not in wf_indexes:
            try:
                op.create_index("ix_workflow_runs_repo_full_name", "workflow_runs", ["repo_full_name"], if_not_exists=True)
            except Exception:
                pass
        if "ix_workflow_runs_org" not in wf_indexes:
            try:
                op.create_index("ix_workflow_runs_org", "workflow_runs", ["org"], if_not_exists=True)
            except Exception:
                pass
        if "ix_workflow_runs_created_at" not in wf_indexes:
            try:
                op.create_index("ix_workflow_runs_created_at", "workflow_runs", ["created_at"], if_not_exists=True)
            except Exception:
                pass

    if not inspector.has_table("commits"):
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
        try:
            op.create_index("ix_commits_repo_full_name", "commits", ["repo_full_name"], if_not_exists=True)
            op.create_index("ix_commits_org", "commits", ["org"], if_not_exists=True)
            op.create_index("ix_commits_author_login", "commits", ["author_login"], if_not_exists=True)
            op.create_index("ix_commits_committed_at", "commits", ["committed_at"], if_not_exists=True)
        except Exception:
            pass
    else:
        cm_indexes = [idx["name"] for idx in inspector.get_indexes("commits")]
        if "ix_commits_repo_full_name" not in cm_indexes:
            try:
                op.create_index("ix_commits_repo_full_name", "commits", ["repo_full_name"], if_not_exists=True)
            except Exception:
                pass
        if "ix_commits_org" not in cm_indexes:
            try:
                op.create_index("ix_commits_org", "commits", ["org"], if_not_exists=True)
            except Exception:
                pass
        if "ix_commits_author_login" not in cm_indexes:
            try:
                op.create_index("ix_commits_author_login", "commits", ["author_login"], if_not_exists=True)
            except Exception:
                pass
        if "ix_commits_committed_at" not in cm_indexes:
            try:
                op.create_index("ix_commits_committed_at", "commits", ["committed_at"], if_not_exists=True)
            except Exception:
                pass



def downgrade() -> None:
    op.drop_table("workflow_runs")
    op.drop_table("commits")
