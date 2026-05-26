"""change github_id columns to bigint

Revision ID: 002
Revises: 001
Create Date: 2026-05-26
"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column("pull_requests", "github_id",
                    existing_type=sa.Integer(),
                    type_=sa.BigInteger(),
                    existing_nullable=False)
    op.alter_column("repositories", "github_id",
                    existing_type=sa.Integer(),
                    type_=sa.BigInteger(),
                    existing_nullable=False)


def downgrade():
    op.alter_column("repositories", "github_id",
                    existing_type=sa.BigInteger(),
                    type_=sa.Integer(),
                    existing_nullable=False)
    op.alter_column("pull_requests", "github_id",
                    existing_type=sa.BigInteger(),
                    type_=sa.Integer(),
                    existing_nullable=False)
