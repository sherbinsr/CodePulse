import json
import logging
import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.project import ProjectTask, RepoProject
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.project import (
    AssigneeSchema,
    ColumnOptionSchema,
    CreateProjectTaskReq,
    CreateRepoProjectReq,
    LabelSchema,
    ProjectTaskOut,
    RepoProjectBoardOut,
    RepoProjectOut,
    UpdateProjectTaskReq,
    UpdateRepoProjectReq,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/projects", tags=["Project Management"])


def _parse_json(val: Optional[str]) -> list:
    if not val:
        return []
    try:
        return json.loads(val)
    except Exception:
        return []


def generate_project_prefix(repo_name: str, proj_name: Optional[str] = None) -> str:
    """Generate a clean 3-4 letter ticket key prefix for the project, e.g. SSA, AUD, ENG."""
    source = (proj_name or repo_name).strip()
    words = [w for w in re.split(r"[^a-zA-Z0-9]+", source) if w]
    if len(words) >= 3:
        prefix = (words[0][0] + words[1][0] + words[2][0]).upper()
    elif len(words) == 2:
        prefix = (words[0][:2] + words[1][0]).upper()
    elif len(words) == 1:
        prefix = words[0][:3].upper()
    else:
        prefix = "PRJ"

    if len(prefix) < 3:
        prefix = (prefix + "PRJ")[:3]
    return prefix


def _format_task_out(task: ProjectTask) -> ProjectTaskOut:
    assignees_raw = _parse_json(task.assignees_json)
    labels_raw = _parse_json(task.labels_json)

    assignees = [AssigneeSchema(login=a.get("login", ""), avatar_url=a.get("avatar_url")) for a in assignees_raw]
    labels = [LabelSchema(name=l.get("name", ""), color=l.get("color", "808080")) for l in labels_raw]

    ticket_key = task.ticket_key
    if not ticket_key:
        prefix = "PRJ"
        if task.project:
            prefix = task.project.key_prefix or generate_project_prefix(task.project.repo_name, task.project.name)
        ticket_key = f"{prefix}-I{100 + task.id}"

    return ProjectTaskOut(
        id=task.id,
        project_id=task.project_id,
        ticket_key=ticket_key,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        assignees=assignees,
        labels=labels,
        story_points=task.story_points,
        due_date=task.due_date,
        position=task.position,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


# ── Repository Projects Endpoints ─────────────────────────────────────────────

@router.get("/repos/{org}/{repo_name}", response_model=list[RepoProjectOut])
async def list_repo_projects(
    org: str,
    repo_name: str,
    db: AsyncSession = Depends(get_db),
):
    """List all projects created for a specific repository."""
    stmt = (
        select(RepoProject)
        .where(RepoProject.org.ilike(org), RepoProject.repo_name.ilike(repo_name))
        .options(selectinload(RepoProject.tasks))
        .order_by(RepoProject.created_at.desc())
    )
    res = await db.execute(stmt)
    projects = res.scalars().all()

    output = []
    for p in projects:
        cols = _parse_json(p.columns_json)
        columns = [ColumnOptionSchema(id=c.get("id"), name=c.get("name")) for c in cols]
        if not columns:
            columns = [
                ColumnOptionSchema(id="backlog", name="Backlog"),
                ColumnOptionSchema(id="todo", name="Todo"),
                ColumnOptionSchema(id="in_progress", name="In Progress"),
                ColumnOptionSchema(id="in_review", name="In Review"),
                ColumnOptionSchema(id="done", name="Done"),
            ]

        output.append(
            RepoProjectOut(
                id=p.id,
                org=p.org,
                repo_name=p.repo_name,
                repository_id=p.repository_id,
                name=p.name,
                description=p.description,
                key_prefix=p.key_prefix,
                status=p.status,
                columns=columns,
                tasks_count=len(p.tasks),
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
        )
    return output


@router.post("/repos/{org}/{repo_name}", response_model=RepoProjectOut)
async def create_repo_project(
    org: str,
    repo_name: str,
    body: CreateRepoProjectReq,
    db: AsyncSession = Depends(get_db),
):
    """Create a new independent project for a repository."""
    columns_list = [c.dict() for c in body.columns] if body.columns else [
        {"id": "backlog", "name": "Backlog"},
        {"id": "todo", "name": "Todo"},
        {"id": "in_progress", "name": "In Progress"},
        {"id": "in_review", "name": "In Review"},
        {"id": "done", "name": "Done"},
    ]

    prefix = body.key_prefix or generate_project_prefix(repo_name, body.name)
    project = RepoProject(
        org=org,
        repo_name=repo_name,
        name=body.name,
        description=body.description,
        key_prefix=prefix,
        columns_json=json.dumps(columns_list),
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    columns = [ColumnOptionSchema(id=c["id"], name=c["name"]) for c in columns_list]

    return RepoProjectOut(
        id=project.id,
        org=project.org,
        repo_name=project.repo_name,
        repository_id=project.repository_id,
        name=project.name,
        description=project.description,
        key_prefix=project.key_prefix,
        status=project.status,
        columns=columns,
        tasks_count=0,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.put("/repo-projects/{project_id}", response_model=RepoProjectOut)
async def update_repo_project(
    project_id: int,
    body: UpdateRepoProjectReq,
    db: AsyncSession = Depends(get_db),
):
    """Update a repository project's name, description, prefix, status, or columns."""
    stmt = (
        select(RepoProject)
        .where(RepoProject.id == project_id)
        .options(selectinload(RepoProject.tasks))
    )
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Repo project not found")

    if body.name is not None:
        project.name = body.name
    if body.description is not None:
        project.description = body.description
    if body.key_prefix is not None:
        project.key_prefix = body.key_prefix.strip().upper()
    if body.status is not None:
        project.status = body.status
    if body.columns is not None:
        cols_list = [c.dict() for c in body.columns]
        project.columns_json = json.dumps(cols_list)

    await db.commit()
    await db.refresh(project)

    cols = _parse_json(project.columns_json)
    columns = [ColumnOptionSchema(id=c.get("id"), name=c.get("name")) for c in cols]

    return RepoProjectOut(
        id=project.id,
        org=project.org,
        repo_name=project.repo_name,
        repository_id=project.repository_id,
        name=project.name,
        description=project.description,
        key_prefix=project.key_prefix,
        status=project.status,
        columns=columns,
        tasks_count=len(project.tasks),
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.delete("/repo-projects/{project_id}")
async def delete_repo_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a repository project and all its tasks."""
    stmt = select(RepoProject).where(RepoProject.id == project_id)
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Repo project not found")

    await db.delete(project)
    await db.commit()
    return {"message": "Project deleted successfully", "id": project_id}


@router.get("/repo-projects/{project_id}/board", response_model=RepoProjectBoardOut)
async def get_repo_project_board(
    project_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get the full Kanban board (project metadata and all tasks) for a repo project."""
    stmt = (
        select(RepoProject)
        .where(RepoProject.id == project_id)
        .options(
            selectinload(RepoProject.tasks)
        )
    )
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Repo project not found")

    cols = _parse_json(project.columns_json)
    columns = [ColumnOptionSchema(id=c.get("id"), name=c.get("name")) for c in cols]
    if not columns:
        columns = [
            ColumnOptionSchema(id="backlog", name="Backlog"),
            ColumnOptionSchema(id="todo", name="Todo"),
            ColumnOptionSchema(id="in_progress", name="In Progress"),
            ColumnOptionSchema(id="in_review", name="In Review"),
            ColumnOptionSchema(id="done", name="Done"),
        ]

    project_out = RepoProjectOut(
        id=project.id,
        org=project.org,
        repo_name=project.repo_name,
        repository_id=project.repository_id,
        name=project.name,
        description=project.description,
        key_prefix=project.key_prefix,
        status=project.status,
        columns=columns,
        tasks_count=len(project.tasks),
        created_at=project.created_at,
        updated_at=project.updated_at,
    )

    tasks_out = [_format_task_out(t) for t in sorted(project.tasks, key=lambda x: (x.position, x.id))]

    return RepoProjectBoardOut(project=project_out, tasks=tasks_out)


@router.post("/repo-projects/{project_id}/tasks", response_model=ProjectTaskOut)
async def create_project_task(
    project_id: int,
    body: CreateProjectTaskReq,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new task under a repository project."""
    stmt = select(RepoProject).where(RepoProject.id == project_id)
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Repo project not found")

    assignees_list = [{"login": a} for a in body.assignees]
    labels_list = [{"name": l, "color": "808080"} for l in body.labels]

    # Compute sequential ticket_key for the project task, e.g. SSA-I100
    prefix = project.key_prefix or generate_project_prefix(project.repo_name, project.name)
    stmt_count = select(ProjectTask).where(ProjectTask.project_id == project.id)
    res_count = await db.execute(stmt_count)
    existing_tasks = res_count.scalars().all()
    ticket_num = 100 + len(existing_tasks)
    ticket_key = f"{prefix}-I{ticket_num}"

    task = ProjectTask(
        project_id=project.id,
        ticket_key=ticket_key,
        title=body.title,
        description=body.description,
        status=body.status or "Todo",
        priority=body.priority or "Medium",
        assignees_json=json.dumps(assignees_list),
        labels_json=json.dumps(labels_list),
        story_points=body.story_points or 1,
    )

    db.add(task)
    await db.commit()
    await db.refresh(task)

    return _format_task_out(task)


@router.put("/tasks/{task_id}", response_model=ProjectTaskOut)
async def update_project_task(
    task_id: int,
    body: UpdateProjectTaskReq,
    db: AsyncSession = Depends(get_db),
):
    """Update task properties (status/column, priority, assignees, labels, title, desc)."""
    stmt = select(ProjectTask).where(ProjectTask.id == task_id).options(selectinload(ProjectTask.project))
    res = await db.execute(stmt)
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if body.title is not None:
        task.title = body.title
    if body.description is not None:
        task.description = body.description
    if body.status is not None:
        task.status = body.status
    if body.priority is not None:
        task.priority = body.priority
    if body.story_points is not None:
        task.story_points = body.story_points
    if body.assignees is not None:
        assignees_list = [{"login": a} for a in body.assignees]
        task.assignees_json = json.dumps(assignees_list)
    if body.labels is not None:
        labels_list = [{"name": l, "color": "808080"} for l in body.labels]
        task.labels_json = json.dumps(labels_list)

    task.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(task)

    return _format_task_out(task)


@router.delete("/tasks/{task_id}")
async def delete_project_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a task from a project board."""
    stmt = select(ProjectTask).where(ProjectTask.id == task_id)
    res = await db.execute(stmt)
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await db.delete(task)
    await db.commit()
    return {"message": "Task deleted successfully", "id": task_id}
