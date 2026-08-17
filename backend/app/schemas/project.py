from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AssigneeSchema(BaseModel):
    login: str
    avatar_url: Optional[str] = None


class LabelSchema(BaseModel):
    name: str
    color: Optional[str] = "808080"


class ColumnOptionSchema(BaseModel):
    id: str
    name: str


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
