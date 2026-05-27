"""add missing indexes on github_id, pr_reviews.repo_full_name, pr_reviews.submitted_at

Revision ID: 003
Revises: 002
Create Date: 2026-05-27
"""
from alembic import op

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_pull_requests_github_id", "pull_requests", ["github_id"])
    op.create_index("ix_pr_reviews_repo_full_name", "pr_reviews", ["repo_full_name"])
    op.create_index("ix_pr_reviews_submitted_at", "pr_reviews", ["submitted_at"])


def downgrade() -> None:
    op.drop_index("ix_pr_reviews_submitted_at", table_name="pr_reviews")
    op.drop_index("ix_pr_reviews_repo_full_name", table_name="pr_reviews")
    op.drop_index("ix_pull_requests_github_id", table_name="pull_requests")
