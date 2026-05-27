# CodePulse

Engineering Productivity & PR Analytics Platform. Connect your GitHub organization and get deep insights into pull requests, code reviews, developer performance, CI health, and team velocity — all stored locally for fast, rate-limit-free dashboards.

---

## Features

### Dashboard & Overview
- **Org Overview** — total PRs, merge rate, avg review time, contributor count with trend indicators
- **Monthly PR Trends** — area charts showing PR velocity and merge rate over time
- **Dark / Light Mode** — one-click theme toggle persisted across sessions

### Repository Analytics
- **Per-repo PR volume** — open, merged, and closed PR counts
- **Merge trends** — monthly breakdown per repository
- **Contributor breakdown** — who is contributing to which repos
- **Sortable repository table** — filter and rank repos by any metric

### Developer Analytics
- **Contributor leaderboard** — ranked by PRs merged, reviews given, and lines changed
- **Individual developer profiles** — deep-dive stats per developer
- **Avg merge time per developer** — horizontal bar chart comparison
- **Review participation rate** — how often each developer reviews others' work

### Code Review Analytics
- **Top reviewers** — ranked by review count with progress bars
- **Review activity heatmap** — hour-of-day × day-of-week breakdown showing when reviews happen
- **Avg merge time by developer** — identify bottlenecks in the review pipeline

### PR Insights
- **Filterable PR table** — filter by repository, author, state, and date range
- **Paginated results** — handles large orgs efficiently
- **PR state badges** — open, merged, closed with colour coding

### CI Insights
- **Build duration trends** — avg build time per workflow over time
- **Success rate charts** — CI pass/fail trends by workflow
- **Flaky test detection** — workflows with high failure variance flagged automatically
- **Per-workflow breakdown** — identify which pipelines are slowest or least reliable

### Commit Activity
- **Commit churn ratio** — lines added vs deleted, highlights high-churn periods
- **After-hours signals** — tracks commits outside working hours
- **Burnout detection** — late-night and weekend commit patterns surfaced per developer
- **Code velocity** — commit frequency trends over time

### Weekly Digest
- **AI-generated team summary** — narrative overview of the week's activity
- **Key metric highlights** — top contributors, busiest repos, notable PRs
- **Digest preview** — review before sharing with the team
- **Period selector** — weekly or monthly digest windows

### Background Sync
- One-time GitHub GraphQL sync stores all data in PostgreSQL
- All dashboard queries run against local DB — no GitHub API rate limits during browsing
- Sync status polling so you see progress in real time

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| Backend | FastAPI, Python 3.9+, SQLAlchemy (async), Alembic |
| Database | PostgreSQL |
| Auth | GitHub OAuth 2.0 → JWT |
| Data Source | GitHub REST API + GraphQL API |
| Theming | next-themes (dark / light mode) |

---

## Architecture

```
Next.js Frontend (port 3000)
        │
        ▼
FastAPI Backend (port 8000)
        │
        ├── GitHub OAuth → JWT auth
        ├── GitHub GraphQL API (sync)
        └── PostgreSQL (analytics store)
```

**Backend layers:**
```
routers/        HTTP layer — thin, calls services, uses schemas
services/       Business logic — orchestrates repos + GitHub API
repositories/   Data access layer — raw DB queries only
models/         SQLAlchemy ORM — table definitions
schemas/        Pydantic — request/response contracts
migrations/     Alembic — schema versioning
```

---

## Project Structure

```
CodePulse/
├── backend/
│   ├── app/
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── repositories/       # DB access layer
│   │   ├── services/           # Business logic
│   │   ├── routers/            # FastAPI route handlers
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   ├── migrations/
│   │   └── versions/
│   │       └── 001_initial_schema.py
│   ├── alembic.ini
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── page.tsx            # Org overview
│   │   │   ├── repositories/       # Repository analytics
│   │   │   ├── developers/         # Developer profiles & leaderboard
│   │   │   ├── reviews/            # Review analytics & heatmap
│   │   │   ├── pr-insights/        # Filterable PR table
│   │   │   ├── ci-insights/        # CI build health & flaky tests
│   │   │   ├── commit-activity/    # Commit churn & burnout signals
│   │   │   └── digest/             # AI weekly team digest
│   │   ├── auth/callback/          # GitHub OAuth handler
│   │   └── page.tsx                # Landing / sign-in page
│   ├── components/
│   │   ├── dashboard/              # Charts, leaderboard, stat cards
│   │   ├── layout/                 # Sidebar, header, theme toggle
│   │   └── providers/              # ThemeProvider wrapper
│   ├── lib/                        # API client, auth helpers, utils
│   ├── types/                      # TypeScript interfaces
│   └── .env.local
├── docker-compose.yml
└── .env.example
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.9+
- PostgreSQL 14+

### 1. Clone & setup environment

```bash
git clone https://github.com/sherbinsr/CodePulse.git
cd CodePulse
```

Create backend env:
```bash
cp .env.example backend/.env
# Edit backend/.env with your values
```

Create frontend env:
```bash
cp .env.example frontend/.env.local
# Edit frontend/.env.local with your values
```

### 2. Create a GitHub OAuth App

Go to `github.com/settings/developers → OAuth Apps → New OAuth App`:

| Field | Value |
|---|---|
| Homepage URL | `http://localhost:3000` |
| Authorization callback URL | `http://localhost:3000/auth/callback` |

Copy the **Client ID** and **Client Secret** into `backend/.env` and `frontend/.env.local`.

### 3. Setup the database

```bash
psql -U postgres
```
```sql
CREATE USER codepulse WITH PASSWORD 'codepulse';
CREATE DATABASE codepulse OWNER codepulse;
GRANT ALL PRIVILEGES ON DATABASE codepulse TO codepulse;
\q
```

### 4. Run the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Apply migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API available at `http://localhost:8000`  
Swagger docs at `http://localhost:8000/docs`

### 5. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:3000`

---

## Running with Docker

```bash
cp .env.example .env
# Fill in GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SECRET_KEY

docker compose up --build
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `GITHUB_REDIRECT_URI` | OAuth callback URL |
| `SECRET_KEY` | JWT signing secret (`openssl rand -hex 32`) |
| `FRONTEND_URL` | Frontend origin for CORS |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_GITHUB_CLIENT_ID` | GitHub OAuth App client ID |

---

## API Endpoints

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/github/callback` | Exchange GitHub OAuth code for JWT |
| `GET` | `/api/auth/me` | Get authenticated user |

### Organizations

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/orgs` | List user's GitHub organizations |
| `POST` | `/api/orgs/{org}/sync` | Trigger background data sync |
| `GET` | `/api/orgs/{org}/sync/status` | Get sync job status |

### Analytics

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics/{org}/overview` | Org-level metrics summary |
| `GET` | `/api/analytics/{org}/developers` | Per-developer stats |
| `GET` | `/api/analytics/{org}/repositories` | Per-repo stats |
| `GET` | `/api/analytics/{org}/trends` | Monthly PR trends |
| `GET` | `/api/analytics/{org}/review-network` | Who reviews whose PRs |
| `GET` | `/api/analytics/{org}/prs` | Paginated PR list with filters |
| `GET` | `/api/analytics/{org}/digest` | AI-generated weekly team digest |
| `GET` | `/api/analytics/{org}/ci-summary` | CI build summary per workflow |
| `GET` | `/api/analytics/{org}/ci-trends` | CI success rate trends over time |
| `GET` | `/api/analytics/{org}/ci-flaky` | Flaky workflow detection |
| `GET` | `/api/analytics/{org}/commit-activity` | Commit frequency and after-hours signals |
| `GET` | `/api/analytics/{org}/commit-churn` | Code churn ratio per developer |

---

## Database Migrations

```bash
# Apply all migrations
alembic upgrade head

# Generate migration after model changes
alembic revision --autogenerate -m "description"

# Rollback one step
alembic downgrade -1

# Check current revision
alembic current
```

---

## How Sync Works

1. User clicks **Sync Now** on the dashboard
2. Frontend calls `POST /api/orgs/{org}/sync`
3. Backend creates a `SyncJob` and runs in the background
4. GitHub GraphQL API is called — fetches all repos, PRs, reviews, CI runs, and commits in paginated batches
5. Data is stored in PostgreSQL
6. Frontend polls `GET /api/orgs/{org}/sync/status` until `done`
7. All dashboard pages query from PostgreSQL — fast, no GitHub API rate limits

---

## License

MIT
