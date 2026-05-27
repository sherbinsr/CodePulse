"""Replace separate unique constraints with unique indexes on repositories and users

Revision ID: 005
Revises: 004
Create Date: 2026-05-27
"""
import sqlalchemy as sa
from alembic import op

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # repositories: drop separate unique constraints + non-unique indexes,
    # recreate as unique indexes to match model declarations
    op.drop_constraint("repositories_full_name_key", "repositories", type_="unique")
    op.drop_constraint("repositories_github_id_key", "repositories", type_="unique")
    op.drop_index("ix_repositories_full_name", table_name="repositories")
    op.create_index("ix_repositories_full_name", "repositories", ["full_name"], unique=True)
    # ix_repositories_github_id was created as non-unique in 003; drop and recreate unique
    op.drop_index("ix_repositories_github_id", table_name="repositories")
    op.create_index("ix_repositories_github_id", "repositories", ["github_id"], unique=True)

    # users: same pattern
    op.drop_constraint("users_github_id_key", "users", type_="unique")
    op.drop_constraint("users_login_key", "users", type_="unique")
    op.drop_index("ix_users_github_id", table_name="users")
    op.drop_index("ix_users_login", table_name="users")
    op.create_index("ix_users_github_id", "users", ["github_id"], unique=True)
    op.create_index("ix_users_login", "users", ["login"], unique=True)


def downgrade() -> None:
    # Restore non-unique indexes and separate unique constraints
    op.drop_index("ix_users_login", table_name="users")
    op.drop_index("ix_users_github_id", table_name="users")
    op.create_index("ix_users_login", "users", ["login"])
    op.create_index("ix_users_github_id", "users", ["github_id"])
    op.create_unique_constraint("users_login_key", "users", ["login"])
    op.create_unique_constraint("users_github_id_key", "users", ["github_id"])

    op.drop_index("ix_repositories_github_id", table_name="repositories")
    op.drop_index("ix_repositories_full_name", table_name="repositories")
    op.create_index("ix_repositories_github_id", "repositories", ["github_id"])
    op.create_index("ix_repositories_full_name", "repositories", ["full_name"])
    op.create_unique_constraint("repositories_github_id_key", "repositories", ["github_id"])
    op.create_unique_constraint("repositories_full_name_key", "repositories", ["full_name"])
