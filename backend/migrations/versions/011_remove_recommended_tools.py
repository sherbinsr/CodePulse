"""Remove recommended_tools column from vulnerability_scans.

Revision ID: 011
Revises: 010
Create Date: 2026-08-17
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("vulnerability_scans", "recommended_tools")


def downgrade() -> None:
    op.add_column("vulnerability_scans", sa.Column("recommended_tools", sa.JSON(), nullable=True))
