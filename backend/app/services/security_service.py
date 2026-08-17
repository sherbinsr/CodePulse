"""Security Service: Orchestrates repository vulnerability assessments using OpenAI."""

import json
import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.vulnerability_scan import VulnerabilityScan
from app.services.github_service import GitHubService

logger = logging.getLogger(__name__)

VULNERABILITY_ASSESSMENT_SYSTEM_PROMPT = """You are a senior Application Security (AppSec) Engineer conducting a comprehensive vulnerability assessment of a software repository based on the vulnerability-assessment methodology.

Assess the project's vulnerability posture: check dependencies, configurations, code patterns, and infrastructure security weaknesses. Identify real risks and provide actionable remediation steps.

## ASSESSMENT PROCESS
1. Step 1: Dependency Audit
   - Review package manifests and lockfiles (package.json, package-lock.json, Pipfile.lock, requirements.txt, go.sum, Cargo.lock, etc.)
   - Identify outdated packages with known CVEs, unmaintained packages, and low trust signals.
2. Step 2: Configuration Review
   - Secrets: Hardcoded credentials, API keys in source, .env files or tokens committed
   - CORS: Overly permissive origins (wildcard `*` with credentials)
   - CSP: Missing or weak Content Security Policy
   - TLS: Insecure protocol versions or weak cipher suites
   - Headers: Missing security headers (HSTS, X-Frame-Options, X-Content-Type-Options)
   - Debug mode: Enabled in production configs
   - Default credentials: Unchanged defaults in databases or admin panels
3. Step 3: Code Pattern Analysis
   - Unsanitized user input in SQL queries, shell commands, or templates (SQLi, Command Injection, XSS)
   - Use of `eval()`, `exec()`, `dangerouslySetInnerHTML`, or similar risky primitives
   - Hardcoded secrets or tokens
   - Insecure random number generation for security purposes (Math.random vs crypto)
   - Weak cryptographic algorithms (MD5, SHA1 for passwords)
   - Missing authentication or authorization checks
   - Unsafe file operations (path traversal, unrestricted file upload)
4. Step 4: Infrastructure Assessment
   - Open ports, base image vulnerabilities (Dockerfile, compose), run-as-root, missing encryption at rest, permissive IAM/workflows.
5. Step 5: Risk Summary & Scoring
   - Calculate an accurate Security Score (0 to 100, where 100 is pristine and 0 is severe risk).
   - Assign Letter Grade: A (90-100), B (80-89), C (70-79), D (60-69), F (<60).

## REQUIRED JSON OUTPUT FORMAT
You MUST respond with a single, strictly valid JSON object (no markdown fences, no explanatory text before or after).
Adhere to this JSON schema:
{
  "security_score": <int 0-100>,
  "grade": "<A|B|C|D|F>",
  "executive_summary": "<1-2 paragraphs summarizing the project's vulnerability posture, key risks, and overall health>",
  "critical_count": <int>,
  "high_count": <int>,
  "medium_count": <int>,
  "low_count": <int>,
  "findings": [
    {
      "title": "<Concise vulnerability title>",
      "severity": "<Critical|High|Medium|Low>",
      "cvss": <float 0.0-10.0>,
      "component": "<Affected file, package, or component>",
      "description": "<Detailed description of the vulnerability and attack vector>",
      "remediation": "<Actionable step-by-step remediation or code fix>",
      "quick_win": <true|false>
    }
  ],
  "dependency_report": [
    {
      "package": "<Package name>",
      "version": "<Version string>",
      "status": "<Secure|Outdated|Vulnerable|Unmaintained>",
      "known_issues": "<CVEs or issues if any, or 'None known'>",
      "recommendation": "<Actionable upgrade advice>"
    }
  ],
  "remediation_roadmap": {
    "quick_wins": ["<Immediate actionable fix 1>", "<Immediate actionable fix 2>"],
    "long_term": ["<Architectural/ongoing improvement 1>", "<Improvement 2>"]
  },
  "recommended_tools": [
    {
      "name": "<Tool Name, e.g. Snyk / Dependabot / Semgrep / Trivy / OWASP ZAP>",
      "purpose": "<Why this tool is recommended for this stack>"
    }
  ]
}
"""


class SecurityService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    async def verify_openai_key(api_key: str) -> Dict[str, Any]:
        """Verify if an OpenAI API key is valid."""
        if not api_key or not api_key.strip():
            return {"valid": False, "message": "API key cannot be empty."}

        cleaned_key = api_key.strip()
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {cleaned_key}"},
                )
                if resp.status_code == 200:
                    return {"valid": True, "message": "OpenAI API key is valid and connected successfully."}
                elif resp.status_code == 401:
                    return {"valid": False, "message": "Invalid OpenAI API key. Check key and permissions."}
                elif resp.status_code == 429:
                    return {
                        "valid": True,
                        "message": "OpenAI API key is valid, but rate limit or quota exceeded.",
                    }
                else:
                    return {
                        "valid": False,
                        "message": f"OpenAI API responded with status {resp.status_code}: {resp.text[:100]}",
                    }
        except Exception as e:
            logger.warning("OpenAI key verification error: %s", e)
            return {"valid": False, "message": f"Could not connect to OpenAI: {str(e)}"}

    async def get_repository_security_context(
        self, org: str, repo_name: str, provider: str, user: User
    ) -> Dict[str, Any]:
        """Collect security-relevant files, configs, and manifests from the repository."""
        context: Dict[str, Any] = {
            "org": org,
            "repo_name": repo_name,
            "provider": provider,
            "manifests": {},
            "configs": {},
            "workflows": {},
            "sample_code": {},
        }

        # Target security-critical files
        manifest_files = [
            "package.json",
            "package-lock.json",
            "yarn.lock",
            "pnpm-lock.yaml",
            "requirements.txt",
            "Pipfile",
            "Pipfile.lock",
            "pyproject.toml",
            "setup.py",
            "go.mod",
            "go.sum",
            "Cargo.toml",
            "Cargo.lock",
            "pom.xml",
            "build.gradle",
        ]

        config_files = [
            "Dockerfile",
            "docker-compose.yml",
            "docker-compose.yaml",
            ".env.example",
            ".env.sample",
            "env.example",
            "tsconfig.json",
            "next.config.js",
            "next.config.ts",
            "vite.config.ts",
            ".eslintrc.json",
            ".eslintrc.js",
            "nginx.conf",
        ]

        workflow_files = [
            ".github/workflows/ci.yml",
            ".github/workflows/main.yml",
            ".github/workflows/deploy.yml",
            ".github/workflows/build.yml",
            ".gitlab-ci.yml",
        ]

        sample_code_files = [
            "app/main.py",
            "main.py",
            "app.py",
            "src/index.ts",
            "src/server.ts",
            "src/app.ts",
            "server.js",
            "index.js",
            "app/database.py",
            "lib/auth.ts",
            "lib/api.ts",
        ]

        if provider == "github" and user.github_token:
            gh = GitHubService(user.github_token)

            # Fetch manifest files
            for fname in manifest_files:
                try:
                    content = await self._fetch_github_file(gh, org, repo_name, fname)
                    if content:
                        context["manifests"][fname] = content[:3000]  # truncate to keep tokens lean
                except Exception:
                    pass

            # Fetch config files
            for fname in config_files:
                try:
                    content = await self._fetch_github_file(gh, org, repo_name, fname)
                    if content:
                        context["configs"][fname] = content[:2500]
                except Exception:
                    pass

            # Fetch workflow files
            for fname in workflow_files:
                try:
                    content = await self._fetch_github_file(gh, org, repo_name, fname)
                    if content:
                        context["workflows"][fname] = content[:2000]
                except Exception:
                    pass

            # Fetch sample code files
            for fname in sample_code_files:
                try:
                    content = await self._fetch_github_file(gh, org, repo_name, fname)
                    if content:
                        context["sample_code"][fname] = content[:2500]
                except Exception:
                    pass

        return context

    @staticmethod
    async def _fetch_github_file(gh: GitHubService, owner: str, repo: str, file_path: str) -> Optional[str]:
        """Fetch raw content of a file from GitHub REST API."""
        try:
            file_data = await gh._rest_get(f"/repos/{owner}/{repo}/contents/{file_path}")
            if isinstance(file_data, dict):
                encoding = file_data.get("encoding")
                content = file_data.get("content", "")
                if encoding == "base64" and content:
                    import base64

                    return base64.b64decode(content).decode("utf-8", errors="replace")
                elif isinstance(content, str):
                    return content
        except Exception:
            pass
        return None

    async def call_openai_vulnerability_assessment(
        self,
        api_key: str,
        model: str,
        org: str,
        repo_name: str,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Send prompt to OpenAI API and parse structured vulnerability assessment."""
        # Format user prompt with codebase context
        context_str = f"Repository: {org}/{repo_name}\n\n"

        if context.get("manifests"):
            context_str += "### DEPENDENCY MANIFESTS & LOCKFILES:\n"
            for fname, content in context["manifests"].items():
                context_str += f"--- File: {fname} ---\n{content}\n\n"

        if context.get("configs"):
            context_str += "### CONFIGURATION & ENVIRONMENT FILES:\n"
            for fname, content in context["configs"].items():
                context_str += f"--- File: {fname} ---\n{content}\n\n"

        if context.get("workflows"):
            context_str += "### CI/CD WORKFLOWS:\n"
            for fname, content in context["workflows"].items():
                context_str += f"--- File: {fname} ---\n{content}\n\n"

        if context.get("sample_code"):
            context_str += "### CORE APPLICATION SAMPLE CODE:\n"
            for fname, content in context["sample_code"].items():
                context_str += f"--- File: {fname} ---\n{content}\n\n"

        if not (
            context.get("manifests")
            or context.get("configs")
            or context.get("workflows")
            or context.get("sample_code")
        ):
            context_str += (
                "Note: Direct repository file access was limited. Perform an overarching assessment "
                f"for standard industry practices for repository '{repo_name}' under organization '{org}'."
            )

        user_prompt = (
            f"Conduct a comprehensive vulnerability assessment of '{org}/{repo_name}' following the 5-step process:\n"
            "1. Dependency Audit (known CVEs, outdated packages, trust signals)\n"
            "2. Configuration Review (Secrets, CORS, CSP, TLS, Security Headers, Debug mode, Default creds)\n"
            "3. Code Pattern Analysis (Injection, eval, crypto, auth checks, file traversal)\n"
            "4. Infrastructure Assessment (Container security, open ports, permissions)\n"
            "5. Risk Summary & Scoring (Calculate Security Score 0-100 and Grade A-F)\n\n"
            f"Codebase Security Context:\n{context_str}\n\n"
            "Output your findings exclusively as valid JSON adhering to the specified schema."
        )

        headers = {
            "Authorization": f"Bearer {api_key.strip()}",
            "Content-Type": "application/json",
        }

        chosen_model = model or "gpt-4o-mini"
        payload = {
            "model": chosen_model,
            "messages": [
                {"role": "system", "content": VULNERABILITY_ASSESSMENT_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
                if resp.status_code != 200:
                    # Retry without response_format if model does not support it
                    if "response_format" in resp.text:
                        payload.pop("response_format", None)
                        resp = await client.post(
                            "https://api.openai.com/v1/chat/completions", headers=headers, json=payload
                        )

                if resp.status_code == 401:
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid OpenAI API key. Please update your key in Settings.",
                    )
                elif resp.status_code == 429:
                    raise HTTPException(
                        status_code=429,
                        detail="OpenAI rate limit or quota exceeded. Please check your OpenAI billing.",
                    )
                elif resp.status_code != 200:
                    raise HTTPException(
                        status_code=502,
                        detail=f"OpenAI API error ({resp.status_code}): {resp.text[:200]}",
                    )

                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                return self._parse_assessment_json(content)

        except HTTPException:
            raise
        except Exception as e:
            logger.error("Failed to execute OpenAI vulnerability scan: %s", e)
            raise HTTPException(status_code=500, detail=f"Vulnerability assessment failed: {str(e)}")

    def _parse_assessment_json(self, raw_text: str) -> Dict[str, Any]:
        """Extract and sanitize JSON from OpenAI response."""
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\n", "", cleaned)
            cleaned = re.sub(r"\n```$", "", cleaned)

        try:
            parsed = json.loads(cleaned)
        except Exception:
            # Try finding the first JSON object with regex
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                try:
                    parsed = json.loads(match.group(0))
                except Exception:
                    parsed = {}
            else:
                parsed = {}

        # Default fallback structure
        findings = parsed.get("findings", [])
        critical_c = sum(1 for f in findings if f.get("severity") == "Critical")
        high_c = sum(1 for f in findings if f.get("severity") == "High")
        medium_c = sum(1 for f in findings if f.get("severity") == "Medium")
        low_c = sum(1 for f in findings if f.get("severity") == "Low")

        # Computed deterministic score adjustment if needed
        base_score = 100 - (critical_c * 25 + high_c * 15 + medium_c * 7 + low_c * 3)
        calculated_score = max(0, min(100, parsed.get("security_score", base_score)))

        # Assign letter grade
        if calculated_score >= 90:
            grade = "A"
        elif calculated_score >= 80:
            grade = "B"
        elif calculated_score >= 70:
            grade = "C"
        elif calculated_score >= 60:
            grade = "D"
        else:
            grade = "F"

        return {
            "security_score": calculated_score,
            "grade": parsed.get("grade", grade),
            "critical_count": parsed.get("critical_count", critical_c),
            "high_count": parsed.get("high_count", high_c),
            "medium_count": parsed.get("medium_count", medium_c),
            "low_count": parsed.get("low_count", low_c),
            "executive_summary": parsed.get(
                "executive_summary",
                "Vulnerability assessment completed. Review the findings and remediation steps below.",
            ),
            "findings": findings,
            "dependency_report": parsed.get("dependency_report", []),
            "remediation_roadmap": parsed.get("remediation_roadmap", {"quick_wins": [], "long_term": []}),
            "recommended_tools": parsed.get("recommended_tools", []),
        }

    async def run_assessment(
        self,
        org: str,
        repo_name: str,
        provider: str,
        user: User,
        custom_openai_key: Optional[str] = None,
        model: Optional[str] = None,
    ) -> VulnerabilityScan:
        """Run complete vulnerability assessment workflow and persist scan in DB."""
        api_key = custom_openai_key or user.openai_api_key
        if not api_key:
            raise HTTPException(
                status_code=400,
                detail="OpenAI API key is missing. Please add your OpenAI key in Settings or provide it in the scan request.",
            )

        chosen_model = model or user.openai_model or "gpt-4o-mini"
        repo_full_name = f"{org}/{repo_name}"

        # 1. Extract context from repo
        context = await self.get_repository_security_context(org, repo_name, provider, user)

        # 2. Run assessment with OpenAI
        result = await self.call_openai_vulnerability_assessment(
            api_key=api_key,
            model=chosen_model,
            org=org,
            repo_name=repo_name,
            context=context,
        )

        # 3. Save to database
        scan = VulnerabilityScan(
            org=org,
            repo_name=repo_name,
            repo_full_name=repo_full_name,
            provider=provider,
            security_score=result["security_score"],
            grade=result["grade"],
            critical_count=result["critical_count"],
            high_count=result["high_count"],
            medium_count=result["medium_count"],
            low_count=result["low_count"],
            status="completed",
            executive_summary=result["executive_summary"],
            findings=result["findings"],
            dependency_report=result["dependency_report"],
            remediation_roadmap=result["remediation_roadmap"],
            recommended_tools=result["recommended_tools"],
            model_used=chosen_model,
            scanned_by_user_id=user.id,
            created_at=datetime.utcnow(),
        )
        self.db.add(scan)
        await self.db.commit()
        await self.db.refresh(scan)
        return scan

    async def get_scans_for_org(
        self, org: str, repo_name: Optional[str] = None, limit: int = 50
    ) -> List[VulnerabilityScan]:
        """Fetch past vulnerability scans for an organization or repository."""
        stmt = select(VulnerabilityScan).where(VulnerabilityScan.org == org)
        if repo_name:
            stmt = stmt.where(VulnerabilityScan.repo_name == repo_name)
        stmt = stmt.order_by(desc(VulnerabilityScan.created_at)).limit(limit)
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_scan_by_id(self, scan_id: int) -> Optional[VulnerabilityScan]:
        """Fetch a specific scan by ID."""
        stmt = select(VulnerabilityScan).where(VulnerabilityScan.id == scan_id)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def delete_scan(self, scan_id: int) -> bool:
        """Delete a scan record."""
        scan = await self.get_scan_by_id(scan_id)
        if not scan:
            return False
        await self.db.delete(scan)
        await self.db.commit()
        return True

    async def get_org_security_summary(self, org: str) -> Dict[str, Any]:
        """Get high-level organizational security overview."""
        scans = await self.get_scans_for_org(org, limit=100)
        if not scans:
            return {
                "org": org,
                "total_scanned_repos": 0,
                "average_security_score": 100.0,
                "total_critical": 0,
                "total_high": 0,
                "total_medium": 0,
                "total_low": 0,
                "recent_scans": [],
            }

        # Unique repos scanned
        unique_repos = set(s.repo_name for s in scans)
        avg_score = sum(s.security_score for s in scans) / len(scans)
        total_crit = sum(s.critical_count for s in scans)
        total_high = sum(s.high_count for s in scans)
        total_med = sum(s.medium_count for s in scans)
        total_low = sum(s.low_count for s in scans)

        return {
            "org": org,
            "total_scanned_repos": len(unique_repos),
            "average_security_score": round(avg_score, 1),
            "total_critical": total_crit,
            "total_high": total_high,
            "total_medium": total_med,
            "total_low": total_low,
            "recent_scans": scans[:10],
        }
