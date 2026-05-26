from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.services.github import GitHubClient

router = APIRouter(prefix="/auth", tags=["auth"])


def create_jwt(user_id: int, login: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode(
        {"sub": str(user_id), "login": login, "exp": expire},
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("/github/callback")
async def github_callback(payload: dict, db: AsyncSession = Depends(get_db)):
    """Exchange GitHub OAuth code for a JWT. Called by frontend with {code}."""
    code = payload.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")

    client = GitHubClient(token="")
    try:
        access_token = await client.exchange_code_for_token(code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    gh = GitHubClient(access_token)
    gh_user = await gh.get_authenticated_user()

    result = await db.execute(select(User).where(User.github_id == gh_user["id"]))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            github_id=gh_user["id"],
            login=gh_user["login"],
            name=gh_user.get("name"),
            email=gh_user.get("email"),
            avatar_url=gh_user.get("avatar_url"),
            github_token=access_token,
        )
        db.add(user)
    else:
        user.github_token = access_token
        user.name = gh_user.get("name")
        user.avatar_url = gh_user.get("avatar_url")

    await db.commit()
    await db.refresh(user)

    token = create_jwt(user.id, user.login)
    return {
        "access_token": token,
        "user": {
            "id": user.id,
            "login": user.login,
            "name": user.name,
            "avatar_url": user.avatar_url,
        },
    }


@router.get("/me")
async def get_me(token: str, db: AsyncSession = Depends(get_db)):
    payload = decode_jwt(token)
    result = await db.execute(select(User).where(User.id == int(payload["sub"])))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "login": user.login,
        "name": user.name,
        "avatar_url": user.avatar_url,
    }
