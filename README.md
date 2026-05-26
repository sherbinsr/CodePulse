# CodePulse

Engineering Productivity & PR Analytics Platform. Connect your GitHub organization and get deep insights into pull requests, code reviews, developer performance, and team velocity — all stored locally for fast, rate-limit-free dashboards.

---

## Features

- **Org Overview** — total PRs, merge rate, avg review time, contributor count
- **Repository Analytics** — per-repo PR volume, merge trends, contributor breakdown
- **Developer Analytics** — leaderboard, radar charts, merge rate per developer
- **Review Analytics** — top reviewers, who reviews whose PRs, review participation
- **PR Insights** — filterable, paginated PR table with state, author, repo filters
- **Monthly Trends** — area charts showing PR velocity over time
- **Background Sync** — fetches all data from GitHub GraphQL once, stores in PostgreSQL

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| Backend | FastAPI, Python 3.9+, SQLAlchemy (async), Alembic |
| Database | PostgreSQL |
| Auth | GitHub OAuth 2.0 → JWT |
| Data Source | GitHub REST API + GraphQL API |

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
│   │   ├── dashboard/          # Overview, Repos, Devs, Reviews, PR Insights
│   │   ├── auth/callback/      # GitHub OAuth handler
│   │   └── page.tsx            # Landing page
│   ├── components/
│   │   ├── dashboard/          # Charts, leaderboard, stat cards
│   │   └── layout/             # Sidebar, header
│   ├── lib/                    # API client, auth helpers, utils
│   ├── types/                  # TypeScript interfaces
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

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/github/callback` | Exchange GitHub OAuth code for JWT |
| `GET` | `/api/auth/me` | Get authenticated user |
| `GET` | `/api/orgs` | List user's GitHub organizations |
| `POST` | `/api/orgs/{org}/sync` | Trigger background data sync |
| `GET` | `/api/orgs/{org}/sync/status` | Get sync job status |
| `GET` | `/api/analytics/{org}/overview` | Org-level metrics |
| `GET` | `/api/analytics/{org}/developers` | Per-developer stats |
| `GET` | `/api/analytics/{org}/repositories` | Per-repo stats |
| `GET` | `/api/analytics/{org}/trends` | Monthly PR trends |
| `GET` | `/api/analytics/{org}/review-network` | Who reviews whose PRs |
| `GET` | `/api/analytics/{org}/prs` | Paginated PR list with filters |

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
4. GitHub GraphQL API is called — fetches all repos, PRs, and reviews in paginated batches
5. Data is stored in PostgreSQL
6. Frontend polls `GET /api/orgs/{org}/sync/status` until `done`
7. All dashboard pages now query from PostgreSQL — fast, no GitHub API rate limits

---

## License

MIT
