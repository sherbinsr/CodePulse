# GitAudit

Engineering Productivity & PR Analytics Platform. Connect your GitHub or GitLab organization and get deep insights into pull requests, code reviews, developer performance, CI health, team velocity, and project documentation — all stored locally for fast, rate-limit-free dashboards.

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

### Repository Documentation & Knowledge Hub
- **Repository Documentation Management** — create, view, edit, and delete technical documentation per repository
- **25 Standardized Document Types** — support for 25 pre-configured document types (e.g. *Architecture Document*, *Database Design*, *API Documentation*, *BRD*, *PRD*, *Developer Guide*, *Security*, *FAQ*)
- **Multi-Format Creation & Uploads**:
  - **Built-in Markdown Editor** — write markdown with live preview and side-by-side split editing
  - **Document File Upload** — upload `.pdf`, `.doc`, `.docx`, `.md`, and `.txt` files stored securely in cloud storage
  - **Attach External Links** — link external resources from Notion, Confluence, Google Docs, Figma, or GitHub Wikis
- **Native Document Viewers**:
  - **Interactive PDF Viewer** — embedded PDF previewer inside the View modal with direct download options
  - **Word Document Viewer** — Word (.doc / .docx) preview card with direct download and Google Docs online viewer integration
  - **Markdown & Raw Code Viewer** — rendered Markdown preview and source code inspector
- **Responsive Multi-Doc Support** — clean flex-wrap card layout supporting 3+ attached documentations per repository without overflow

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

### Background Sync & Storage
- One-time OAuth sync stores all metrics and documentation metadata in PostgreSQL & Cloud Storage
- All dashboard queries run against local DB — no rate limits during browsing
- Sync status polling so you see progress in real time

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| Backend | FastAPI, Python 3.9+, SQLAlchemy (async), Alembic, Boto3 (S3 / Storage) |
| Database & Storage | PostgreSQL, AWS S3 / MinIO Cloud Storage |
| Auth | GitHub OAuth 2.0 & GitLab OAuth 2.0 → JWT |
| Data Source | GitHub REST/GraphQL API & GitLab API |
| Theming | next-themes (dark / light mode) |

---

## Architecture

```
Next.js Frontend (port 3000)
        │
        ▼
FastAPI Backend (port 8000)
        │
        ├── GitHub / GitLab OAuth → JWT auth
        ├── GitHub / GitLab API (sync)
        ├── Cloud Storage / S3 (Document Uploads)
        └── PostgreSQL (analytics & docs metadata)
```

**Backend layers:**
```
routers/        HTTP layer — thin, calls services, uses schemas
services/       Business logic — orchestrates repos, docs & API integrations
repositories/   Data access layer — raw DB queries only
models/         SQLAlchemy ORM — table definitions
schemas/        Pydantic — request/response contracts
migrations/     Alembic — schema versioning
```

---

## Project Structure

```
GitAudit/
├── backend/
│   ├── app/
│   │   ├── models/             # SQLAlchemy ORM models (Documentation, Repositories, etc.)
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── repositories/       # DB access layer
│   │   ├── services/           # Business logic & S3 storage service
│   │   ├── routers/            # FastAPI route handlers (documentation_router, etc.)
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   ├── migrations/
│   │   └── versions/
│   ├── alembic.ini
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── page.tsx            # Org overview
│   │   │   ├── documentations/     # Repository documentation & knowledge hub
│   │   │   ├── repositories/       # Repository analytics
│   │   │   ├── developers/         # Developer profiles & leaderboard
│   │   │   ├── reviews/            # Review analytics & heatmap
│   │   │   ├── pr-insights/        # Filterable PR table
│   │   │   ├── ci-insights/        # CI build health & flaky tests
│   │   │   ├── commit-activity/    # Commit churn & burnout signals
│   │   │   └── digest/             # AI weekly team digest
│   │   ├── auth/callback/          # OAuth handler
│   │   └── page.tsx                # Landing / sign-in page
│   ├── components/
│   │   ├── documentation/          # Markdown viewer & document previewers
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
git clone https://github.com/abhinavkloudwin/GitAudit.git
cd GitAudit
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

### 2. Create a GitHub / GitLab OAuth App

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
CREATE USER gitaudit WITH PASSWORD 'gitaudit';
CREATE DATABASE gitaudit OWNER gitaudit;
GRANT ALL PRIVILEGES ON DATABASE gitaudit TO gitaudit;
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

### Repository Documentations

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/documentations` | List repositories and their attached documentations |
| `GET` | `/api/documentations/{doc_id}/content` | Retrieve raw document bytes/content |
| `POST` | `/api/documentations/repo/{repo_id}` | Create documentation (Markdown or External Link) |
| `POST` | `/api/documentations/repo/{repo_id}/upload` | Upload document file (.pdf, .doc, .docx, .md, .txt) |
| `PUT` | `/api/documentations/{doc_id}` | Update existing documentation content or link |
| `DELETE` | `/api/documentations/{doc_id}` | Delete documentation |

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

## License

MIT
