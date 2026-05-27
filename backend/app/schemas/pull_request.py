from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class PullRequestOut(BaseModel):
    id: int
    number: int
    repo: str
    title: str
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
