export interface User {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string | null;
}

export interface Org {
  login: string;
  avatar_url: string | null;
  description: string | null;
  provider: "github" | "gitlab";
  is_custom?: boolean;
}

export interface OrgOverview {
  total_repos: number;
  total_prs: number;
  merged_prs: number;
  open_prs: number;
  closed_prs: number;
  avg_merge_time_hours: number | null;
  avg_review_time_hours: number | null;
  total_reviews: number;
  unique_contributors: number;
  merge_rate: number;
}

export interface DeveloperStat {
  login: string;
  avatar_url: string | null;
  total_prs: number;
  merged_prs: number;
  open_prs: number;
  merge_rate: number;
  avg_merge_hours: number | null;
  total_additions: number;
  total_deletions: number;
  reviews_given: number;
  approvals: number;
  change_requests: number;
}

export interface RepoStat {
  repo: string;
  name: string;
  total_prs: number;
  merged_prs: number;
  open_prs: number;
  merge_rate: number;
  avg_merge_hours: number | null;
  avg_review_hours: number | null;
  contributors: number;
}

export interface MonthlyTrend {
  month: string;
  total_prs: number;
  merged_prs: number;
  contributors: number;
}

export interface ReviewNetwork {
  pr_author: string;
  reviewer: string;
  review_count: number;
}

export interface PullRequest {
  id: number;
  number: number;
  repo: string;
  title: string;
  body?: string | null;
  state: "OPEN" | "CLOSED" | "MERGED";
  author: string;
  author_avatar: string | null;
  head_branch?: string | null;
  base_branch?: string | null;
  action_file?: string | null;
  action_status?: "success" | "failure" | "failed" | "passed" | "in_progress" | "cancelled" | string | null;
  action_name?: string | null;
  action_file_content?: string | null;
  additions: number;
  deletions: number;
  changed_files: number;
  reviews_count: number;
  time_to_merge_hours: number | null;
  time_to_first_review_hours: number | null;
  created_at: string;
  merged_at: string | null;
  closed_at: string | null;
}

export interface CISummary {
  repo: string;
  name: string;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  first_try_pass_rate: number;
  overall_pass_rate: number;
  avg_duration_seconds: number | null;
}

export interface BuildTrend {
  week: string;
  repo_name: string;
  avg_duration_seconds: number;
  run_count: number;
}

export interface FlakyWorkflow {
  workflow_name: string;
  repo_name: string;
  flaky_count: number;
  total_runs: number;
  flakiness_rate: number;
}

export interface CommitActivity {
  author_login: string;
  author_avatar: string | null;
  total_commits: number;
  active_days: number;
  commits_per_active_day: number;
  after_hours_commits: number;
  weekend_commits: number;
  after_hours_pct: number;
  weekend_pct: number;
  repos_contributed: number;
}

export interface CodeChurn {
  week: string;
  repo_name: string;
  total_commits: number;
  unique_authors: number;
}

export interface DigestContributor {
  login: string;
  avatar_url: string | null;
  total_prs: number;
  merged_prs: number;
  reviews_given: number;
}

export interface DigestRepo {
  name: string;
  total_prs: number;
  merged_prs: number;
  merge_rate: number;
}

export interface DigestData {
  org: string;
  period_label: string;
  since: string;
  until: string;
  total_prs: number;
  merged_prs: number;
  open_prs: number;
  merge_rate: number;
  avg_merge_hours: number | null;
  avg_review_hours: number | null;
  unique_contributors: number;
  total_reviews: number;
  top_contributors: DigestContributor[];
  top_repos: DigestRepo[];
}

export interface SyncStatus {
  status: "never_synced" | "pending" | "running" | "done" | "failed";
  job_id?: number;
  repos_synced?: number;
  prs_synced?: number;
  error?: string | null;
  started_at?: string;
  finished_at?: string;
}

export interface Documentation {
  id: number;
  repository_id: number;
  file_name: string;
  file_type: string;
  s3_bucket: string;
  s3_key: string;
  s3_url: string | null;
  content: string | null;
  source?: "manual" | "docs_folder" | string;
  created_at: string;
  updated_at: string;
}

export interface RepositoryWithDocs {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  provider: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  synced_at: string | null;
  has_documentation: boolean;
  documentations: Documentation[];
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  created_at?: string | null;
  published_at?: string | null;
  html_url: string;
  author_login?: string | null;
  author_avatar?: string | null;
}

export interface Assignee {
  login: string;
  avatar_url?: string | null;
}

export interface IssueLabel {
  name: string;
  color?: string | null;
}

export interface GitHubIssue {
  id: number;
  github_id: string;
  number: number;
  repo_name: string;
  owner: string;
  title: string;
  body?: string | null;
  state: "open" | "closed";
  author_login: string;
  author_avatar?: string | null;
  assignees: Assignee[];
  labels: IssueLabel[];
  milestone?: string | null;
  priority?: string | null;
  comments_count: number;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
}

export interface ProjectItem {
  id: number;
  github_id: string;
  status: string;
  status_option_id?: string | null;
  position: number;
  issue: GitHubIssue;
}

export interface ProjectColumnOption {
  id: string;
  name: string;
}

export interface ProjectV2 {
  id: number;
  github_id: string;
  org: string;
  title: string;
  number: number;
  url?: string | null;
  closed: boolean;
  status_field_id?: string | null;
  columns: ProjectColumnOption[];
  created_at: string;
  updated_at: string;
}

export interface ProjectBoard {
  project: ProjectV2;
  items: ProjectItem[];
}

export interface IssueComment {
  id: number;
  body: string;
  user: {
    login: string;
    avatar_url?: string | null;
  };
  created_at: string;
  updated_at: string;
}

export interface IssueTimelineDetails {
  comments: IssueComment[];
  linked_prs: Array<{ title: string; number: number; url: string; state: string }>;
  commits: Array<{ sha: string; url: string }>;
  timeline_events_count: number;
}

export interface RepoProject {
  id: number;
  org: string;
  repo_name: string;
  repository_id?: number | null;
  name: string;
  description?: string | null;
  key_prefix?: string | null;
  status: "active" | "completed" | "archived";
  columns: ProjectColumnOption[];
  tasks_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectTask {
  id: number;
  project_id: number;
  issue_id?: number | null;
  ticket_key?: string | null;
  title: string;
  description?: string | null;
  status: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  assignees: Assignee[];
  labels: IssueLabel[];
  story_points: number;
  due_date?: string | null;
  position: number;
  issue?: GitHubIssue | null;
  created_at: string;
  updated_at: string;
}


export interface RepoProjectBoard {
  project: RepoProject;
  tasks: ProjectTask[];
}

export interface UserSettings {
  has_openai_key: boolean;
  openai_key_masked: string | null;
  openai_model: string;
}

export interface VulnerabilityFinding {
  title: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  cvss: number;
  component: string;
  description: string;
  remediation: string;
  quick_win: boolean;
}

export interface DependencyReportItem {
  package: string;
  version: string;
  status: "Secure" | "Outdated" | "Vulnerable" | "Unmaintained";
  known_issues: string | null;
  recommendation: string | null;
}

export interface RemediationRoadmap {
  quick_wins: string[];
  long_term: string[];
}

export interface RecommendedTool {
  name: string;
  purpose: string;
}

export interface VulnerabilityScan {
  id: number;
  org: string;
  repo_name: string;
  repo_full_name: string;
  provider: "github" | "gitlab";
  security_score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  status: string;
  executive_summary: string | null;
  findings: VulnerabilityFinding[];
  dependency_report: DependencyReportItem[];
  remediation_roadmap: RemediationRoadmap | null;
  recommended_tools: RecommendedTool[];
  model_used: string | null;
  created_at: string;
}

export interface VulnerabilityScanSummary {
  id: number;
  org: string;
  repo_name: string;
  repo_full_name: string;
  provider: "github" | "gitlab";
  security_score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  status: string;
  created_at: string;
}

export interface OrgSecuritySummary {
  org: string;
  total_scanned_repos: number;
  average_security_score: number;
  total_critical: number;
  total_high: number;
  total_medium: number;
  total_low: number;
  recent_scans: VulnerabilityScanSummary[];
}




