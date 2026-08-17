from typing import Optional

from pydantic import BaseModel


class UserSettingsOut(BaseModel):
    has_openai_key: bool
    openai_key_masked: Optional[str] = None
    openai_model: str = "gpt-4o-mini"


class UserSettingsUpdate(BaseModel):
    openai_api_key: Optional[str] = None
    openai_model: Optional[str] = None


class VerifyOpenAIKeyRequest(BaseModel):
    openai_api_key: str


class VerifyOpenAIKeyResponse(BaseModel):
    valid: bool
    message: str
