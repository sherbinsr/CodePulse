"""Settings Router: Manage user preferences and OpenAI API integration."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.settings import (
    UserSettingsOut,
    UserSettingsUpdate,
    VerifyOpenAIKeyRequest,
    VerifyOpenAIKeyResponse,
)
from app.services.security_service import SecurityService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/settings", tags=["Settings"])


def mask_api_key(key: Optional[str]) -> Optional[str]:
    """Mask an API key for safe display (e.g. sk-...a1b2)."""
    if not key:
        return None
    trimmed = key.strip()
    if len(trimmed) <= 8:
        return "sk-****"
    return f"{trimmed[:5]}...{trimmed[-4:]}"


@router.get("", response_model=UserSettingsOut)
async def get_user_settings(
    current_user: User = Depends(get_current_user),
):
    """Retrieve user settings including OpenAI key status."""
    has_key = bool(current_user.openai_api_key and current_user.openai_api_key.strip())
    masked = mask_api_key(current_user.openai_api_key) if has_key else None
    return UserSettingsOut(
        has_openai_key=has_key,
        openai_key_masked=masked,
        openai_model=current_user.openai_model or "gpt-4o-mini",
    )


@router.post("", response_model=UserSettingsOut)
async def update_user_settings(
    payload: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user OpenAI API key and preferred model."""
    if payload.openai_api_key is not None:
        key_val = payload.openai_api_key.strip() if payload.openai_api_key else None
        current_user.openai_api_key = key_val

    if payload.openai_model is not None:
        current_user.openai_model = payload.openai_model.strip() or "gpt-4o-mini"

    await db.commit()
    await db.refresh(current_user)

    has_key = bool(current_user.openai_api_key and current_user.openai_api_key.strip())
    masked = mask_api_key(current_user.openai_api_key) if has_key else None
    return UserSettingsOut(
        has_openai_key=has_key,
        openai_key_masked=masked,
        openai_model=current_user.openai_model or "gpt-4o-mini",
    )


@router.post("/verify-openai", response_model=VerifyOpenAIKeyResponse)
async def verify_openai_key(
    payload: VerifyOpenAIKeyRequest,
    current_user: User = Depends(get_current_user),
):
    """Live verification of an OpenAI API key."""
    res = await SecurityService.verify_openai_key(payload.openai_api_key)
    return VerifyOpenAIKeyResponse(valid=res["valid"], message=res["message"])
