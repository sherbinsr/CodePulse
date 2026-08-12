# GitAudit — AI Agent Developer Guide (`AGENTS.md`)

Welcome to **GitAudit**! This repository is an enterprise-grade Engineering Productivity & PR Analytics Platform featuring repository documentation management, developer performance insights, CI build health tracking, and project Kanban boards.

This document serves as the authoritative operational guide for AI coding agents and human developers working on this codebase.

---

## 1. System & Architecture Overview

GitAudit uses a decoupled client-server architecture with a Next.js frontend, a FastAPI backend, PostgreSQL for relational data, and AWS S3 (or S3-compatible MinIO) for document blob storage.

```mermaid
flowchart TB
    subgraph Client ["Frontend (Next.js 15 App Router)"]
        UI["React 19 Dashboard UI"]
        PDF["Native PDF Blob Viewer"]
        DOC["Word Preview Engine"]
        KANBAN["Repository Kanban Board"]
    end

    subgraph API ["Backend Engine (FastAPI & Python 3.12)"]
        AUTH["Auth Router & JWT Middleware"]
        DOC_ROUTER["Documentation Router"]
        PROJ_ROUTER["Project Management Router"]
        ANALYTICS_ROUTER["Analytics Router"]
        SYNC_SERVICE["GitHub/GitLab Sync Service"]
    end

    subgraph Storage ["Data & Persistence Layer"]
        DB[(PostgreSQL 16 Database)]
        S3["AWS S3 Bucket (gitaudit)"]
    end

    subgraph Providers ["External Git Providers"]
        GH["GitHub REST & GraphQL API"]
        GL["GitLab REST API"]
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

### Key Technical Stack
- **Frontend**: Next.js 15 (App Router, React 19), TypeScript, Tailwind CSS v3, Radix UI / shadcn/ui primitives, Recharts, Axios, next-themes.
- **Backend**: FastAPI (Python 3.9+ / 3.12), SQLAlchemy 2.0 (Async engine via `asyncpg`), Alembic migrations, Pydantic v2, Boto3 (S3 SDK), PyJWT.
- **Database & Storage**: PostgreSQL 16, AWS S3 / MinIO.
- **Authentication**: GitHub OAuth 2.0 & GitLab OAuth 2.0 issuing JWT Bearer tokens.

---

## 2. Project Directory Structure

```
GitAudit/
├── agent.md                    # AI Agent Guide
├── AGENTS.md                   # AI Agent Guide (this file)
├── Documentation.md            # Comprehensive system & technical docs
├── README.md                   # Project overview & quickstart
├── docker-compose.yml          # Local container development setup
├── docker-compose-prod.yml     # Production container orchestration
├── backend/                    # FastAPI Backend Application
│   ├── app/
│   │   ├── main.py             # FastAPI entrypoint, middleware, CORS setup
│   │   ├── config.py           # Pydantic BaseSettings config
│   │   ├── database.py         # Async SQLAlchemy engine & session factory
│   │   ├── models/             # SQLAlchemy ORM models
│   │   │   ├── user.py
│   │   │   ├── repository.py
│   │   │   ├── pull_request.py
│   │   │   ├── documentation.py
│   │   │   ├── project.py
│   │   │   ├── commit.py
│   │   │   └── workflow_run.py
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── repositories/       # Raw DB access layer (queries & aggregations)
│   │   ├── services/           # Core business logic (Sync, S3, OAuth, Analytics)
│   │   └── routers/            # FastAPI route handlers
│   │       ├── auth_router.py
│   │       ├── org_router.py
│   │       ├── analytics_router.py
│   │       ├── documentation_router.py
│   │       └── project_router.py
│   ├── migrations/             # Alembic migration revisions
│   ├── tests/                  # Pytest backend test suite
│   ├── alembic.ini             # Alembic configuration
│   ├── pyproject.toml          # Ruff linter & Pytest config
│   └── requirements.txt        # Python dependency manifest
└── frontend/                   # Next.js Frontend Application
    ├── app/                    # Next.js 15 App Router pages
    │   ├── page.tsx            # Landing & OAuth sign-in page
    │   ├── auth/callback/      # OAuth callback handler
    │   └── dashboard/          # Analytics & Documentation Dashboard
    │       ├── page.tsx        # Org overview & trends
    │       ├── documentations/ # Knowledge hub & doc management
    │       ├── repositories/   # Per-repo stats & tables
    │       ├── developers/     # Developer leaderboard & profiles
    │       ├── reviews/        # Review activity & heatmaps
    │       ├── pr-insights/    # Filterable PR table
    │       ├── ci-insights/    # CI build health & flaky tests
    │       ├── commit-activity/# Commit velocity & churn
    │       ├── projects/       # Repository Kanban boards
    │       └── digest/         # AI-generated weekly digest
    ├── components/             # Reusable React components
    │   ├── dashboard/          # Charts, metric cards, tables
    │   ├── documentation/      # Markdown editor, PDF viewer, Word viewer
    │   ├── layout/             # Sidebar, Header, UserMenu, ThemeToggle
    │   └── providers/          # ThemeProvider and Global context wrappers
    ├── lib/                    # Core utilities & clients
    │   ├── api.ts              # Axios HTTP client with JWT interceptors
    │   ├── auth.ts             # Auth tokens & local storage utilities
    │   └── utils.ts            # Tailwind `cn()` helper & formatters
    ├── types/                  # TypeScript interfaces & API types
    └── package.json            # Node.js dependencies & scripts
```

---

## 3. Environment Setup & Development Commands

### Prerequisites
- Node.js 20+
- Python 3.9+ (Python 3.12 recommended)
- PostgreSQL 16+
- Docker & Docker Compose (optional for local infra)

### Environment Files
1. Copy [`.env.example`](file:///Users/abhinavp/Projects/CodePulse/.env.example) to `backend/.env` and fill in:
   - `DATABASE_URL=postgresql+asyncpg://gitaudit:gitaudit@localhost:5432/gitaudit`
   - `SECRET_KEY=your_jwt_secret_key`
   - `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME=gitaudit`
2. Copy [`.env.example`](file:///Users/abhinavp/Projects/CodePulse/.env.example) to `frontend/.env.local` and set:
   - `NEXT_PUBLIC_API_URL=http://localhost:8000`
   - `NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id`

### Quick Commands

#### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start dev server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend
```bash
cd frontend
npm install

# Start dev server
npm run dev

# Run linter
npm run lint

# Build production bundle
npm run build
```

#### Docker Environment
```bash
docker compose up --build
```

---

## 4. Architectural Rules & Coding Standards

### Backend Layering (FastAPI & SQLAlchemy)
1. **Separation of Concerns**:
   - `routers/`: Keep route handlers thin. Handle request validation, HTTP exceptions, and return Pydantic schemas.
   - `services/`: Business logic orchestration (e.g. GitHub API interactions, S3 file uploads, digest generation).
   - `repositories/`: Pure database access layer. All SQL query execution and aggregation logic belongs here.
   - `models/`: SQLAlchemy 2.0 ORM class declarations.
   - `schemas/`: Pydantic v2 schemas for request bodies and response payload definitions.
2. **Async SQLAlchemy 2.0**:
   - Always use `async` database sessions (`AsyncSession`).
   - Use `select()`, `exec()`, `scalars()` syntax with `await db.execute(...)`.
   - Do NOT use blocking synchronous calls inside database functions.
3. **Database Migrations**:
   - Never alter ORM models without generating a corresponding Alembic migration (`alembic revision --autogenerate -m "description"`).
   - Test migrations using `alembic upgrade head` and `alembic downgrade -1`.

### Frontend Guidelines (Next.js 15 & React 19)
1. **Component Design & Aesthetics**:
   - Build rich, modern, responsive UIs with dark mode support (`next-themes`).
   - Use glassmorphism, subtle gradients, and micro-interactions where appropriate.
   - Use Lucide icons (`lucide-react`) and shadcn/Radix UI components.
2. **State & API Handling**:
   - Use [`lib/api.ts`](file:///Users/abhinavp/Projects/CodePulse/frontend/lib/api.ts) for external requests to ensure JWT Bearer tokens are attached automatically.
   - Handle loading states, empty states, and API error toasts cleanly using `sonner`.
3. **Type Safety**:
   - Define TypeScript interfaces for all API response objects in [`types/`](file:///Users/abhinavp/Projects/CodePulse/frontend/types/).
   - Avoid `any` types.

---

## 5. Verification & Testing Workflows for AI Agents

Before declaring any task or feature as complete, AI agents **MUST** execute the following verification steps:

> [!IMPORTANT]
> Never declare success until all linters, builds, and test commands complete with 0 errors.

1. **Backend Verification**:
   - Run Ruff linter:
     ```bash
     cd backend && ruff check .
     ```
   - Run Pytest suite:
     ```bash
     cd backend && pytest
     ```
2. **Frontend Verification**:
   - Run ESLint:
     ```bash
     cd frontend && npm run lint
     ```
   - Run Production Build Check:
     ```bash
     cd frontend && npm run build
     ```
3. **Runtime & Log Verification**:
   - If runtime errors occur, inspect the exact log output before attempting a fix.
   - Do not mask underlying errors with try-except blocks or fallback dummy values.

---

## 6. Common Pitfalls & Agent Gotchas

- **Async DB Sessions**: Ensure `db` session dependencies in `deps.py` are properly yielded as async sessions.
- **S3 Fallbacks**: In local development without AWS credentials, S3 uploads fall back gracefully or log warnings. Ensure code handles missing S3 bucket scenarios without crashing.
- **Hydration Errors**: When rendering dark/light theme dependent UI, ensure components wrapped with `useTheme` are evaluated safely on the client.
- **API Base URL**: Frontend requests must point to `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).

---
*End of AGENTS.md*
