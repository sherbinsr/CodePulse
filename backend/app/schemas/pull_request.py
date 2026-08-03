from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class PullRequestOut(BaseModel):
    id: int
    number: int
    repo: str
    title: str
    body: Optional[str] = None
    head_branch: Optional[str] = None
    base_branch: Optional[str] = None
    action_file: Optional[str] = None
    action_status: Optional[str] = None
    action_name: Optional[str] = None
    action_file_content: Optional[str] = None
    state: str
    author: str
    author_avatar: Optional[str]
    additions: int
    deletions: int
    changed_files: int
    reviews_count: int
    time_to_merge_hours: Optional[float]
    time_to_first_review_hours: Optional[float]
    created_at: datetime
    merged_at: Optional[datetime]
    closed_at: Optional[datetime]


class PRListResponse(BaseModel):
    data: list[PullRequestOut]
    total: int
    limit: int
    offset: int
