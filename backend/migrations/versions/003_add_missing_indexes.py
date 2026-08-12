"""add missing indexes on github_id, pr_reviews.repo_full_name, pr_reviews.submitted_at

Revision ID: 003
Revises: 002
Create Date: 2026-05-27
"""
import sqlalchemy as sa
from alembic import op

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("pull_requests"):
        pr_indexes = [idx["name"] for idx in inspector.get_indexes("pull_requests")]
        if "ix_pull_requests_github_id" not in pr_indexes:
            try:
                op.create_index("ix_pull_requests_github_id", "pull_requests", ["github_id"], if_not_exists=True)
            except Exception:
                pass

    if inspector.has_table("pr_reviews"):
        review_indexes = [idx["name"] for idx in inspector.get_indexes("pr_reviews")]
        if "ix_pr_reviews_repo_full_name" not in review_indexes:
            try:
                op.create_index("ix_pr_reviews_repo_full_name", "pr_reviews", ["repo_full_name"], if_not_exists=True)
            except Exception:
                pass
        if "ix_pr_reviews_submitted_at" not in review_indexes:
            try:
                op.create_index("ix_pr_reviews_submitted_at", "pr_reviews", ["submitted_at"], if_not_exists=True)
            except Exception:
                pass


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("pr_reviews"):
        review_indexes = [idx["name"] for idx in inspector.get_indexes("pr_reviews")]
        if "ix_pr_reviews_submitted_at" in review_indexes:
            try:
                op.drop_index("ix_pr_reviews_submitted_at", table_name="pr_reviews")
            except Exception:
                pass
        if "ix_pr_reviews_repo_full_name" in review_indexes:
            try:
                op.drop_index("ix_pr_reviews_repo_full_name", table_name="pr_reviews")
            except Exception:
                pass

    if inspector.has_table("pull_requests"):
        pr_indexes = [idx["name"] for idx in inspector.get_indexes("pull_requests")]
        if "ix_pull_requests_github_id" in pr_indexes:
            try:
                op.drop_index("ix_pull_requests_github_id", table_name="pull_requests")
            except Exception:
                pass

