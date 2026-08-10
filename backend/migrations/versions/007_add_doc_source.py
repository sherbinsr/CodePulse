"""Add source column to documentations table

Revision ID: 007
Revises: 006
Create Date: 2026-08-08
"""
import sqlalchemy as sa
from alembic import op

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "documentations",
        sa.Column("source", sa.String(50), nullable=False, server_default="manual"),
    )


def downgrade() -> None:
    op.drop_column("documentations", "source")
