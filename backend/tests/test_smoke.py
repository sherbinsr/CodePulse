"""
Regression smoke tests.

Runs against a live backend (uvicorn) with a real PostgreSQL database.
No valid GitHub credentials are required — these tests verify:
  - The API is reachable and healthy
  - All protected endpoints enforce authentication (401)
  - Public endpoints return correct shapes
  - Invalid auth codes are rejected with 400
"""
import os
import pytest
import httpx

BASE = os.getenv("TEST_API_URL", "http://localhost:8000")

# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def client():
    with httpx.Client(base_url=BASE, timeout=15) as c:
        yield c


# ── Health & meta ─────────────────────────────────────────────────────────────

def test_health_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_health_content_type_is_json(client):
    r = client.get("/health")
    assert "application/json" in r.headers["content-type"]


def test_openapi_docs_reachable(client):
    r = client.get("/docs")
    assert r.status_code == 200


def test_openapi_schema_title(client):
    r = client.get("/openapi.json")
    assert r.status_code == 200
    assert r.json()["info"]["title"] == "CodePulse API"


# ── Auth guard ────────────────────────────────────────────────────────────────
# Every protected endpoint must reject unauthenticated requests with 401.

PROTECTED = [
    ("GET",  "/api/orgs"),
    ("GET",  "/api/orgs/acme/sync/status"),
    ("POST", "/api/orgs/acme/sync"),
    ("GET",  "/api/analytics/acme/overview"),
    ("GET",  "/api/analytics/acme/developers"),
    ("GET",  "/api/analytics/acme/trends"),
    ("GET",  "/api/analytics/acme/repos"),
    ("GET",  "/api/analytics/acme/prs"),
]

@pytest.mark.parametrize("method,path", PROTECTED)
def test_protected_endpoint_requires_auth(client, method, path):
    r = client.request(method, path)
    assert r.status_code == 401, (
        f"{method} {path} → expected 401, got {r.status_code}\n{r.text}"
    )


# ── Invalid bearer token ──────────────────────────────────────────────────────

def test_invalid_bearer_token_returns_401(client):
    r = client.get("/api/orgs", headers={"Authorization": "Bearer not-a-real-token"})
    assert r.status_code == 401


# ── Auth callback ─────────────────────────────────────────────────────────────

def test_github_callback_with_bad_code_returns_400(client):
    r = client.post(
        "/api/auth/github/callback",
        json={"code": "totally_invalid_oauth_code"},
    )
    assert r.status_code == 400


# ── CORS ──────────────────────────────────────────────────────────────────────

def test_cors_header_present_for_allowed_origin(client):
    r = client.get("/health", headers={"Origin": "http://localhost:3000"})
    assert "access-control-allow-origin" in r.headers


# ── 404 for unknown routes ────────────────────────────────────────────────────

def test_unknown_route_returns_404(client):
    r = client.get("/api/does-not-exist")
    assert r.status_code == 404
