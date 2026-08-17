"""Finalize schema and drop legacy tables and columns

Revision ID: 009
Revises: 008
Create Date: 2026-08-17
"""
import sqlalchemy as sa
from alembic import op

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # 1. Drop legacy column issue_id from project_tasks if present
    if inspector.has_table("project_tasks"):
        task_cols = [c["name"] for c in inspector.get_columns("project_tasks")]
        if "issue_id" in task_cols:
            try:
                op.drop_constraint("project_tasks_issue_id_fkey", "project_tasks", type_="foreignkey")
            except Exception:
                pass
            op.drop_column("project_tasks", "issue_id")

    # 2. Drop legacy github project and issue tables if present
    if inspector.has_table("github_project_items"):
        op.drop_table("github_project_items")

    if inspector.has_table("github_projects"):
        op.drop_table("github_projects")

    if inspector.has_table("github_issues"):
        op.drop_table("github_issues")


def downgrade() -> None:
    pass
