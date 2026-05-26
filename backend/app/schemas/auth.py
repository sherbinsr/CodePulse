from typing import Optional
from pydantic import BaseModel


class AuthCallbackRequest(BaseModel):
    code: str


class UserOut(BaseModel):
    id: int
    login: str
    name: Optional[str]
    avatar_url: Optional[str]

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
