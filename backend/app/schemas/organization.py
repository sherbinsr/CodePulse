from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class OrgOut(BaseModel):
    login: str
    avatar_url: Optional[str]
    description: Optional[str]


class SyncTriggerResponse(BaseModel):
    job_id: int
    status: str
    message: str


class SyncStatusOut(BaseModel):
    status: str
    job_id: Optional[int] = None
    repos_synced: Optional[int] = None
    prs_synced: Optional[int] = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
