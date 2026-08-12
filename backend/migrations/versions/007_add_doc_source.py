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
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("documentations"):
        cols = [c["name"] for c in inspector.get_columns("documentations")]
        if "source" not in cols:
            op.add_column(
                "documentations",
                sa.Column("source", sa.String(50), nullable=False, server_default="manual"),
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("documentations"):
        cols = [c["name"] for c in inspector.get_columns("documentations")]
        if "source" in cols:
            op.drop_column("documentations", "source")

