from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: int) -> Optional[User]:
        return await self.db.get(User, user_id)

    async def get_by_github_id(self, github_id: int) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.github_id == github_id))
        return result.scalar_one_or_none()

    async def get_by_login(self, login: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.login == login))
        return result.scalar_one_or_none()

    async def create(self, **kwargs) -> User:
        user = User(**kwargs)
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update(self, user: User, **kwargs) -> User:
        for key, value in kwargs.items():
            setattr(user, key, value)
        await self.db.commit()
        await self.db.refresh(user)
        return user
