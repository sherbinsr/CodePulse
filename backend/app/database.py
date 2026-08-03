from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

engine = create_async_engine(settings.database_url, echo=False, pool_pre_ping=True)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


from sqlalchemy import text

async def init_db():
    import app.models  # noqa: F401 — registers all models with Base.metadata

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Auto-migrate new columns for repo_projects and project_tasks
        try:
            await conn.execute(text("ALTER TABLE repo_projects ADD COLUMN IF NOT EXISTS key_prefix VARCHAR(20)"))
        except Exception:
            try:
                await conn.execute(text("ALTER TABLE repo_projects ADD COLUMN key_prefix VARCHAR(20)"))
            except Exception:
                pass

        try:
            await conn.execute(text("ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS ticket_key VARCHAR(50)"))
        except Exception:
            try:
                await conn.execute(text("ALTER TABLE project_tasks ADD COLUMN ticket_key VARCHAR(50)"))
            except Exception:
                pass

        # Auto-migrate pull_requests table columns
        pr_cols = [
            ("body", "TEXT"),
            ("head_branch", "VARCHAR(255)"),
            ("base_branch", "VARCHAR(255)"),
            ("action_file", "VARCHAR(255)"),
            ("action_status", "VARCHAR(50)"),
            ("action_name", "VARCHAR(255)"),
            ("action_file_content", "TEXT"),
        ]
        for col, col_type in pr_cols:
            try:
                await conn.execute(text(f"ALTER TABLE pull_requests ADD COLUMN IF NOT EXISTS {col} {col_type}"))
            except Exception:
                try:
                    await conn.execute(text(f"ALTER TABLE pull_requests ADD COLUMN {col} {col_type}"))
                except Exception:
                    pass

