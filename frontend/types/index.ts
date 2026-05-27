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
  state: "OPEN" | "CLOSED" | "MERGED";
  author: string;
  author_avatar: string | null;
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
