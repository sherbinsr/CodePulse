"""Documentation Service: Logic for creating, fetching, and syncing documentation files."""

import base64
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.documentation import Documentation
from app.models.repository import Repository
from app.models.user import User
from app.services.github_service import GitHubService
from app.services.gitlab_service import GitLabService
from app.services.s3_service import S3Service

logger = logging.getLogger(__name__)
s3_service = S3Service()


def encode_s3_key(owner: str, repo: str, file_name: str) -> str:
    """Encode file_name to base64 url-safe string for S3 key storage."""
    encoded_name = base64.urlsafe_b64encode(file_name.encode("utf-8")).decode("utf-8").rstrip("=")
    ext = ("." + file_name.rsplit(".", 1)[-1]) if "." in file_name else ""
    return f"docs/{owner}/{repo}/{encoded_name}{ext}"


async def fetch_and_save_repo_docs_folder(
    db: AsyncSession,
    repo: Repository,
    user: Optional[User] = None,
    custom_token: Optional[str] = None,
) -> list[Documentation]:
    """Fetch documentation files inside docs/ folder of a repository and persist to S3 and PostgreSQL."""
    owner = repo.owner
    name = repo.name
    provider = repo.provider or "github"
    default_branch = repo.default_branch or "main"

    token = custom_token
    if not token and user:
        token = user.gitlab_token if provider == "gitlab" else user.github_token

    token = token or ""

    docs_fetched = []
    if provider == "gitlab":
        gl_service = GitLabService(token)
        project_id = repo.github_id or repo.id
        docs_fetched = await gl_service.fetch_repo_docs_folder(project_id, default_branch)
    else:
        gh_service = GitHubService(token)
        docs_fetched = await gh_service.fetch_repo_docs_folder(owner, name, default_branch)

    saved_docs = []
    for d in docs_fetched:
        file_name = d["file_name"]
        file_type = d["file_type"]
        content = d["content"]

        s3_key = encode_s3_key(owner, name, file_name)
        content_type = "text/markdown; charset=utf-8" if file_type == "markdown" else "text/plain; charset=utf-8"
        s3_res = s3_service.upload_file(key=s3_key, content=content, content_type=content_type)

        stmt_existing = select(Documentation).where(
            Documentation.repository_id == repo.id,
            Documentation.file_name == file_name,
        )
        res_existing = await db.execute(stmt_existing)
        existing_doc = res_existing.scalar_one_or_none()

        if existing_doc:
            existing_doc.content = content
            existing_doc.file_type = file_type
            existing_doc.s3_bucket = s3_res["s3_bucket"]
            existing_doc.s3_key = s3_res["s3_key"]
            existing_doc.s3_url = s3_res["s3_url"]
            existing_doc.source = "docs_folder"
            doc = existing_doc
        else:
            doc = Documentation(
                repository_id=repo.id,
                file_name=file_name,
                file_type=file_type,
                s3_bucket=s3_res["s3_bucket"],
                s3_key=s3_res["s3_key"],
                s3_url=s3_res["s3_url"],
                content=content,
                source="docs_folder",
            )
            db.add(doc)

        saved_docs.append(doc)

    await db.commit()
    for doc in saved_docs:
        await db.refresh(doc)

    logger.info("Synced %d docs from docs/ folder for repo %s", len(saved_docs), repo.full_name)
    return saved_docs
