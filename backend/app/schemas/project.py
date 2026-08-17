from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class AssigneeSchema(BaseModel):
    login: str
    avatar_url: Optional[str] = None


class LabelSchema(BaseModel):
    name: str
    color: Optional[str] = "808080"


class IssueOut(BaseModel):
    id: int
    github_id: str
    number: int
    repo_name: str
    owner: str
    title: str
    body: Optional[str] = None
    state: str = "open"
    author_login: str
    author_avatar: Optional[str] = None
    assignees: list[AssigneeSchema] = Field(default_factory=list)
    labels: list[LabelSchema] = Field(default_factory=list)
    milestone: Optional[str] = None
    priority: Optional[str] = None
    comments_count: int = 0
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None


class ProjectItemOut(BaseModel):
    id: int
    github_id: str
    status: str
    status_option_id: Optional[str] = None
    position: int = 0
    issue: IssueOut


class ColumnOptionSchema(BaseModel):
    id: str
    name: str


class ProjectFieldSchema(BaseModel):
    id: str
    name: str
    options: list[ColumnOptionSchema] = Field(default_factory=list)


class ProjectV2Out(BaseModel):
    id: int
    github_id: str
    org: str
    title: str
    number: int
    url: Optional[str] = None
    closed: bool = False
    status_field_id: Optional[str] = None
    columns: list[ColumnOptionSchema] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class ProjectBoardOut(BaseModel):
    project: ProjectV2Out
    items: list[ProjectItemOut] = Field(default_factory=list)


class UpdateItemStatusReq(BaseModel):
    status: str
    status_option_id: Optional[str] = None
    field_id: Optional[str] = None


class CreateIssueReq(BaseModel):
    repo_name: str
    owner: str
    title: str
    body: Optional[str] = ""
    assignees: list[str] = Field(default_factory=list)
    labels: list[str] = Field(default_factory=list)
    milestone: Optional[int] = None
    priority: Optional[str] = None


class UpdateIssueReq(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    state: Optional[str] = None
    assignees: Optional[list[str]] = None
    labels: Optional[list[str]] = None


class CreateCommentReq(BaseModel):
    body: str


class BulkUpdateIssuesReq(BaseModel):
    issue_ids: list[int]
    status: Optional[str] = None
    status_option_id: Optional[str] = None
    state: Optional[str] = None
    assignees: Optional[list[str]] = None
    labels: Optional[list[str]] = None


# ── Built-in Repository Projects & Tasks Schemas ──────────────────────────────

class RepoProjectOut(BaseModel):
    id: int
    org: str
    repo_name: str
    repository_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    key_prefix: Optional[str] = None
    status: str = "active"
    columns: list[ColumnOptionSchema] = Field(default_factory=list)
    tasks_count: int = 0
    created_at: datetime
    updated_at: datetime


class ProjectTaskOut(BaseModel):
    id: int
    project_id: int
    issue_id: Optional[int] = None
    ticket_key: Optional[str] = None
    title: str
    description: Optional[str] = None
    status: str = "Todo"
    priority: str = "Medium"
    assignees: list[AssigneeSchema] = Field(default_factory=list)
    labels: list[LabelSchema] = Field(default_factory=list)
    story_points: int = 1
    due_date: Optional[datetime] = None
    position: int = 0
    issue: Optional[IssueOut] = None
    created_at: datetime
    updated_at: datetime


class RepoProjectBoardOut(BaseModel):
    project: RepoProjectOut
    tasks: list[ProjectTaskOut] = Field(default_factory=list)


class CreateRepoProjectReq(BaseModel):
    name: str
    repo_name: Optional[str] = None
    description: Optional[str] = ""
    key_prefix: Optional[str] = None
    columns: Optional[list[ColumnOptionSchema]] = None




class UpdateRepoProjectReq(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    key_prefix: Optional[str] = None
    status: Optional[str] = None
    columns: Optional[list[ColumnOptionSchema]] = None



class CreateProjectTaskReq(BaseModel):
    title: str
    description: Optional[str] = ""
    status: Optional[str] = "Todo"
    priority: Optional[str] = "Medium"
    assignees: list[str] = Field(default_factory=list)
    labels: list[str] = Field(default_factory=list)
    story_points: Optional[int] = 1



class UpdateProjectTaskReq(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignees: Optional[list[str]] = None
    labels: Optional[list[str]] = None
    story_points: Optional[int] = None

