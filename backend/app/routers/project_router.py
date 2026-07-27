import json
import logging
import re
from datetime import datetime
from typing import Optional


from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.project import GitHubIssue, GitHubProject, GitHubProjectItem, ProjectTask, RepoProject
from app.models.repository import Repository
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.project import (
    AssigneeSchema,
    BulkUpdateIssuesReq,
    ColumnOptionSchema,
    CreateCommentReq,
    CreateIssueReq,
    CreateProjectTaskReq,
    CreateRepoProjectReq,
    IssueOut,
    LabelSchema,
    ProjectBoardOut,
    ProjectItemOut,
    ProjectTaskOut,
    ProjectV2Out,
    RepoProjectBoardOut,
    RepoProjectOut,
    UpdateIssueReq,
    UpdateItemStatusReq,
    UpdateProjectTaskReq,
    UpdateRepoProjectReq,
)
from app.services.github_service import GitHubService


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/projects", tags=["Project Management"])


def _parse_json(val: Optional[str]) -> list:
    if not val:
        return []
    try:
        return json.loads(val)
    except Exception:
        return []


def _format_issue_out(issue: GitHubIssue) -> IssueOut:
    assignees_raw = _parse_json(issue.assignees_json)
    labels_raw = _parse_json(issue.labels_json)

    assignees = [AssigneeSchema(login=a.get("login", ""), avatar_url=a.get("avatar_url")) for a in assignees_raw]
    labels = [LabelSchema(name=l.get("name", ""), color=l.get("color", "808080")) for l in labels_raw]

    return IssueOut(
        id=issue.id,
        github_id=issue.github_id,
        number=issue.number,
        repo_name=issue.repo_name,
        owner=issue.owner,
        title=issue.title,
        body=issue.body,
        state=issue.state,
        author_login=issue.author_login,
        author_avatar=issue.author_avatar,
        assignees=assignees,
        labels=labels,
        milestone=issue.milestone,
        priority=issue.priority,
        comments_count=issue.comments_count,
        created_at=issue.created_at,
        updated_at=issue.updated_at,
        closed_at=issue.closed_at,
    )


@router.get("", response_model=list[ProjectV2Out])
async def list_projects(
    org: str = Query(..., description="Organization or owner name"),
    provider: str = Query("github", pattern="^(github|gitlab)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List GitHub Projects (v2) for an organization."""
    stmt = select(GitHubProject).where(GitHubProject.org.ilike(org)).order_by(GitHubProject.number.asc())
    res = await db.execute(stmt)
    db_projects = res.scalars().all()

    # Sync with GitHub if token is available
    if current_user.github_token:
        try:
            gh = GitHubService(current_user.github_token)
            gh_projects = await gh.get_org_projects_v2(org)
            for gp in gh_projects:
                fields = gp.get("fields", {}).get("nodes", [])
                status_field = next((f for f in fields if f.get("name") == "Status"), None)

                fields_payload = {
                    "status_field_id": status_field.get("id") if status_field else None,
                    "columns": status_field.get("options", []) if status_field else [],
                }

                existing = next((p for p in db_projects if p.github_id == gp["id"]), None)
                if existing:
                    existing.title = gp["title"]
                    existing.closed = gp.get("closed", False)
                    existing.fields_json = json.dumps(fields_payload)
                else:
                    new_proj = GitHubProject(
                        github_id=gp["id"],
                        org=org,
                        title=gp["title"],
                        number=gp.get("number", 0),
                        url=gp.get("url"),
                        closed=gp.get("closed", False),
                        fields_json=json.dumps(fields_payload),
                    )
                    db.add(new_proj)
            await db.commit()

            res = await db.execute(stmt)
            db_projects = res.scalars().all()
        except Exception as e:
            logger.warning("Failed to sync Projects v2 with GitHub for org %s: %s", org, e)

    output = []
    for p in db_projects:
        fields_data = _parse_json(p.fields_json)
        columns = [ColumnOptionSchema(id=c.get("id"), name=c.get("name")) for c in fields_data.get("columns", [])]
        if not columns:
            # Default Kanban columns fallback
            columns = [
                ColumnOptionSchema(id="todo", name="Todo"),
                ColumnOptionSchema(id="in_progress", name="In Progress"),
                ColumnOptionSchema(id="in_review", name="In Review"),
                ColumnOptionSchema(id="done", name="Done"),
            ]

        output.append(
            ProjectV2Out(
                id=p.id,
                github_id=p.github_id,
                org=p.org,
                title=p.title,
                number=p.number,
                url=p.url,
                closed=p.closed,
                status_field_id=fields_data.get("status_field_id"),
                columns=columns,
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
        )

    return output


@router.post("/import-by-number", response_model=ProjectV2Out)
async def import_project_by_number(
    org: str = Query(..., description="Organization or owner login"),
    project_number: int = Query(..., description="GitHub Project number (e.g. 4)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import a specific GitHub Project v2 by organization/owner login and project number."""
    if not current_user.github_token:
        raise HTTPException(status_code=400, detail="GitHub account not linked")

    gh = GitHubService(current_user.github_token)
    gp = await gh.get_project_by_number(org, project_number)

    if not gp:
        # Fallback if token lacks project scope: create project record for org & project_number
        gh_id = f"gh_proj_v2_{org.lower()}_{project_number}"
        gp = {
            "id": gh_id,
            "title": f"Project #{project_number}",
            "number": project_number,
            "url": f"https://github.com/orgs/{org}/projects/{project_number}",
            "closed": False,
            "fields": {
                "nodes": [
                    {
                        "id": "status_field",
                        "name": "Status",
                        "options": [
                            {"id": "todo", "name": "Todo"},
                            {"id": "in_progress", "name": "In Progress"},
                            {"id": "in_review", "name": "In Review"},
                            {"id": "done", "name": "Done"},
                        ],
                    }
                ]
            },
        }

    fields = gp.get("fields", {}).get("nodes", [])
    status_field = next((f for f in fields if f.get("name") == "Status"), None)

    fields_payload = {
        "status_field_id": status_field.get("id") if status_field else "status_field",
        "columns": status_field.get("options", []) if status_field else [
            {"id": "todo", "name": "Todo"},
            {"id": "in_progress", "name": "In Progress"},
            {"id": "in_review", "name": "In Review"},
            {"id": "done", "name": "Done"},
        ],
    }

    stmt = select(GitHubProject).where(
        (GitHubProject.github_id == gp["id"]) |
        ((GitHubProject.org.ilike(org)) & (GitHubProject.number == project_number))
    )
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()

    if existing:
        existing.title = gp["title"]
        existing.closed = gp.get("closed", False)
        existing.fields_json = json.dumps(fields_payload)
        proj = existing
    else:
        proj = GitHubProject(
            github_id=gp["id"],
            org=org,
            title=gp["title"],
            number=gp.get("number", project_number),
            url=gp.get("url"),
            closed=gp.get("closed", False),
            fields_json=json.dumps(fields_payload),
        )
        db.add(proj)

    await db.commit()
    await db.refresh(proj)

    columns = [ColumnOptionSchema(id=c.get("id"), name=c.get("name")) for c in fields_payload.get("columns", [])]
    if not columns:
        columns = [
            ColumnOptionSchema(id="todo", name="Todo"),
            ColumnOptionSchema(id="in_progress", name="In Progress"),
            ColumnOptionSchema(id="in_review", name="In Review"),
            ColumnOptionSchema(id="done", name="Done"),
        ]

    return ProjectV2Out(
        id=proj.id,
        github_id=proj.github_id,
        org=proj.org,
        title=proj.title,
        number=proj.number,
        url=proj.url,
        closed=proj.closed,
        status_field_id=fields_payload.get("status_field_id"),
        columns=columns,
        created_at=proj.created_at,
        updated_at=proj.updated_at,
    )



@router.get("/{project_id}/board", response_model=ProjectBoardOut)
async def get_project_board(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch Kanban board items and columns for a project."""
    stmt = (
        select(GitHubProject)
        .where(GitHubProject.id == project_id)
        .options(selectinload(GitHubProject.items).selectinload(GitHubProjectItem.issue))
    )
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Fetch fresh items from GitHub if token available
    if current_user.github_token and project.github_id.startswith("P"):
        try:
            gh = GitHubService(current_user.github_token)
            details = await gh.get_project_v2_details(project.github_id)
            items_nodes = details.get("items", {}).get("nodes", [])

            for item_node in items_nodes:
                content = item_node.get("content") or {}
                if not content or "number" not in content:
                    continue

                repo_info = content.get("repository", {})
                owner_login = repo_info.get("owner", {}).get("login", project.org)
                repo_name = repo_info.get("name", "repo")

                status_val = item_node.get("fieldValueByName", {}) or {}
                col_name = status_val.get("name") or "Todo"
                opt_id = status_val.get("optionId")

                assignees_list = [
                    {"login": a.get("login"), "avatar_url": a.get("avatarUrl")}
                    for a in content.get("assignees", {}).get("nodes", [])
                ]
                labels_list = [
                    {"name": l.get("name"), "color": l.get("color")}
                    for l in content.get("labels", {}).get("nodes", [])
                ]

                # Sync Issue to DB
                stmt_iss = select(GitHubIssue).where(GitHubIssue.github_id == content["id"])
                res_iss = await db.execute(stmt_iss)
                issue = res_iss.scalar_one_or_none()

                if issue:
                    issue.title = content.get("title", issue.title)
                    issue.body = content.get("body", issue.body)
                    issue.state = content.get("state", "OPEN").lower()
                    issue.assignees_json = json.dumps(assignees_list)
                    issue.labels_json = json.dumps(labels_list)
                    issue.comments_count = content.get("comments", {}).get("totalCount", 0)
                else:
                    issue = GitHubIssue(
                        github_id=content["id"],
                        number=content["number"],
                        repo_name=repo_name,
                        owner=owner_login,
                        title=content.get("title", ""),
                        body=content.get("body", ""),
                        state=content.get("state", "OPEN").lower(),
                        author_login=content.get("author", {}).get("login", "unknown"),
                        author_avatar=content.get("author", {}).get("avatarUrl"),
                        assignees_json=json.dumps(assignees_list),
                        labels_json=json.dumps(labels_list),
                        comments_count=content.get("comments", {}).get("totalCount", 0),
                    )
                    db.add(issue)
                    await db.flush()

                # Sync Item to DB
                stmt_item = select(GitHubProjectItem).where(GitHubProjectItem.github_id == item_node["id"])
                res_item = await db.execute(stmt_item)
                item = res_item.scalar_one_or_none()

                if item:
                    item.status = col_name
                    item.status_option_id = opt_id
                else:
                    item = GitHubProjectItem(
                        github_id=item_node["id"],
                        project_id=project.id,
                        issue_id=issue.id,
                        status=col_name,
                        status_option_id=opt_id,
                    )
                    db.add(item)

            await db.commit()

            res = await db.execute(stmt)
            project = res.scalar_one_or_none()
        except Exception as e:
            logger.warning("Failed to refresh board details from GitHub for project %d: %s", project_id, e)

    fields_data = _parse_json(project.fields_json)
    columns = [ColumnOptionSchema(id=c.get("id"), name=c.get("name")) for c in fields_data.get("columns", [])]
    if not columns:
        columns = [
            ColumnOptionSchema(id="todo", name="Todo"),
            ColumnOptionSchema(id="in_progress", name="In Progress"),
            ColumnOptionSchema(id="in_review", name="In Review"),
            ColumnOptionSchema(id="done", name="Done"),
        ]

    project_out = ProjectV2Out(
        id=project.id,
        github_id=project.github_id,
        org=project.org,
        title=project.title,
        number=project.number,
        url=project.url,
        closed=project.closed,
        status_field_id=fields_data.get("status_field_id"),
        columns=columns,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )

    items_out = [
        ProjectItemOut(
            id=item.id,
            github_id=item.github_id,
            status=item.status,
            status_option_id=item.status_option_id,
            position=item.position,
            issue=_format_issue_out(item.issue),
        )
        for item in project.items
        if item.issue
    ]

    return ProjectBoardOut(project=project_out, items=items_out)


@router.post("/{project_id}/items/{item_id}/status", response_model=dict)
async def update_item_status(
    project_id: int,
    item_id: int,
    body: UpdateItemStatusReq,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update column status of a board card (optimistically updates DB + calls GraphQL mutation)."""
    stmt = (
        select(GitHubProjectItem)
        .where(GitHubProjectItem.id == item_id, GitHubProjectItem.project_id == project_id)
        .options(selectinload(GitHubProjectItem.project))
    )
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Project item not found")

    old_status = item.status
    item.status = body.status
    if body.status_option_id:
        item.status_option_id = body.status_option_id

    await db.commit()

    # Call GitHub GraphQL mutation if token is set and status_option_id is provided
    if current_user.github_token and item.project.github_id.startswith("P"):
        try:
            gh = GitHubService(current_user.github_token)
            fields_data = _parse_json(item.project.fields_json)
            field_id = body.field_id or fields_data.get("status_field_id")

            if field_id and body.status_option_id:
                await gh.update_project_v2_item_field(
                    project_id=item.project.github_id,
                    item_id=item.github_id,
                    field_id=field_id,
                    option_id=body.status_option_id,
                )
                logger.info("Updated item %s status on GitHub to %s", item.github_id, body.status)
        except Exception as e:
            logger.warning("Failed to sync item status change to GitHub: %s", e)

    return {"message": "Status updated successfully", "old_status": old_status, "new_status": body.status}


@router.post("/{project_id}/issues", response_model=ProjectItemOut)
async def create_project_issue(
    project_id: int,
    body: CreateIssueReq,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new issue on GitHub and add it to the project board."""
    stmt = select(GitHubProject).where(GitHubProject.id == project_id)
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not current_user.github_token:
        raise HTTPException(status_code=400, detail="GitHub account not linked")

    gh = GitHubService(current_user.github_token)

    # 1. Create REST issue on GitHub
    gh_issue = await gh.create_issue(
        owner=body.owner,
        repo=body.repo_name,
        title=body.title,
        body=body.body or "",
        assignees=body.assignees,
        labels=body.labels,
        milestone=body.milestone,
    )

    assignees_list = [{"login": a.get("login"), "avatar_url": a.get("avatar_url")} for a in gh_issue.get("assignees", [])]
    labels_list = [{"name": l.get("name"), "color": l.get("color")} for l in gh_issue.get("labels", [])]

    # Save to local DB
    issue = GitHubIssue(
        github_id=gh_issue.get("node_id", f"I_local_{gh_issue['id']}"),
        number=gh_issue["number"],
        repo_name=body.repo_name,
        owner=body.owner,
        title=gh_issue["title"],
        body=gh_issue.get("body"),
        state=gh_issue.get("state", "open"),
        author_login=gh_issue.get("user", {}).get("login", current_user.login),
        author_avatar=gh_issue.get("user", {}).get("avatar_url"),
        assignees_json=json.dumps(assignees_list),
        labels_json=json.dumps(labels_list),
        priority=body.priority,
    )
    db.add(issue)
    await db.flush()

    # 2. Add item to Project v2 via GraphQL
    item_github_id = f"PVTI_local_{issue.id}"
    try:
        add_res = await gh.add_item_to_project_v2(project.github_id, issue.github_id)
        item_github_id = add_res.get("addProjectV2ItemById", {}).get("item", {}).get("id", item_github_id)
    except Exception as e:
        logger.warning("Could not attach new issue to Project v2 via GraphQL: %s", e)

    item = GitHubProjectItem(
        github_id=item_github_id,
        project_id=project.id,
        issue_id=issue.id,
        status="Todo",
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    return ProjectItemOut(
        id=item.id,
        github_id=item.github_id,
        status=item.status,
        status_option_id=item.status_option_id,
        position=item.position,
        issue=_format_issue_out(issue),
    )


@router.put("/issues/{issue_id}", response_model=IssueOut)
async def update_issue_details(
    issue_id: int,
    body: UpdateIssueReq,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Edit issue title, body, state (open/closed), assignees, or labels on GitHub and DB."""
    stmt = select(GitHubIssue).where(GitHubIssue.id == issue_id)
    res = await db.execute(stmt)
    issue = res.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    if current_user.github_token:
        try:
            gh = GitHubService(current_user.github_token)
            gh_res = await gh.update_issue(
                owner=issue.owner,
                repo=issue.repo_name,
                issue_number=issue.number,
                title=body.title,
                body=body.body,
                state=body.state,
                assignees=body.assignees,
                labels=body.labels,
            )
            if "title" in gh_res:
                issue.title = gh_res["title"]
            if "body" in gh_res:
                issue.body = gh_res["body"]
            if "state" in gh_res:
                issue.state = gh_res["state"]
            if "assignees" in gh_res:
                issue.assignees_json = json.dumps([{"login": a["login"], "avatar_url": a.get("avatar_url")} for a in gh_res["assignees"]])
            if "labels" in gh_res:
                issue.labels_json = json.dumps([{"name": l["name"], "color": l.get("color")} for l in gh_res["labels"]])
        except Exception as e:
            logger.warning("Failed to update issue on GitHub: %s", e)

    if body.title is not None:
        issue.title = body.title
    if body.body is not None:
        issue.body = body.body
    if body.state is not None:
        newState = body.state.lower()
        issue.state = newState
        if newState == "closed":
            issue.closed_at = datetime.utcnow()
            stmt_items = select(GitHubProjectItem).where(GitHubProjectItem.issue_id == issue.id)
            res_items = await db.execute(stmt_items)
            for item in res_items.scalars().all():
                item.status = "Done"

            stmt_tasks = select(ProjectTask).where(ProjectTask.issue_id == issue.id)
            res_tasks = await db.execute(stmt_tasks)
            for task in res_tasks.scalars().all():
                task.status = "Done"
        elif newState == "open":
            issue.closed_at = None
            stmt_items = select(GitHubProjectItem).where(GitHubProjectItem.issue_id == issue.id)
            res_items = await db.execute(stmt_items)
            for item in res_items.scalars().all():
                if item.status.lower() in ("done", "completed", "closed"):
                    item.status = "In Progress"

            stmt_tasks = select(ProjectTask).where(ProjectTask.issue_id == issue.id)
            res_tasks = await db.execute(stmt_tasks)
            for task in res_tasks.scalars().all():
                if task.status.lower() in ("done", "completed", "closed"):
                    task.status = "In Progress"

    await db.commit()
    await db.refresh(issue)
    return _format_issue_out(issue)



@router.get("/issues/{owner}/{repo}/{issue_number}/details")
async def get_issue_details_full(
    owner: str,
    repo: str,
    issue_number: int,
    current_user: User = Depends(get_current_user),
):
    """Fetch comments, linked PRs, and commit activity timeline for an issue."""
    if not current_user.github_token:
        raise HTTPException(status_code=400, detail="GitHub account not linked")

    gh = GitHubService(current_user.github_token)
    comments = await gh.get_issue_comments(owner, repo, issue_number)
    timeline = await gh.get_issue_timeline(owner, repo, issue_number)

    linked_prs = []
    commits = []

    for event in timeline:
        event_type = event.get("event")
        if event_type in ("cross-referenced", "connected"):
            source = event.get("source", {}).get("issue", {})
            if source and source.get("pull_request"):
                linked_prs.append({
                    "title": source.get("title"),
                    "number": source.get("number"),
                    "url": source.get("html_url"),
                    "state": source.get("state"),
                })
        elif event_type == "referenced":
            commit_id = event.get("commit_id")
            if commit_id:
                commits.append({
                    "sha": commit_id[:7],
                    "url": event.get("commit_url"),
                })

    return {
        "comments": comments,
        "linked_prs": linked_prs,
        "commits": commits,
        "timeline_events_count": len(timeline),
    }


@router.post("/issues/{owner}/{repo}/{issue_number}/comments")
async def add_issue_comment(
    owner: str,
    repo: str,
    issue_number: int,
    body: CreateCommentReq,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Post new comment on an issue via GitHub API."""
    if not current_user.github_token:
        raise HTTPException(status_code=400, detail="GitHub account not linked")

    gh = GitHubService(current_user.github_token)
    comment = await gh.create_issue_comment(owner, repo, issue_number, body.body)

    # Update comments count in local DB
    stmt = select(GitHubIssue).where(
        GitHubIssue.owner == owner, GitHubIssue.repo_name == repo, GitHubIssue.number == issue_number
    )
    res = await db.execute(stmt)
    issue = res.scalar_one_or_none()
    if issue:
        issue.comments_count += 1
        await db.commit()

    return comment


@router.post("/bulk-update")
async def bulk_update_issues(
    body: BulkUpdateIssuesReq,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Bulk update multiple issues/cards (status column, state, labels, assignees)."""
    stmt = select(GitHubIssue).where(GitHubIssue.id.in_(body.issue_ids))
    res = await db.execute(stmt)
    issues = res.scalars().all()

    for issue in issues:
        if body.state:
            issue.state = body.state.lower()

        # Update Project Item Status
        if body.status:
            stmt_item = select(GitHubProjectItem).where(GitHubProjectItem.issue_id == issue.id)
            res_item = await db.execute(stmt_item)
            item = res_item.scalar_one_or_none()
            if item:
                item.status = body.status
                if body.status_option_id:
                    item.status_option_id = body.status_option_id

    await db.commit()
    return {"updated": len(issues), "message": f"Successfully updated {len(issues)} issues"}


@router.post("/webhooks/github")
async def github_webhook_receiver(
    request: Request,
    x_github_event: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """Receive real-time GitHub Webhooks for issues & projects_v2_item events."""
    payload = await request.json()
    event = x_github_event or payload.get("event")
    logger.info("Received GitHub Webhook event: %s", event)

    if event == "issues":
        action = payload.get("action")
        issue_data = payload.get("issue", {})
        repo_data = payload.get("repository", {})

        if issue_data:
            stmt = select(GitHubIssue).where(GitHubIssue.github_id == issue_data["node_id"])
            res = await db.execute(stmt)
            issue = res.scalar_one_or_none()

            assignees_list = [{"login": a["login"], "avatar_url": a.get("avatar_url")} for a in issue_data.get("assignees", [])]
            labels_list = [{"name": l["name"], "color": l.get("color")} for l in issue_data.get("labels", [])]

            if issue:
                issue.title = issue_data["title"]
                issue.body = issue_data.get("body")
                issue.state = issue_data["state"].lower()
                issue.assignees_json = json.dumps(assignees_list)
                issue.labels_json = json.dumps(labels_list)
            else:
                issue = GitHubIssue(
                    github_id=issue_data["node_id"],
                    number=issue_data["number"],
                    repo_name=repo_data.get("name", "repo"),
                    owner=repo_data.get("owner", {}).get("login", "owner"),
                    title=issue_data["title"],
                    body=issue_data.get("body"),
                    state=issue_data["state"].lower(),
                    author_login=issue_data.get("user", {}).get("login", "unknown"),
                    author_avatar=issue_data.get("user", {}).get("avatar_url"),
                    assignees_json=json.dumps(assignees_list),
                    labels_json=json.dumps(labels_list),
                )
                db.add(issue)
                await db.flush()

            # Synchronize board card status
            if action == "closed" or issue.state == "closed":
                issue.closed_at = datetime.utcnow()
                stmt_items = select(GitHubProjectItem).where(GitHubProjectItem.issue_id == issue.id)
                res_items = await db.execute(stmt_items)
                for item in res_items.scalars().all():
                    item.status = "Done"

                stmt_tasks = select(ProjectTask).where(ProjectTask.issue_id == issue.id)
                res_tasks = await db.execute(stmt_tasks)
                for task in res_tasks.scalars().all():
                    task.status = "Done"
            elif action == "reopened" or issue.state == "open":
                issue.closed_at = None
                stmt_items = select(GitHubProjectItem).where(GitHubProjectItem.issue_id == issue.id)
                res_items = await db.execute(stmt_items)
                for item in res_items.scalars().all():
                    if item.status.lower() in ("done", "completed", "closed"):
                        item.status = "In Progress"

                stmt_tasks = select(ProjectTask).where(ProjectTask.issue_id == issue.id)
                res_tasks = await db.execute(stmt_tasks)
                for task in res_tasks.scalars().all():
                    if task.status.lower() in ("done", "completed", "closed"):
                        task.status = "In Progress"

            await db.commit()


    return {"status": "event processed"}


# ── Built-in Repository Projects & Tasks API Endpoints ─────────────────────────

def generate_project_prefix(repo_name: str, proj_name: str = "") -> str:
    """Generate a clean 3-character uppercase prefix for ticket numbers, e.g. SSA, PRJ, CLS."""
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
        issue_id=task.issue_id,
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
        issue=_format_issue_out(task.issue) if task.issue else None,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )



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
    """Edit project details or column structure for a repository project."""
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
    if body.key_prefix is not None and body.key_prefix.strip():
        project.key_prefix = body.key_prefix.strip().upper()
    if body.status is not None:
        project.status = body.status
    if body.columns is not None:
        project.columns_json = json.dumps([c.dict() for c in body.columns])

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
    """Delete a repository project and its tasks."""
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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch board columns and tasks for a repository project."""
    stmt = (
        select(RepoProject)
        .where(RepoProject.id == project_id)
        .options(selectinload(RepoProject.tasks).selectinload(ProjectTask.issue))
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

    # Find the Done column name in project columns (prefer Done/Closed/Completed, fallback to last column)
    done_col_name = columns[-1].name if columns else "Done"
    for col in columns:
        if col.name.lower() in ("done", "closed", "completed", "finished"):
            done_col_name = col.name
            break

    has_changes = False

    # Fetch DB issues for this repo to match tasks
    stmt_all_db_issues = select(GitHubIssue).where(
        GitHubIssue.owner.ilike(project.org),
        GitHubIssue.repo_name.ilike(project.repo_name)
    )
    res_db_issues = await db.execute(stmt_all_db_issues)
    db_issues = res_db_issues.scalars().all()
    db_issue_by_num = {i.number: i for i in db_issues}

    live_issue_states: dict[int, str] = {}

    # Live sync GitHub Issue states if user has GitHub linked
    if current_user and current_user.github_token:
        try:
            gh = GitHubService(current_user.github_token)
            gh_issues = await gh.get_repo_issues(project.org, project.repo_name, state="all")
            for gh_iss in gh_issues:
                if "pull_request" in gh_iss:
                    continue
                num = gh_iss.get("number")
                st = gh_iss.get("state", "open")
                if num:
                    live_issue_states[num] = st
                    if num in db_issue_by_num:
                        iss = db_issue_by_num[num]
                        if iss.state != st:
                            iss.state = st
                            has_changes = True
                    else:
                        iss = GitHubIssue(
                            github_id=gh_iss.get("node_id", f"gh_iss_{num}"),
                            number=num,
                            repo_name=project.repo_name,
                            owner=project.org,
                            title=gh_iss.get("title", ""),
                            body=gh_iss.get("body"),
                            state=st,
                            author_login=(gh_iss.get("user") or {}).get("login", "unknown"),
                        )
                        db.add(iss)
                        await db.flush()
                        db_issue_by_num[num] = iss
                        has_changes = True
        except Exception as e:
            logger.warning("Could not sync live GitHub issues for project %d: %s", project_id, e)

    # Reconcile all tasks in the project
    for task in project.tasks:
        target_issue = task.issue
        if not target_issue and task.issue_id:
            stmt_iss = select(GitHubIssue).where(GitHubIssue.id == task.issue_id)
            res_iss = await db.execute(stmt_iss)
            target_issue = res_iss.scalar_one_or_none()
            if target_issue:
                task.issue = target_issue

        # Auto-link by title or issue number if not explicitly linked
        if not target_issue:
            for num, iss in db_issue_by_num.items():
                clean_title = task.title.strip().lower()
                clean_iss_title = iss.title.strip().lower()
                if clean_title == clean_iss_title or f"#{num}" in task.title or clean_iss_title in clean_title:
                    target_issue = iss
                    task.issue_id = iss.id
                    task.issue = iss
                    has_changes = True
                    break

        is_closed = False
        if target_issue:
            if target_issue.number in live_issue_states:
                is_closed = (live_issue_states[target_issue.number] == "closed")
            else:
                is_closed = (target_issue.state == "closed")

        if is_closed and task.status != done_col_name:
            task.status = done_col_name
            has_changes = True

    if has_changes:
        await db.commit()

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

    tasks_out = [_format_task_out(t) for t in project.tasks]
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

    issue_id = None
    if body.sync_to_github and current_user.github_token:
        try:
            gh = GitHubService(current_user.github_token)
            gh_iss = await gh.create_issue(
                owner=project.org,
                repo=project.repo_name,
                title=body.title,
                body=body.description or "",
                assignees=body.assignees,
                labels=body.labels,
            )

            stmt_iss = select(GitHubIssue).where(GitHubIssue.github_id == gh_iss.get("node_id"))
            res_iss = await db.execute(stmt_iss)
            iss = res_iss.scalar_one_or_none()

            if not iss:
                iss = GitHubIssue(
                    github_id=gh_iss.get("node_id", f"I_task_{datetime.utcnow().timestamp()}"),
                    number=gh_iss["number"],
                    repo_name=project.repo_name,
                    owner=project.org,
                    title=gh_iss["title"],
                    body=gh_iss.get("body"),
                    state=gh_iss.get("state", "open"),
                    author_login=current_user.login,
                    assignees_json=json.dumps(assignees_list),
                    labels_json=json.dumps(labels_list),
                )
                db.add(iss)
                await db.flush()

            issue_id = iss.id
        except Exception as e:
            logger.warning("Could not sync task to GitHub Issue: %s", e)

    # Compute sequential ticket_key for the project task, e.g. SSA-I100
    prefix = project.key_prefix or generate_project_prefix(project.repo_name, project.name)
    stmt_count = select(ProjectTask).where(ProjectTask.project_id == project.id)
    res_count = await db.execute(stmt_count)
    existing_tasks = res_count.scalars().all()
    ticket_num = 100 + len(existing_tasks)
    ticket_key = f"{prefix}-I{ticket_num}"

    task = ProjectTask(
        project_id=project.id,
        issue_id=issue_id,
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

    stmt_full = (
        select(ProjectTask)
        .where(ProjectTask.id == task.id)
        .options(selectinload(ProjectTask.issue))
    )
    res_full = await db.execute(stmt_full)
    task_full = res_full.scalar_one()

    return _format_task_out(task_full)


@router.put("/tasks/{task_id}", response_model=ProjectTaskOut)
async def update_project_task(
    task_id: int,
    body: UpdateProjectTaskReq,
    db: AsyncSession = Depends(get_db),
):
    """Update a project task (column status, title, description, assignees, labels, story points)."""
    stmt = (
        select(ProjectTask)
        .where(ProjectTask.id == task_id)
        .options(selectinload(ProjectTask.issue))
    )
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
        if task.issue:
            if body.status.lower() in ("done", "completed", "closed"):
                task.issue.state = "closed"
                task.issue.closed_at = datetime.utcnow()
            else:
                task.issue.state = "open"
                task.issue.closed_at = None
    if body.priority is not None:
        task.priority = body.priority
    if body.story_points is not None:
        task.story_points = body.story_points
    if body.assignees is not None:
        task.assignees_json = json.dumps([{"login": a} for a in body.assignees])
    if body.labels is not None:
        task.labels_json = json.dumps([{"name": l, "color": "808080"} for l in body.labels])

    await db.commit()
    await db.refresh(task)
    return _format_task_out(task)


@router.delete("/tasks/{task_id}")
async def delete_project_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a task from a project."""
    stmt = select(ProjectTask).where(ProjectTask.id == task_id)
    res = await db.execute(stmt)
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await db.delete(task)
    await db.commit()
    return {"message": "Task deleted successfully", "id": task_id}

