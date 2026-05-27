from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.auth import AuthCallbackRequest, AuthResponse, UserOut
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/github/callback", response_model=AuthResponse)
async def github_callback(
    body: AuthCallbackRequest,
    db: AsyncSession = Depends(get_db),
):
    """Exchange GitHub OAuth code for a JWT."""
    return await AuthService(db).github_callback(body.code)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return current_user
