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
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("repositories"):
        repo_constraints = [c["name"] for c in inspector.get_unique_constraints("repositories")]
        repo_indexes = [i["name"] for i in inspector.get_indexes("repositories")]

        if "repositories_full_name_key" in repo_constraints:
            try:
                op.drop_constraint("repositories_full_name_key", "repositories", type_="unique")
            except Exception:
                pass
        if "ix_repositories_full_name" in repo_indexes:
            try:
                op.drop_index("ix_repositories_full_name", table_name="repositories")
            except Exception:
                pass
        try:
            op.create_index("ix_repositories_full_name", "repositories", ["full_name"], unique=True, if_not_exists=True)
        except Exception:
            pass

        if "repositories_github_id_key" in repo_constraints:
            try:
                op.drop_constraint("repositories_github_id_key", "repositories", type_="unique")
            except Exception:
                pass
        if "ix_repositories_github_id" not in repo_indexes:
            try:
                op.create_index("ix_repositories_github_id", "repositories", ["github_id"], unique=True, if_not_exists=True)
            except Exception:
                pass

    if inspector.has_table("users"):
        user_constraints = [c["name"] for c in inspector.get_unique_constraints("users")]
        user_indexes = [i["name"] for i in inspector.get_indexes("users")]

        if "users_github_id_key" in user_constraints:
            try:
                op.drop_constraint("users_github_id_key", "users", type_="unique")
            except Exception:
                pass
        if "users_login_key" in user_constraints:
            try:
                op.drop_constraint("users_login_key", "users", type_="unique")
            except Exception:
                pass

        if "ix_users_github_id" in user_indexes:
            try:
                op.drop_index("ix_users_github_id", table_name="users")
            except Exception:
                pass
        if "ix_users_login" in user_indexes:
            try:
                op.drop_index("ix_users_login", table_name="users")
            except Exception:
                pass

        try:
            op.create_index("ix_users_github_id", "users", ["github_id"], unique=True, if_not_exists=True)
        except Exception:
            pass
        try:
            op.create_index("ix_users_login", "users", ["login"], unique=True, if_not_exists=True)
        except Exception:
            pass



def downgrade() -> None:
    op.drop_index("ix_users_login", table_name="users")
    op.drop_index("ix_users_github_id", table_name="users")
    op.create_index("ix_users_login", "users", ["login"])
    op.create_index("ix_users_github_id", "users", ["github_id"])
    op.create_unique_constraint("users_login_key", "users", ["login"])
    op.create_unique_constraint("users_github_id_key", "users", ["github_id"])

    op.drop_index("ix_repositories_github_id", table_name="repositories")
    op.drop_index("ix_repositories_full_name", table_name="repositories")
    op.create_index("ix_repositories_full_name", "repositories", ["full_name"])
    op.create_unique_constraint("repositories_github_id_key", "repositories", ["github_id"])
    op.create_unique_constraint("repositories_full_name_key", "repositories", ["full_name"])
