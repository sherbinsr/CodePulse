import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.analytics_repository import AnalyticsRepository
from app.repositories.pr_repository import PRRepository
from app.schemas.analytics import (
    BuildTrendOut,
    CISummaryOut,
    CodeChurnOut,
    CommitActivityOut,
    DeveloperStatOut,
    DigestContributorOut,
    DigestOut,
    DigestRepoOut,
    DocGenResponse,
    FlakyWorkflowOut,
    MonthlyTrendOut,
    OrgOverviewOut,
    RepoDocOut,
    RepoStatOut,
    ReviewNetworkOut,
)
from app.schemas.pull_request import PRListResponse, PullRequestOut

logger = logging.getLogger(__name__)


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.analytics_repo = AnalyticsRepository(db)
        self.pr_repo = PRRepository(db)

    async def get_overview(self, org: str) -> OrgOverviewOut:
        logger.debug("Fetching org overview for: %s", org)
        data = await self.analytics_repo.get_org_overview(org)
        return OrgOverviewOut(**data)

    async def get_developer_stats(self, org: str) -> list:
        logger.debug("Fetching developer stats for: %s", org)
        rows = await self.analytics_repo.get_developer_stats(org)
        logger.info("Developer stats: %d developers found for org: %s", len(rows), org)
        return [DeveloperStatOut(**r) for r in rows]

    async def get_repo_stats(self, org: str) -> list:
        logger.debug("Fetching repo stats for: %s", org)
        rows = await self.analytics_repo.get_repo_stats(org)
        logger.info("Repo stats: %d repos found for org: %s", len(rows), org)
        return [RepoStatOut(**r) for r in rows]

    async def get_monthly_trends(self, org: str, months: int = 6) -> list:
        logger.debug("Fetching monthly trends for org: %s, months: %d", org, months)
        rows = await self.analytics_repo.get_monthly_trends(org, months)
        return [MonthlyTrendOut(**r) for r in rows]

    async def get_digest(self, org: str, period: str) -> DigestOut:
        logger.debug("Fetching digest for org: %s, period: %s", org, period)
        from datetime import datetime, timedelta

        period_map = {
            "1w": (7, "Last 1 Week"),
            "2w": (14, "Last 2 Weeks"),
            "3w": (21, "Last 3 Weeks"),
            "1m": (30, "Last 1 Month"),
            "2m": (60, "Last 2 Months"),
            "3m": (90, "Last 3 Months"),
            "6m": (180, "Last 6 Months"),
        }
        days, label = period_map.get(period, (30, "Last 1 Month"))
        since = datetime.utcnow() - timedelta(days=days)
        data = await self.analytics_repo.get_digest(org, since)
        top_contributors = [DigestContributorOut(**c) for c in data.pop("top_contributors")]
        top_repos = [DigestRepoOut(**r) for r in data.pop("top_repos")]
        return DigestOut(
            org=org,
            period_label=label,
            top_contributors=top_contributors,
            top_repos=top_repos,
            **data,
        )

    async def get_ci_summary(self, org: str) -> list:
        from app.repositories.ci_repository import CIRepository

        rows = await CIRepository(self.analytics_repo.db).get_ci_summary(org)
        return [CISummaryOut(**r) for r in rows]

    async def get_build_trends(self, org: str) -> list:
        from app.repositories.ci_repository import CIRepository

        rows = await CIRepository(self.analytics_repo.db).get_build_trends(org)
        return [BuildTrendOut(**r) for r in rows]

    async def get_flaky_workflows(self, org: str) -> list:
        from app.repositories.ci_repository import CIRepository

        rows = await CIRepository(self.analytics_repo.db).get_flaky_workflows(org)
        return [FlakyWorkflowOut(**r) for r in rows]

    async def get_commit_activity(self, org: str) -> list:
        from app.repositories.commit_repository import CommitRepository

        rows = await CommitRepository(self.analytics_repo.db).get_commit_activity(org)
        return [CommitActivityOut(**r) for r in rows]

    async def get_code_churn(self, org: str) -> list:
        from app.repositories.commit_repository import CommitRepository

        rows = await CommitRepository(self.analytics_repo.db).get_code_churn(org)
        return [CodeChurnOut(**r) for r in rows]

    async def get_review_network(self, org: str) -> list:
        rows = await self.analytics_repo.get_review_network(org)
        return [ReviewNetworkOut(**r) for r in rows]

    async def get_pr_list(
        self,
        org: str,
        repo: Optional[str],
        author: Optional[str],
        state: Optional[str],
        limit: int,
        offset: int,
    ) -> PRListResponse:
        logger.debug(
            "Fetching PR list for org=%s repo=%s author=%s state=%s limit=%d offset=%d",
            org,
            repo,
            author,
            state,
            limit,
            offset,
        )
        prs, total = await self.pr_repo.list_prs(org, repo, author, state, limit, offset)
        logger.info("PR list: %d/%d PRs returned for org: %s", len(prs), total, org)
        return PRListResponse(
            data=[
                PullRequestOut(
                    id=pr.id,
                    number=pr.number,
                    repo=pr.repo_full_name,
                    title=pr.title,
                    state=pr.state,
                    author=pr.author_login,
                    author_avatar=pr.author_avatar,
                    additions=pr.additions,
                    deletions=pr.deletions,
                    changed_files=pr.changed_files,
                    reviews_count=pr.reviews_count,
                    time_to_merge_hours=pr.time_to_merge_hours,
                    time_to_first_review_hours=pr.time_to_first_review_hours,
                    created_at=pr.created_at,
                    merged_at=pr.merged_at,
                    closed_at=pr.closed_at,
                )
                for pr in prs
            ],
            total=total,
            limit=limit,
            offset=offset,
        )

    async def generate_repo_docs(
        self,
        org: str,
        requested_repos: list[str],
        openai_api_key: Optional[str] = None,
    ) -> DocGenResponse:
        import httpx
        from datetime import datetime
        from sqlalchemy import and_, func, select
        from app.config import settings
        from app.models.pull_request import PullRequest
        from app.models.repository import Repository

        active_api_key = openai_api_key or settings.openai_api_key

        logger.info(
            "Generating documentation for org=%s repos=%s (using_openai=%s)",
            org,
            requested_repos,
            bool(active_api_key),
        )
        all_repo_stats = await self.analytics_repo.get_repo_stats(org)
        
        # Filter requested repos or default to all if empty
        if requested_repos:
            filtered_stats = [
                r for r in all_repo_stats 
                if r["name"] in requested_repos or r["repo"] in requested_repos
            ]
        else:
            filtered_stats = all_repo_stats

        docs: list[RepoDocOut] = []
        combined_markdown_parts = [
            f"# {org} — Automated Documentation Suite",
            f"*Generated by CodePulse on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}*\n",
            "## Table of Contents",
        ]

        for idx, stat in enumerate(filtered_stats, 1):
            repo_name = stat["name"]
            combined_markdown_parts.append(f"{idx}. [{repo_name}](#{repo_name.lower().replace('/', '-')})")

        combined_markdown_parts.append("\n---\n")

        for stat in filtered_stats:
            repo_full_name = stat["repo"]
            repo_name = stat["name"]

            # Query repository details if stored
            db_repo = await self.analytics_repo.db.scalar(
                select(Repository).where(
                    and_(Repository.owner == org, Repository.name == repo_name)
                )
            )

            lang = db_repo.language if db_repo and db_repo.language else "JavaScript / TypeScript"
            description = db_repo.description if db_repo and db_repo.description else f"Core repository for {repo_name}"
            default_branch = db_repo.default_branch if db_repo and db_repo.default_branch else "main"
            stars = db_repo.stars if db_repo else 0
            forks = db_repo.forks if db_repo else 0

            # Query top 5 contributors for this repo
            contrib_rows = await self.analytics_repo.db.execute(
                select(
                    PullRequest.author_login,
                    func.count(PullRequest.id).label("pr_count"),
                    func.sum(PullRequest.additions).label("adds"),
                    func.sum(PullRequest.deletions).label("dels"),
                )
                .where(PullRequest.repo_full_name == repo_full_name)
                .group_by(PullRequest.author_login)
                .order_by(func.count(PullRequest.id).desc())
                .limit(5)
            )
            top_contribs = [
                f"- **@{r.author_login}**: {r.pr_count} PRs (+{r.adds or 0} / -{r.dels or 0} lines)"
                for r in contrib_rows
            ]
            contrib_text = "\n".join(top_contribs) if top_contribs else "- No recent contributor data found."

            # Query recent PRs for showcase
            pr_rows, _ = await self.pr_repo.list_prs(org, repo=repo_name, limit=5, offset=0)
            pr_highlights = [
                f"- `#{pr.number}` **{pr.title}** ({pr.state}) by @{pr.author_login}"
                for pr in pr_rows
            ]
            pr_text = "\n".join(pr_highlights) if pr_highlights else "- No recent pull requests recorded."

            # Structured base context
            context_text = f"""
Repository: {repo_full_name} ({repo_name})
Organization: {org}
Primary Language: {lang}
Description: {description}
Default Branch: {default_branch}
Stars: {stars}, Forks: {forks}
Total Pull Requests: {stat['total_prs']}
Merged PRs: {stat['merged_prs']} ({stat['merge_rate']}% merge rate)
Open PRs: {stat['open_prs']}
Avg Merge Time: {stat['avg_merge_hours']} hours
Avg Review Time: {stat['avg_review_hours']} hours
Contributors: {stat['contributors']}
Top Contributors:
{contrib_text}
Recent PR Highlights:
{pr_text}
"""

            markdown: Optional[str] = None

            # Attempt OpenAI API synthesis if API Key is available
            if active_api_key:
                try:
                    logger.info("Calling OpenAI API for repo documentation: %s", repo_name)
                    async with httpx.AsyncClient(timeout=45) as client:
                        prompt_text = f"""Generate detailed technical documentation for repository {repo_name} using this repository context:
{context_text}

You MUST include the following 15 structured Markdown sections in order:
# {repo_name}
## 1. Project Overview
## 2. Features
## 3. Technology Stack
## 4. Architecture Overview
## 5. Project Structure
## 6. Getting Started / Installation
## 7. Configuration
## 8. Usage Guide
## 9. API Documentation
## 10. Database Documentation
## 11. Authentication & Authorization
## 12. Deployment Guide
## 13. Testing
## 14. Logging & Monitoring
## 15. Security Considerations
"""
                        resp = await client.post(
                            "https://api.openai.com/v1/chat/completions",
                            headers={
                                "Authorization": f"Bearer {active_api_key}",
                                "Content-Type": "application/json",
                            },
                            json={
                                "model": "gpt-4o-mini",
                                "messages": [
                                    {
                                        "role": "system",
                                        "content": (
                                            "You are an expert software architect, technical writer, and developer advocate. "
                                            "Generate structured, professional, production-grade Markdown documentation covering all 15 specified sections. "
                                            "Base every fact on the provided context without fabricating unsupported details."
                                        ),
                                    },
                                    {
                                        "role": "user",
                                        "content": prompt_text,
                                    },
                                ],
                                "temperature": 0.3,
                            },
                        )
                        resp.raise_for_status()
                        ai_json = resp.json()
                        markdown = ai_json["choices"][0]["message"]["content"]
                        logger.info("Successfully generated OpenAI documentation for %s", repo_name)
                except Exception as exc:
                    logger.warning("OpenAI API call failed for %s (%s). Falling back to empirical generator.", repo_name, exc)

            # Fallback to empirical markdown generator if OpenAI not available or failed
            if not markdown:
                markdown = f"""# {repo_name}

> {description}

## 1. Project Overview

- **Repository**: `{repo_full_name}`
- **Primary Language**: `{lang}`
- **Default Branch**: `{default_branch}`
- **Stars**: {stars} | **Forks**: {forks}
- **Organization**: `{org}`

{repo_name} is a key software repository within the `{org}` organization ecosystem designed for high-performance engineering productivity, code review analytics, and software delivery workflows.

---

## 2. Features

- **Automated Pull Request Tracking**: Full tracking of open, merged, and closed PR velocity.
- **Developer & Contributor Insights**: Leaderboards for merged PRs, additions/deletions line count, and review participation rates.
- **Review Pipeline Optimization**: Metric tracking for average time-to-first-review and time-to-merge bottlenecks.
- **CI/CD Reliability Checks**: Pipeline duration trends, build pass rates, and flaky workflow detection.
- **Burnout & Commit Signals**: Commit churn ratio and after-hours development pattern surfacing.

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| **Primary Language** | `{lang}` |
| **VCS Provider** | GitHub / GitLab |
| **Data Layer** | PostgreSQL (relational metric store) |
| **API Client Protocol** | GraphQL / REST v4 |
| **CI/CD Engine** | GitHub Actions / GitLab Pipelines |

---

## 4. Architecture Overview

```mermaid
graph TD
    Client["Developer / System Client"] --> API["API Layer"]
    API --> Service["Business Logic & Analytics Service"]
    Service --> Store[("PostgreSQL Database")]
    Service --> VCS["VCS Provider (GitHub/GitLab)"]
```

The application operates as a decoupled service layer that ingests raw version control events, processes velocity statistics, and persists analytics into PostgreSQL for rapid, rate-limit-free querying.

---

## 5. Project Structure

```
{repo_name}/
├── src/                # Primary source code modules
├── tests/              # Automated unit and integration tests
├── config/             # Environment and runtime configurations
├── docs/               # Technical documentation assets
├── Dockerfile          # Container build definition
└── README.md           # Project entry point documentation
```

---

## 6. Getting Started / Installation

### Prerequisites
- Node.js 20+ / Python 3.9+ / Docker
- Git 2.30+

### Setup Instructions

```bash
# 1. Clone the repository
git clone https://github.com/{repo_full_name}.git
cd {repo_name}

# 2. Checkout standard default branch
git checkout {default_branch}

# 3. Install dependencies
# (Execute using detected package manager)
```

---

## 7. Configuration

| Parameter | Type | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | String | `postgresql://...` | Connection URI for the analytics database |
| `API_PORT` | Integer | `8000` | Local port for service listener |
| `LOG_LEVEL` | String | `INFO` | Logging verbosity level (`DEBUG`, `INFO`, `WARN`, `ERROR`) |

---

## 8. Usage Guide

1. Ensure environment variables are loaded from `.env`.
2. Start the application service or development server.
3. Access local endpoints or dashboards to monitor pull requests, code reviews, and commit velocity.

---

## 9. API Documentation

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health status check |
| `GET` | `/api/metrics` | Summary metrics for pull requests and builds |
| `POST` | `/api/sync` | Trigger data synchronization job |

---

## 10. Database Documentation

The database schema models core engineering entities:
- **Repositories**: Stores repo metadata (`{repo_full_name}`, stars, language).
- **PullRequests**: Tracks state, author (`{contrib_text.splitlines()[0] if contrib_rows else '@developer'}`), additions, deletions, merge duration.
- **Reviews**: Records reviewer participation and feedback states.
- **WorkflowRuns**: Captures build durations and status conclusions.

---

## 11. Authentication & Authorization

- **OAuth 2.0 Integration**: Authentication via GitHub / GitLab OAuth.
- **Session Tokens**: JWT (JSON Web Tokens) signed with HS256 algorithm.
- **Header Standard**: `Authorization: Bearer <jwt_token>` header on protected endpoints.

---

## 12. Deployment Guide

### Containerization (Docker)

```bash
# Build container image
docker build -t {repo_name}:latest .

# Run containerized instance
docker run -d -p 8000:8000 --env-file .env {repo_name}:latest
```

---

## 13. Testing

### Running Tests

```bash
# Execute test suite
pytest tests/ -v
```

Automated PR verification workflows run Ruff linting, type checks, database migration tests, and API regression suites.

---

## 14. Logging & Monitoring

- **Structured Logging**: Standard JSON / stream format outputted to stdout.
- **Health Checks**: Endpoint `/health` returns `{{"status": "ok"}}` for container orchestrator readiness probes.

---

## 15. Security Considerations

- **Credential Management**: Store secrets in environment variables, never in version control.
- **Authentication Guards**: Enforce 401 Unauthorized verification on all private routes.
- **CORS Policies**: Strict cross-origin resource sharing restrictions configured for approved origins.
"""

            doc_out = RepoDocOut(
                repo_name=repo_name,
                title=f"{repo_name} Documentation",
                summary=description,
                markdown=markdown,
                total_prs=stat["total_prs"],
                contributors=stat["contributors"],
                primary_language=lang,
                stars=stars,
                forks=forks,
            )
            docs.append(doc_out)
            combined_markdown_parts.append(markdown)

        combined_markdown = "\n\n---\n\n".join(combined_markdown_parts)

        return DocGenResponse(
            org=org,
            generated_at=datetime.utcnow().isoformat(),
            docs=docs,
            combined_markdown=combined_markdown,
        )



