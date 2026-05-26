from typing import Optional
from pydantic import BaseModel


class OrgOverviewOut(BaseModel):
    total_repos: int
    total_prs: int
    merged_prs: int
    open_prs: int
    closed_prs: int
    merge_rate: float
    avg_merge_time_hours: Optional[float]
    avg_review_time_hours: Optional[float]
    total_reviews: int
    unique_contributors: int


class DeveloperStatOut(BaseModel):
    login: str
    avatar_url: Optional[str]
    total_prs: int
    merged_prs: int
    open_prs: int
    merge_rate: float
    avg_merge_hours: Optional[float]
    total_additions: int
    total_deletions: int
    reviews_given: int
    approvals: int
    change_requests: int


class RepoStatOut(BaseModel):
    repo: str
    name: str
    total_prs: int
    merged_prs: int
    open_prs: int
    merge_rate: float
    avg_merge_hours: Optional[float]
    avg_review_hours: Optional[float]
    contributors: int


class MonthlyTrendOut(BaseModel):
    month: str
    total_prs: int
    merged_prs: int
    contributors: int


class ReviewNetworkOut(BaseModel):
    pr_author: str
    reviewer: str
    review_count: int
