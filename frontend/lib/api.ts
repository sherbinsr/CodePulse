import axios from "axios";
import type {
  OrgOverview, DeveloperStat, RepoStat, MonthlyTrend,
  ReviewNetwork, PullRequest, Org, SyncStatus, User, DigestData,
  CISummary, BuildTrend, FlakyWorkflow, CommitActivity, CodeChurn,
  Documentation, RepositoryWithDocs, GitHubRelease, ProjectV2, ProjectBoard, ProjectItem,
  GitHubIssue, IssueTimelineDetails, RepoProject, ProjectTask, RepoProjectBoard,
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

// GitHub Projects v2 & Issues
export const getProjects = async (
  org: string,
  provider: "github" | "gitlab" = "github"
): Promise<ProjectV2[]> => {
  const { data } = await api.get(`/api/projects?org=${org}&provider=${provider}`);
  return data;
};

export const importProjectByNumber = async (
  org: string,
  projectNumber: number
): Promise<ProjectV2> => {
  const { data } = await api.post(`/api/projects/import-by-number?org=${org}&project_number=${projectNumber}`);
  return data;
};


export const getProjectBoard = async (projectId: number): Promise<ProjectBoard> => {
  const { data } = await api.get(`/api/projects/${projectId}/board`);
  return data;
};

export const updateProjectItemStatus = async (
  projectId: number,
  itemId: number,
  payload: { status: string; status_option_id?: string | null; field_id?: string | null }
): Promise<{ message: string; old_status: string; new_status: string }> => {
  const { data } = await api.post(`/api/projects/${projectId}/items/${itemId}/status`, payload);
  return data;
};

export const createProjectIssue = async (
  projectId: number,
  payload: {
    repo_name: string;
    owner: string;
    title: string;
    body?: string;
    assignees?: string[];
    labels?: string[];
    milestone?: number;
    priority?: string;
  }
): Promise<ProjectItem> => {
  const { data } = await api.post(`/api/projects/${projectId}/issues`, payload);
  return data;
};

export const updateProjectIssue = async (
  issueId: number,
  payload: {
    title?: string;
    body?: string;
    state?: string;
    assignees?: string[];
    labels?: string[];
  }
): Promise<GitHubIssue> => {
  const { data } = await api.put(`/api/projects/issues/${issueId}`, payload);
  return data;
};

export const getIssueTimelineDetails = async (
  owner: string,
  repo: string,
  issueNumber: number
): Promise<IssueTimelineDetails> => {

  const { data } = await api.get(`/api/projects/issues/${owner}/${repo}/${issueNumber}/details`);
  return data;
};

export const addIssueComment = async (
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
): Promise<any> => {
  const { data } = await api.post(`/api/projects/issues/${owner}/${repo}/${issueNumber}/comments`, { body });
  return data;
};

export const bulkUpdateProjectIssues = async (payload: {
  issue_ids: number[];
  status?: string;
  status_option_id?: string;
  state?: string;
  assignees?: string[];
  labels?: string[];
}): Promise<{ updated: number; message: string }> => {
  const { data } = await api.post("/api/projects/bulk-update", payload);
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
    sync_to_github?: boolean;
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

export default api;



