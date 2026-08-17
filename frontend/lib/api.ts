import axios from "axios";
import type {
  OrgOverview, DeveloperStat, RepoStat, MonthlyTrend,
  ReviewNetwork, PullRequest, Org, SyncStatus, User, DigestData,
  CISummary, BuildTrend, FlakyWorkflow, CommitActivity, CodeChurn,
  Documentation, RepositoryWithDocs, GitHubRelease,
  RepoProject, ProjectTask, RepoProjectBoard,
  UserSettings, VulnerabilityScan, VulnerabilityScanSummary, OrgSecuritySummary,
  RepoBranchesResponse,
} from "@/types";




const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const githubCallback = async (code: string): Promise<{ access_token: string; user: User }> => {
  const { data } = await api.post("/api/auth/github/callback", { code });
  return data;
};

export const gitlabCallback = async (code: string): Promise<{ access_token: string; user: User }> => {
  const { data } = await api.post("/api/auth/gitlab/callback", { code });
  return data;
};

export const googleCallback = async (code: string): Promise<{ access_token: string; user: User }> => {
  const { data } = await api.post("/api/auth/google/callback", { code });
  return data;
};

export const getMe = async (token: string): Promise<User> => {
  const { data } = await api.get(`/api/auth/me?token=${token}`);
  return data;
};

// Orgs
export const listOrgs = async (): Promise<Org[]> => {
  const { data } = await api.get("/api/orgs");
  return data;
};

export const addOrg = async (login: string, provider: "github" | "gitlab" = "github"): Promise<Org> => {
  const { data } = await api.post("/api/orgs", { login, provider });
  return data;
};

export const deleteCustomOrg = async (login: string, provider: "github" | "gitlab" = "github"): Promise<{ message: string }> => {
  const { data } = await api.delete(`/api/orgs/${login}?provider=${provider}`);
  return data;
};

export const triggerSync = async (
  org: string,
  provider: "github" | "gitlab" = "github"
): Promise<{ job_id: number; status: string; message: string }> => {
  const { data } = await api.post(`/api/orgs/${org}/sync?provider=${provider}`);
  return data;
};

export const getSyncStatus = async (
  org: string,
  provider: "github" | "gitlab" = "github"
): Promise<SyncStatus> => {
  const { data } = await api.get(`/api/orgs/${org}/sync/status?provider=${provider}`);
  return data;
};

// Analytics
export const getOrgOverview = async (org: string): Promise<OrgOverview> => {
  const { data } = await api.get(`/api/analytics/${org}/overview`);
  return data;
};

export const getDeveloperStats = async (org: string): Promise<DeveloperStat[]> => {
  const { data } = await api.get(`/api/analytics/${org}/developers`);
  return data;
};

export const getRepoStats = async (org: string): Promise<RepoStat[]> => {
  const { data } = await api.get(`/api/analytics/${org}/repositories`);
  return data;
};

export const getMonthlyTrends = async (org: string, months = 6): Promise<MonthlyTrend[]> => {
  const { data } = await api.get(`/api/analytics/${org}/trends?months=${months}`);
  return data;
};

export const getReviewNetwork = async (org: string): Promise<ReviewNetwork[]> => {
  const { data } = await api.get(`/api/analytics/${org}/review-network`);
  return data;
};

export const getPRList = async (
  org: string,
  params?: {
    repo?: string;
    author?: string;
    state?: string;
    action_status?: string;
    base_branch?: string;
    head_branch?: string;
    sort_by?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ data: PullRequest[]; total: number }> => {
  const { data } = await api.get(`/api/analytics/${org}/prs`, { params });
  return data;
};

export const getCISummary = async (org: string): Promise<CISummary[]> => {
  const { data } = await api.get(`/api/analytics/${org}/ci-summary`);
  return data;
};

export const getBuildTrends = async (org: string): Promise<BuildTrend[]> => {
  const { data } = await api.get(`/api/analytics/${org}/ci-trends`);
  return data;
};

export const getFlakyWorkflows = async (org: string): Promise<FlakyWorkflow[]> => {
  const { data } = await api.get(`/api/analytics/${org}/ci-flaky`);
  return data;
};

export const getCommitActivity = async (org: string): Promise<CommitActivity[]> => {
  const { data } = await api.get(`/api/analytics/${org}/commit-activity`);
  return data;
};

export const getCodeChurn = async (org: string): Promise<CodeChurn[]> => {
  const { data } = await api.get(`/api/analytics/${org}/commit-churn`);
  return data;
};

export const getDigest = async (org: string, period: string): Promise<DigestData> => {
  const { data } = await api.get(`/api/analytics/${org}/digest?period=${period}`);
  return data;
};

// Documentations (S3)
export const getDocumentationRepos = async (
  org: string,
  provider: "github" | "gitlab" = "github"
): Promise<RepositoryWithDocs[]> => {
  const { data } = await api.get(`/api/documentations?org=${org}&provider=${provider}`);
  return data;
};

export const getRepoReleases = async (owner: string, repo: string): Promise<GitHubRelease[]> => {
  const { data } = await api.get(`/api/documentations/releases/${owner}/${repo}`);
  return data;
};

export const getDocumentationContent = async (docId: number): Promise<string> => {
  const { data } = await api.get(`/api/documentations/${docId}/content`, {
    transformResponse: [(d) => d],
  });
  return data;
};

export const getDocumentationBlobUrl = async (docId: number): Promise<string> => {
  const { data } = await api.get(`/api/documentations/${docId}/content`, {
    responseType: "blob",
  });
  return URL.createObjectURL(data);
};

export const createDocumentation = async (
  repoId: number,
  payload: { file_name: string; file_type?: string; content: string }
): Promise<Documentation> => {
  const { data } = await api.post(`/api/documentations/repo/${repoId}`, payload);
  return data;
};

export const uploadDocumentationFile = async (
  repoId: number,
  file: File,
  customFileName?: string
): Promise<Documentation> => {
  const formData = new FormData();
  formData.append("file", file, customFileName || file.name);
  const { data } = await api.post(`/api/documentations/repo/${repoId}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const updateDocumentation = async (
  docId: number,
  payload: { file_name?: string; content?: string }
): Promise<Documentation> => {
  const { data } = await api.put(`/api/documentations/${docId}`, payload);
  return data;
};

export const deleteDocumentation = async (docId: number): Promise<{ message: string; id: number }> => {
  const { data } = await api.delete(`/api/documentations/${docId}`);
  return data;
};

export const fetchRepoDocsFolder = async (repoId: number): Promise<Documentation[]> => {
  const { data } = await api.post(`/api/documentations/repo/${repoId}/fetch-docs`);
  return data;
};

export const fetchAllRepoDocsFolder = async (
  org: string,
  provider: "github" | "gitlab" = "github"
): Promise<RepositoryWithDocs[]> => {
  const { data } = await api.post(`/api/documentations/fetch-all-docs?org=${org}&provider=${provider}`);
  return data;
};

// Built-in Repository Projects & Tasks API
export const getRepoProjects = async (org: string, repoName: string): Promise<RepoProject[]> => {
  const { data } = await api.get(`/api/projects/repos/${org}/${repoName}`);
  return data;
};

export const createRepoProject = async (
  org: string,
  repoName: string,
  payload: { name: string; description?: string; key_prefix?: string; columns?: Array<{ id: string; name: string }> }
): Promise<RepoProject> => {
  const { data } = await api.post(`/api/projects/repos/${org}/${repoName}`, {
    repo_name: repoName,
    ...payload,
  });
  return data;
};


export const updateRepoProject = async (
  projectId: number,
  payload: { name?: string; description?: string; key_prefix?: string; status?: string; columns?: Array<{ id: string; name: string }> }
): Promise<RepoProject> => {
  const { data } = await api.put(`/api/projects/repo-projects/${projectId}`, payload);
  return data;
};

export const deleteRepoProject = async (projectId: number): Promise<{ message: string; id: number }> => {
  const { data } = await api.delete(`/api/projects/repo-projects/${projectId}`);
  return data;
};

export const getRepoProjectBoard = async (projectId: number): Promise<RepoProjectBoard> => {
  const { data } = await api.get(`/api/projects/repo-projects/${projectId}/board`);
  return data;
};

export const createProjectTask = async (
  projectId: number,
  payload: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    assignees?: string[];
    labels?: string[];
    story_points?: number;
  }
): Promise<ProjectTask> => {
  const { data } = await api.post(`/api/projects/repo-projects/${projectId}/tasks`, payload);
  return data;
};

export const updateProjectTask = async (
  taskId: number,
  payload: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assignees?: string[];
    labels?: string[];
    story_points?: number;
  }
): Promise<ProjectTask> => {
  const { data } = await api.put(`/api/projects/tasks/${taskId}`, payload);
  return data;
};

export const deleteProjectTask = async (taskId: number): Promise<{ message: string; id: number }> => {
  const { data } = await api.delete(`/api/projects/tasks/${taskId}`);
  return data;
};

// Settings & OpenAI Key
export const getUserSettings = async (): Promise<UserSettings> => {
  const { data } = await api.get("/api/settings");
  return data;
};

export const updateUserSettings = async (payload: {
  openai_api_key?: string | null;
  openai_model?: string;
}): Promise<UserSettings> => {
  const { data } = await api.post("/api/settings", payload);
  return data;
};

export const verifyOpenAIKey = async (
  openai_api_key: string
): Promise<{ valid: boolean; message: string }> => {
  const { data } = await api.post("/api/settings/verify-openai", { openai_api_key });
  return data;
};

// Security & Vulnerability Assessment
export const getRepoBranches = async (
  org: string,
  repoName: string,
  provider: "github" | "gitlab" = "github"
): Promise<RepoBranchesResponse> => {
  const { data } = await api.get(
    `/api/security/repos/${encodeURIComponent(org)}/${encodeURIComponent(repoName)}/branches?provider=${provider}`
  );
  return data;
};

export const runVulnerabilityScan = async (payload: {
  org: string;
  repo_name: string;
  branch?: string;
  provider?: string;
  openai_api_key?: string;
  model?: string;
}): Promise<VulnerabilityScan> => {
  const { data } = await api.post("/api/security/scan", payload);
  return data;
};

export const listVulnerabilityScans = async (
  org: string,
  repo?: string,
  limit = 50
): Promise<VulnerabilityScanSummary[]> => {
  const url = repo
    ? `/api/security/${org}/scans?repo=${encodeURIComponent(repo)}&limit=${limit}`
    : `/api/security/${org}/scans?limit=${limit}`;
  const { data } = await api.get(url);
  return data;
};

export const getVulnerabilityScan = async (scanId: number): Promise<VulnerabilityScan> => {
  const { data } = await api.get(`/api/security/scans/${scanId}`);
  return data;
};

export const deleteVulnerabilityScan = async (scanId: number): Promise<{ message: string }> => {
  const { data } = await api.delete(`/api/security/scans/${scanId}`);
  return data;
};

export const getOrgSecuritySummary = async (org: string): Promise<OrgSecuritySummary> => {
  const { data } = await api.get(`/api/security/${org}/summary`);
  return data;
};

export default api;




