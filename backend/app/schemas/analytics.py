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


class CISummaryOut(BaseModel):
    repo: str
    name: str
    total_runs: int
    successful_runs: int
    failed_runs: int
    first_try_pass_rate: float
    overall_pass_rate: float
    avg_duration_seconds: Optional[float]


class BuildTrendOut(BaseModel):
    week: str
    repo_name: str
    avg_duration_seconds: float
    run_count: int


class FlakyWorkflowOut(BaseModel):
    workflow_name: str
    repo_name: str
    flaky_count: int
    total_runs: int
    flakiness_rate: float


class CommitActivityOut(BaseModel):
    author_login: str
    author_avatar: Optional[str]
    total_commits: int
    active_days: int
    commits_per_active_day: float
    after_hours_commits: int
    weekend_commits: int
    after_hours_pct: float
    weekend_pct: float
    repos_contributed: int


class CodeChurnOut(BaseModel):
    week: str
    repo_name: str
    total_commits: int
    unique_authors: int


class DigestContributorOut(BaseModel):
    login: str
    avatar_url: Optional[str]
    total_prs: int
    merged_prs: int
    reviews_given: int


class DigestRepoOut(BaseModel):
    name: str
    total_prs: int
    merged_prs: int
    merge_rate: float


class DigestOut(BaseModel):
    org: str
    period_label: str
    since: str
    until: str
    total_prs: int
    merged_prs: int
    open_prs: int
    merge_rate: float
    avg_merge_hours: Optional[float]
    avg_review_hours: Optional[float]
    unique_contributors: int
    total_reviews: int
    top_contributors: list[DigestContributorOut]
    top_repos: list[DigestRepoOut]
