import logging
import mimetypes
import os
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.documentation import Documentation
from app.models.repository import Repository
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.documentation import (
    CreateDocumentationReq,
    DocumentationOut,
    ReleaseOut,
    RepositoryWithDocsOut,
    UpdateDocumentationReq,
)
from app.services.documentation_service import encode_s3_key, fetch_and_save_repo_docs_folder
from app.services.github_service import GitHubService
from app.services.s3_service import S3Service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documentations", tags=["Documentations"])
s3_service = S3Service()


def _encode_s3_key(owner: str, repo: str, file_name: str) -> str:
    """Encode file_name to base64 url-safe string for S3 key storage instead of plain text."""
    return encode_s3_key(owner, repo, file_name)


@router.get("", response_model=list[RepositoryWithDocsOut])
async def list_repositories_with_docs(
    org: str = Query(..., description="Organization or owner name"),
    provider: str = Query("github", pattern="^(github|gitlab)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all repositories for the organization with their associated S3 documentation files."""
    stmt = (
        select(Repository)
        .where(Repository.owner.ilike(org), Repository.provider == provider)
        .options(selectinload(Repository.documentations))
        .order_by(Repository.name.asc())
    )
    result = await db.execute(stmt)
    repos = result.scalars().all()

    output = []
    for repo in repos:
        doc_list = [
            DocumentationOut(
                id=d.id,
                repository_id=d.repository_id,
                file_name=d.file_name,
                file_type=d.file_type,
                s3_bucket=d.s3_bucket,
                s3_key=d.s3_key,
                s3_url=d.s3_url,
                content=d.content,
                source=getattr(d, "source", "manual") or "manual",
                created_at=d.created_at,
                updated_at=d.updated_at,
            )
            for d in repo.documentations
        ]
        output.append(
            RepositoryWithDocsOut(
                id=repo.id,
                name=repo.name,
                full_name=repo.full_name,
                owner=repo.owner,
                provider=repo.provider,
                description=repo.description,
                language=repo.language,
                stars=repo.stars,
                forks=repo.forks,
                synced_at=repo.synced_at,
                has_documentation=len(doc_list) > 0,
                documentations=doc_list,
            )
        )

    return output


@router.get("/{doc_id}/content")
async def get_documentation_content(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve raw file content from S3 for a given documentation ID."""
    stmt = select(Documentation).where(Documentation.id == doc_id)
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documentation not found")

    content_bytes = s3_service.get_file_content(doc.s3_key)
    if content_bytes is None:
        if doc.content:
            content_bytes = doc.content.encode("utf-8")
        else:
            raise HTTPException(status_code=404, detail="File content not found in S3 bucket")

    mime_type, _ = mimetypes.guess_type(doc.file_name)
    if not mime_type:
        if doc.file_type == "markdown":
            mime_type = "text/markdown; charset=utf-8"
        else:
            mime_type = "text/plain; charset=utf-8"

    return Response(content=content_bytes, media_type=mime_type)


@router.post("/repo/{repo_id}", response_model=DocumentationOut)
async def create_repository_documentation(
    repo_id: int,
    body: Optional[CreateDocumentationReq] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save text/markdown documentation to S3 for a repository."""
    stmt = select(Repository).where(Repository.id == repo_id)
    res = await db.execute(stmt)
    repo = res.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    if not body:
        raise HTTPException(status_code=400, detail="Missing documentation content payload")

    file_name = body.file_name or "README.md"
    file_type = body.file_type or ("markdown" if file_name.endswith(".md") else "doc")
    s3_key = _encode_s3_key(repo.owner, repo.name, file_name)

    content_type = "text/markdown; charset=utf-8" if file_type == "markdown" else "text/plain; charset=utf-8"
    s3_res = s3_service.upload_file(key=s3_key, content=body.content, content_type=content_type)

    # Check if doc with same file_name exists for this repo
    stmt_existing = select(Documentation).where(
        Documentation.repository_id == repo_id, Documentation.file_name == file_name
    )
    res_existing = await db.execute(stmt_existing)
    existing_doc = res_existing.scalar_one_or_none()

    if existing_doc:
        existing_doc.content = body.content
        existing_doc.file_type = file_type
        existing_doc.s3_bucket = s3_res["s3_bucket"]
        existing_doc.s3_key = s3_res["s3_key"]
        existing_doc.s3_url = s3_res["s3_url"]
        doc = existing_doc
    else:
        doc = Documentation(
            repository_id=repo_id,
            file_name=file_name,
            file_type=file_type,
            s3_bucket=s3_res["s3_bucket"],
            s3_key=s3_res["s3_key"],
            s3_url=s3_res["s3_url"],
            content=body.content,
        )
        db.add(doc)

    await db.commit()
    await db.refresh(doc)
    logger.info("Saved doc %s (S3 key: %s) for repo %s to S3 bucket %s", file_name, s3_key, repo.full_name, doc.s3_bucket)
    return doc


@router.post("/repo/{repo_id}/upload", response_model=DocumentationOut)
async def upload_repository_documentation_file(
    repo_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a markdown (.md) or document file (.doc, .docx, .txt, .pdf) to S3 with encoded key name."""
    stmt = select(Repository).where(Repository.id == repo_id)
    res = await db.execute(stmt)
    repo = res.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    file_bytes = await file.read()
    if len(file_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (maximum 25MB allowed)")

    raw_name = file.filename or "uploaded_document.md"
    file_name = os.path.basename(raw_name).strip()
    if not file_name:
        file_name = "uploaded_document.md"

    # Whitelist check
    allowed_extensions = (".md", ".doc", ".docx", ".pdf", ".txt", ".rst", ".markdown")
    if not file_name.lower().endswith(allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Allowed formats: .md, .doc, .docx, .pdf, .txt, .rst",
        )

    if file_name.lower().endswith((".md", ".markdown")):
        file_type = "markdown"
    elif file_name.lower().endswith((".doc", ".docx")):
        file_type = "doc"
    elif file_name.lower().endswith(".pdf"):
        file_type = "pdf"
    else:
        file_type = "txt"

    s3_key = _encode_s3_key(repo.owner, repo.name, file_name)
    content_type = file.content_type or "application/octet-stream"

    s3_res = s3_service.upload_file(key=s3_key, content=file_bytes, content_type=content_type)

    content_str = None
    try:
        content_str = file_bytes.decode("utf-8")
    except Exception:
        content_str = f"[Binary Document File: {file_name}]"

    stmt_existing = select(Documentation).where(
        Documentation.repository_id == repo_id, Documentation.file_name == file_name
    )
    res_existing = await db.execute(stmt_existing)
    existing_doc = res_existing.scalar_one_or_none()

    if existing_doc:
        existing_doc.content = content_str
        existing_doc.file_type = file_type
        existing_doc.s3_bucket = s3_res["s3_bucket"]
        existing_doc.s3_key = s3_res["s3_key"]
        existing_doc.s3_url = s3_res["s3_url"]
        doc = existing_doc
    else:
        doc = Documentation(
            repository_id=repo_id,
            file_name=file_name,
            file_type=file_type,
            s3_bucket=s3_res["s3_bucket"],
            s3_key=s3_res["s3_key"],
            s3_url=s3_res["s3_url"],
            content=content_str,
        )
        db.add(doc)

    await db.commit()
    await db.refresh(doc)
    logger.info("Uploaded file %s (S3 key: %s) for repo %s to S3 bucket %s", file_name, s3_key, repo.full_name, doc.s3_bucket)
    return doc


@router.put("/{doc_id}", response_model=DocumentationOut)
async def update_documentation(
    doc_id: int,
    body: UpdateDocumentationReq,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update markdown content or filename of existing documentation in S3."""
    stmt = (
        select(Documentation)
        .where(Documentation.id == doc_id)
        .options(selectinload(Documentation.repository))
    )
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documentation not found")

    repo = doc.repository
    if body.file_name and body.file_name != doc.file_name:
        # Delete old key if name changed
        s3_service.delete_file(doc.s3_key)
        doc.file_name = body.file_name
        doc.file_type = "markdown" if body.file_name.endswith(".md") else doc.file_type
        doc.s3_key = _encode_s3_key(repo.owner, repo.name, body.file_name)

    if body.content is not None:
        doc.content = body.content
        content_type = "text/markdown; charset=utf-8" if doc.file_type == "markdown" else "text/plain; charset=utf-8"
        s3_res = s3_service.upload_file(key=doc.s3_key, content=body.content, content_type=content_type)
        doc.s3_bucket = s3_res["s3_bucket"]
        doc.s3_url = s3_res["s3_url"]

    await db.commit()
    await db.refresh(doc)
    logger.info("Updated documentation ID %d (S3 key: %s) in S3 bucket %s", doc.id, doc.s3_key, doc.s3_bucket)
    return doc


@router.delete("/{doc_id}")
async def delete_documentation(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a documentation file from S3 and database."""
    stmt = select(Documentation).where(Documentation.id == doc_id)
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documentation not found")

    s3_service.delete_file(doc.s3_key)
    await db.delete(doc)
    await db.commit()
    logger.info("Deleted documentation ID %d (key: %s) from S3", doc_id, doc.s3_key)
    return {"message": "Documentation deleted successfully", "id": doc_id}


@router.get("/releases/{owner}/{repo}", response_model=list[ReleaseOut])
async def get_repo_releases(
    owner: str,
    repo: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch GitHub release notes and tags directly from GitHub REST API for a given repository."""
    token = current_user.github_token if current_user.github_token else ""
    gh_service = GitHubService(token)

    releases_raw = []
    try:
        releases_raw = await gh_service.get_repo_releases(owner, repo)
    except Exception as e:
        logger.warning("Failed to fetch GitHub releases for %s/%s: %s", owner, repo, e)

    output = []
    if releases_raw:
        for r in releases_raw:
            author = r.get("author") or {}
            output.append(
                ReleaseOut(
                    id=r.get("id", 0),
                    tag_name=r.get("tag_name", "v1.0.0"),
                    name=r.get("name") or r.get("tag_name", "Release Notes"),
                    body=r.get("body") or f"Release notes for tag {r.get('tag_name')}.",
                    draft=r.get("draft", False),
                    prerelease=r.get("prerelease", False),
                    created_at=str(r.get("created_at") or ""),
                    published_at=str(r.get("published_at") or r.get("created_at") or ""),
                    html_url=r.get("html_url", f"https://github.com/{owner}/{repo}/releases/tag/{r.get('tag_name')}"),
                    author_login=author.get("login", owner),
                    author_avatar=author.get("avatar_url"),
                )
            )

    # If no formal GitHub Releases found, fetch Git Tags directly from GitHub REST API
    if not output:
        try:
            tags_raw = await gh_service.get_repo_tags(owner, repo)
            if tags_raw:
                for idx, t in enumerate(tags_raw):
                    tag_name = t.get("name", "v1.0.0")
                    commit = t.get("commit") or {}
                    sha = (commit.get("sha") or "")[:7]
                    output.append(
                        ReleaseOut(
                            id=idx + 1,
                            tag_name=tag_name,
                            name=f"Release {tag_name}",
                            body=(
                                f"## 🏷️ Git Tag: `{tag_name}`\n\n"
                                f"- **Repository**: `{owner}/{repo}`\n"
                                f"- **Commit SHA**: `{sha}`\n"
                                f"- **Tag Link**: [View Tag on GitHub](https://github.com/{owner}/{repo}/releases/tag/{tag_name})\n"
                            ),
                            draft=False,
                            prerelease=False,
                            created_at="",
                            published_at="",
                            html_url=f"https://github.com/{owner}/{repo}/releases/tag/{tag_name}",
                            author_login=owner,
                            author_avatar=f"https://github.com/{owner}.png",
                        )
                    )
        except Exception as e:
            logger.warning("Failed to fetch GitHub tags for %s/%s: %s", owner, repo, e)

    return output


@router.post("/repo/{repo_id}/fetch-docs", response_model=list[DocumentationOut])
async def fetch_repository_docs_folder_endpoint(
    repo_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch documentation files inside docs/ folder of a repository from Git provider and save to DB/S3."""
    stmt = select(Repository).where(Repository.id == repo_id)
    res = await db.execute(stmt)
    repo = res.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    docs = await fetch_and_save_repo_docs_folder(db, repo, user=current_user)
    return [
        DocumentationOut(
            id=d.id,
            repository_id=d.repository_id,
            file_name=d.file_name,
            file_type=d.file_type,
            s3_bucket=d.s3_bucket,
            s3_key=d.s3_key,
            s3_url=d.s3_url,
            content=d.content,
            source=getattr(d, "source", "docs_folder") or "docs_folder",
            created_at=d.created_at,
            updated_at=d.updated_at,
        )
        for d in docs
    ]


@router.post("/fetch-all-docs", response_model=list[RepositoryWithDocsOut])
async def fetch_all_repositories_docs_folder_endpoint(
    org: str = Query(..., description="Organization or owner name"),
    provider: str = Query("github", pattern="^(github|gitlab)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch documentation files inside docs/ folder for all organization repositories."""
    stmt = (
        select(Repository)
        .where(Repository.owner.ilike(org), Repository.provider == provider)
        .order_by(Repository.name.asc())
    )
    result = await db.execute(stmt)
    repos = result.scalars().all()

    for repo in repos:
        try:
            await fetch_and_save_repo_docs_folder(db, repo, user=current_user)
        except Exception as exc:
            logger.warning("Failed to fetch docs folder for repo %s: %s", repo.full_name, exc)

    return await list_repositories_with_docs(org=org, provider=provider, current_user=current_user, db=db)


