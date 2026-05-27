from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Commit(Base):
    __tablename__ = "commits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sha: Mapped[str] = mapped_column(String(40), nullable=False)
    repo_full_name: Mapped[str] = mapped_column(String(512), index=True, nullable=False)
    org: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    author_login: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    author_avatar: Mapped[Optional[str]] = mapped_column(Text)
    author_name: Mapped[str] = mapped_column(String(255), nullable=False)
    committed_at: Mapped[datetime] = mapped_column(DateTime, index=True, nullable=False)
    synced_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
