from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class BranchOption(BaseModel):
    name: str
    protected: bool = False
    commit_sha: Optional[str] = None


class RepoBranchesResponse(BaseModel):
    repo_name: str
    default_branch: str = "main"
    branches: list[BranchOption] = []


class VulnerabilityFinding(BaseModel):
    title: str
    severity: str  # Critical, High, Medium, Low
    cvss: float = 0.0
    component: str
    description: str
    remediation: str
    quick_win: bool = False


class DependencyReportItem(BaseModel):
    package: str
    version: str
    status: str  # Secure, Outdated, Vulnerable, Unmaintained
    known_issues: Optional[str] = "None known"
    recommendation: Optional[str] = "Up to date"


class RemediationRoadmap(BaseModel):
    quick_wins: list[str] = []
    long_term: list[str] = []


class VulnerabilityScanRequest(BaseModel):
    org: str
    repo_name: str
    branch: Optional[str] = "main"
    provider: str = "github"
    openai_api_key: Optional[str] = None
    model: Optional[str] = None


class VulnerabilityScanResponse(BaseModel):
    id: int
    org: str
    repo_name: str
    repo_full_name: str
    branch: Optional[str] = "main"
    provider: str
    security_score: int
    grade: str
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    status: str
    executive_summary: Optional[str] = None
    findings: list[VulnerabilityFinding] = []
    dependency_report: list[DependencyReportItem] = []
    remediation_roadmap: Optional[RemediationRoadmap] = None
    model_used: Optional[str] = None
    created_at: datetime


class VulnerabilityScanSummary(BaseModel):
    id: int
    org: str
    repo_name: str
    repo_full_name: str
    branch: Optional[str] = "main"
    provider: str
    security_score: int
    grade: str
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    status: str
    created_at: datetime


class OrgSecuritySummary(BaseModel):
    org: str
    total_scanned_repos: int
    average_security_score: float
    total_critical: int
    total_high: int
    total_medium: int
    total_low: int
    recent_scans: list[VulnerabilityScanSummary] = []
