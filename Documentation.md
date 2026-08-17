# GitAudit Architecture & Technical Documentation

GitAudit is an enterprise-grade Git Engineering Intelligence & Repository Management Platform built for software engineering teams, engineering directors, and project leads. It unifies repository analytics, automated PR & CI tracking, multi-file repository documentation, built-in repository Kanban project management, and multi-provider OAuth (GitHub & GitLab) into a single, real-time dashboard.

---

## 1. System Architecture Overview

GitAudit follows a modern **decoupled micro-service client-server architecture** using Next.js on the frontend, FastAPI on the backend, and PostgreSQL with AWS S3 for persistence.

```mermaid
flowchart TB
    subgraph Client ["Frontend (Next.js 15 App Router)"]
        UI["React 19 Dashboard UI"]
        PDF["Native PDF Blob Viewer Engine"]
        DOC["Word (.doc/.docx) Preview Engine"]
        KANBAN["Repository Kanban Board Component"]
    end

    subgraph API ["Backend Engine (FastAPI & Python 3.12)"]
        AUTH["Auth Router & JWT Middleware"]
        DOC_ROUTER["Documentation Router"]
        PROJ_ROUTER["Project Management Router"]
        ANALYTICS_ROUTER["Analytics & Repo Stats Router"]
        SYNC_SERVICE["GitHub/GitLab Sync Service"]
    end

    subgraph Storage ["Data & Storage Layer"]
        DB[(PostgreSQL 16 Database)]
        S3["AWS S3 Bucket (gitaudit)"]
    end

    subgraph Providers ["External Git Providers"]
        GH["GitHub REST & GraphQL API v4"]
        GL["GitLab REST API v4"]
    end

    UI -->|REST API / JWT Bearer| AUTH
    UI -->|Binary Stream Blobs| DOC_ROUTER
    UI -->|Kanban State & Tasks| PROJ_ROUTER
    UI -->|Repo Stats & Trends| ANALYTICS_ROUTER

    DOC_ROUTER -->|Metadata & Content| DB
    DOC_ROUTER -->|Binary File Uploads| S3
    PROJ_ROUTER -->|Task & Board State| DB
    ANALYTICS_ROUTER -->|Aggregations & Stats| DB

    SYNC_SERVICE -->|Auto-Discover Repos/PRs| GH
    SYNC_SERVICE -->|GraphQL / REST Queries| GL
    SYNC_SERVICE -->|Persist Repo State| DB
```

---

## 2. Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router, React 19)
- **Styling**: Tailwind CSS v3 (Custom Dark Mode tokens, Responsive Glassmorphism Design System)
- **Icons & UI Components**: Lucide React, Radix UI Primitives, Recharts (Data Visualization)
- **HTTP Client**: Axios (with Request/Response Interceptors for JWT authentication)

### Backend
- **Framework**: FastAPI (Python 3.12, Async ASGI Application)
- **Database ORM**: SQLAlchemy 2.0 (Async Engine via `asyncpg`)
- **Validation**: Pydantic v2 schemas
- **Authentication**: OAuth 2.0 (GitHub & GitLab), PyJWT (JSON Web Tokens)
- **Storage Engine**: `boto3` (AWS S3 Integration)

### Infrastructure & Deployment
- **Database**: PostgreSQL 16 (Alpine)
- **Storage**: AWS S3 Bucket (`gitaudit`)
- **Containerization**: Docker & Docker Compose (`docker-compose.yml`)

---

## 3. Database Architecture & ER Diagram

GitAudit uses a relational model in PostgreSQL designed for low latency queries, case-insensitive organization searching, and rich project task associations.

```mermaid
erDiagram
    users ||--o{ custom_organizations : "manages"
    users ||--o{ vulnerability_scans : "initiates"
    repositories ||--o{ documentations : "contains"
    repositories ||--o{ pull_requests : "has"
    repositories ||--o{ repo_projects : "owns"
    pull_requests ||--o{ pr_reviews : "has"
    repo_projects ||--o{ project_tasks : "contains"

    users {
        int id PK
        string github_id UK
        string gitlab_id UK
        string login
        string name
        string email
        string avatar_url
        string github_token
        string gitlab_token
        string openai_api_key
        string openai_model
        datetime created_at
        datetime updated_at
    }

    repositories {
        int id PK
        string full_name UK
        string provider
        string name
        string owner
        string description
        string language
        int stars
        int forks
        datetime synced_at
        datetime created_at
    }

    documentations {
        int id PK
        int repository_id FK
        string file_name
        string file_type
        string s3_bucket
        string s3_key
        string s3_url
        text content
        string source
        datetime created_at
        datetime updated_at
    }

    pull_requests {
        int id PK
        string github_id UK
        int number
        string repo_full_name
        string org
        string title
        string state
        string author_login
        float time_to_merge_hours
        float time_to_first_review_hours
        datetime created_at
        datetime merged_at
    }

    repo_projects {
        int id PK
        string org
        string repo_name
        int repository_id FK
        string name
        string description
        string key_prefix
        string status
        text columns_json
        datetime created_at
        datetime updated_at
    }

    project_tasks {
        int id PK
        int project_id FK
        string ticket_key
        string title
        text description
        string status
        string priority
        text assignees_json
        text labels_json
        int story_points
        datetime created_at
        datetime updated_at
    }

    vulnerability_scans {
        int id PK
        string org
        string repo_name
        string repo_full_name
        string provider
        int security_score
        string grade
        int critical_count
        int high_count
        int medium_count
        int low_count
        string status
        text findings
        text dependency_report
        text remediation_roadmap
        datetime created_at
    }
```

### Key Models Breakdown

| Model | Table Name | Purpose |
| :--- | :--- | :--- |
| `User` | `users` | Stores authenticated user credentials, OAuth tokens (GitHub/GitLab), OpenAI API key & model preferences. |
| `Repository` | `repositories` | Central entity representing tracked repositories (name, owner, provider, language, stars, forks). |
| `Documentation` | `documentations` | Tracks architecture documents, API specs, guides, uploaded PDFs, Word docs, and Markdown files linked to a repository. Stores binary files in S3 and text in DB. |
| `PullRequest` | `pull_requests` | Stores PR metadata, cycle times (time to first review, time to merge), CI workflow action summaries, and status (OPEN, MERGED, CLOSED). |
| `PRReview` | `pr_reviews` | Tracks code reviews, reviewer logins, review states (APPROVED, CHANGES_REQUESTED), and review latency. |
| `RepoProject` | `repo_projects` | Built-in Kanban project boards created for a specific repository (stores custom columns, ticket key prefixes like `SSA`, `ENG`). |
| `ProjectTask` | `project_tasks` | Individual tasks, user stories, or bugs on a repository Kanban board with story points, assignees, labels, and ticket keys. |
| `VulnerabilityScan` | `vulnerability_scans` | Stores AI-driven repository security assessments, dependency CVEs, config review, security scores (0-100), and remediation roadmaps. |
| `Commit` | `commits` | Stores commit metadata, authors, and timestamps for velocity and churn tracking. |
| `WorkflowRun` | `workflow_runs` | Tracks CI/CD pipeline runs, run durations, conclusions (success/failure), and flaky workflow analytics. |
| `CustomOrganization` | `custom_organizations` | Allows users to track additional GitHub/GitLab organizations or user accounts. |
| `SyncJob` | `sync_jobs` | Logs background synchronization status, execution times, and errors. |

---

## 4. Feature Modules

### A. Repository Documentation & Knowledge Hub Engine
- **Multi-Format Document Support**:
  - **Markdown (`.md`)**: Full markdown preview with syntax highlighting and raw source toggle.
  - **PDF (`.pdf`)**: Native HTML5 `<iframe>` PDF viewer rendering binary streams dynamically via Blob URLs (`URL.createObjectURL(blob)`), eliminating third-party npm package overhead.
  - **Word (`.doc`, `.docx`)**: Native Word Document preview card displaying file size, direct stream download button, and Google Docs online viewer integration.
- **Direct S3 Upload & Synchronization**: Binary files uploaded via `Multipart/Form-Data` are automatically streamed to AWS S3 (`gitaudit` bucket) while metadata is indexed in PostgreSQL.
- **Responsive Card Layout**: Repository cards dynamically expand using a flex-wrap container so adding multiple documents never causes page overflow. When no documents exist for a repo, the blue **Add Documentation** button aligns to the top right.

### B. Repository Projects & Kanban Engine
- **Repository-Specific Projects**: Create custom Kanban boards tailored to any repository in the organization.
- **Customizable Columns**: Configure customized workflow columns (e.g., *Backlog, Todo, In Progress, In Review, Done*).
- **Ticket Key Generator**: Generates formatted ticket keys (e.g., `APP-I100`, `CHAT-I102`) based on custom or auto-generated project key prefixes.
- **Drag-and-Drop Interactive Board**: Seamlessly update task status across columns.
- **GitHub Issue & PR 2-Way Sync**: Optionally sync created project tasks directly to GitHub Issues and view linked PR status.

### C. Comprehensive Organization Repository Analytics
- **Auto-Discovery**: Automatically fetches all organization and user repositories via GitHub REST API pagination (`fetch_all_org_repos_rest`), ensuring 100% of repositories (e.g. all 29 repos for an organization) are listed in dropdowns and repository analytics tables.
- **Case-Insensitive Querying**: Case-insensitive database matching (`ilike`) ensures user handles like `Rajeesh-Thuneri` match seamlessly regardless of casing.

---

## 5. API Endpoints Reference

### Authentication Routes (`/api/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/github/callback` | Exchange GitHub OAuth code for JWT access token. |
| `POST` | `/api/auth/gitlab/callback` | Exchange GitLab OAuth code for JWT access token. |
| `GET` | `/api/auth/me` | Return authenticated user profile. |

### Documentation Routes (`/api/documentations`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/documentations` | List all repositories for an organization with attached documentation files. |
| `GET` | `/api/documentations/{doc_id}` | Fetch documentation metadata and content (supports raw binary blob download). |
| `POST` | `/api/documentations` | Create inline text or markdown documentation for a repository. |
| `POST` | `/api/documentations/upload` | Upload binary file (`.pdf`, `.doc`, `.docx`, `.md`) to S3 and save metadata. |
| `PUT` | `/api/documentations/{doc_id}` | Update existing documentation content or title. |
| `DELETE` | `/api/documentations/{doc_id}` | Delete documentation entry and S3 object. |

### Project Management Routes (`/api/projects`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/projects/repos/{org}/{repo_name}` | List built-in Kanban projects created for a repository. |
| `POST` | `/api/projects/repos/{org}/{repo_name}` | Create a new project for a repository. |
| `GET` | `/api/projects/repo-projects/{project_id}/board` | Fetch full project board with columns and tasks. |
| `PUT` | `/api/projects/repo-projects/{project_id}` | Update project metadata or custom columns. |
| `DELETE` | `/api/projects/repo-projects/{project_id}` | Delete a repository project. |
| `POST` | `/api/projects/repo-projects/{project_id}/tasks` | Create a new task in a project board. |
| `PUT` | `/api/projects/tasks/{task_id}` | Update task details or move status column. |
| `DELETE` | `/api/projects/tasks/{task_id}` | Delete a project task. |

### Analytics & Repository Routes (`/api/analytics`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/analytics/{org}/repositories` | Return statistics and metadata for all organization repositories. |
| `GET` | `/api/analytics/{org}/overview` | High-level metrics (total repos, PR count, merged PRs, open PRs). |
| `GET` | `/api/analytics/{org}/developers` | Developer contribution metrics (PRs created, reviews done, merge rate). |
| `GET` | `/api/analytics/{org}/pr-insights` | Detailed pull request review latency and cycle time analytics. |
| `GET` | `/api/analytics/{org}/ci-insights` | Continuous integration build trends and workflow stats. |

---

## 6. Local Setup & Deployment Guide

### Environment Configuration (`.env`)

Create a `.env` file in the root directory:

```env
# ── GitHub OAuth ─────────────────────────────────────────────────────────────
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:3000/auth/callback

# ── Auth Security ────────────────────────────────────────────────────────────
SECRET_KEY=your_super_secret_jwt_key_here

# ── Database ─────────────────────────────────────────────────────────────────
POSTGRES_USER=gitaudit
POSTGRES_PASSWORD=gitaudit
POSTGRES_DB=gitaudit
DATABASE_URL=postgresql+asyncpg://gitaudit:gitaudit@localhost:5432/gitaudit

# ── AWS S3 Storage ───────────────────────────────────────────────────────────
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-south-1
S3_BUCKET_NAME=gitaudit

# ── Frontend Public Vars ──────────────────────────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
```

### Production Deployment via Docker Compose

Run the following command to build and launch all services (Frontend, Backend, PostgreSQL):

```bash
docker compose up --build -d
```

Services will be available at:
- **Frontend Dashboard**: `http://localhost:3000`
- **Backend FastAPI Docs**: `http://localhost:8000/docs`
- **PostgreSQL Database**: `localhost:5432`

---
*Documentation compiled for GitAudit Repository Management Platform.*
