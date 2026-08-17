from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class DocumentationOut(BaseModel):
    id: int
    repository_id: int
    file_name: str
    file_type: str
    s3_bucket: str
    s3_key: str
    s3_url: Optional[str] = None
    content: Optional[str] = None
    source: str = "manual"
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RepositoryWithDocsOut(BaseModel):
    id: int
    name: str
    full_name: str
    owner: str
    provider: str
    description: Optional[str] = None
    language: Optional[str] = None
    stars: int = 0
    forks: int = 0
    synced_at: Optional[datetime] = None
    has_documentation: bool = False
    documentations: list[DocumentationOut] = Field(default_factory=list)

    class Config:
        from_attributes = True


class CreateDocumentationReq(BaseModel):
    file_name: str
    file_type: str = "markdown"
    content: str
    source: str = "manual"


class UpdateDocumentationReq(BaseModel):
    file_name: Optional[str] = None
    content: Optional[str] = None


class ReleaseOut(BaseModel):
    id: int
    tag_name: str
    name: Optional[str] = None
    body: Optional[str] = None
    draft: bool = False
    prerelease: bool = False
    created_at: Optional[str] = None
    published_at: Optional[str] = None
    html_url: str
    author_login: Optional[str] = None
    author_avatar: Optional[str] = None

