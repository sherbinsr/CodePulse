import logging
from datetime import datetime, timedelta

from fastapi import HTTPException
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.repositories.user_repository import UserRepository
from app.schemas.auth import AuthResponse, UserOut
from app.services.github_service import GitHubService

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    def create_token(self, user_id: int, login: str) -> str:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
        return jwt.encode(
            {"sub": str(user_id), "login": login, "exp": expire},
            settings.secret_key,
            algorithm=settings.algorithm,
        )

    def decode_token(self, token: str) -> dict:
        try:
            return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        except JWTError as exc:
            logger.warning("JWT decode failed: %s", exc)
            raise HTTPException(status_code=401, detail="Invalid or expired token") from exc

    async def github_callback(self, code: str) -> AuthResponse:
        logger.info("GitHub OAuth callback received")
        try:
            access_token = await GitHubService.exchange_code(code)
        except ValueError as exc:
            logger.error("GitHub OAuth code exchange failed: %s", exc)
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except Exception as exc:
            logger.error("GitHub OAuth code exchange error: %s", exc)
            raise HTTPException(status_code=400, detail="GitHub OAuth failed") from exc

        gh = GitHubService(access_token)
        gh_user = await gh.get_authenticated_user()
        logger.debug("GitHub user authenticated: %s", gh_user.get("login"))

        user = await self.user_repo.get_by_github_id(gh_user["id"])
        if user is None:
            logger.info("Creating new user: %s", gh_user["login"])
            user = await self.user_repo.create(
                github_id=gh_user["id"],
                login=gh_user["login"],
                name=gh_user.get("name"),
                email=gh_user.get("email"),
                avatar_url=gh_user.get("avatar_url"),
                github_token=access_token,
            )
        else:
            logger.info("Updating existing user: %s", gh_user["login"])
            user = await self.user_repo.update(
                user,
                github_token=access_token,
                name=gh_user.get("name"),
                avatar_url=gh_user.get("avatar_url"),
            )

        token = self.create_token(user.id, user.login)
        logger.info("Auth token issued for user: %s", user.login)
        return AuthResponse(access_token=token, user=UserOut.model_validate(user))

    async def get_current_user_by_token(self, token: str):
        payload = self.decode_token(token)
        user = await self.user_repo.get_by_id(int(payload["sub"]))
        if not user:
            logger.warning("Token valid but user id=%s not found in DB", payload.get("sub"))
            raise HTTPException(status_code=401, detail="User not found")
        logger.debug("Authenticated user: %s", user.login)
        return user
