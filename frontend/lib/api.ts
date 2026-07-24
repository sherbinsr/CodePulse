import axios from "axios";
import type {
  OrgOverview, DeveloperStat, RepoStat, MonthlyTrend,
  ReviewNetwork, PullRequest, Org, SyncStatus, User, DigestData,
  CISummary, BuildTrend, FlakyWorkflow, CommitActivity, CodeChurn,
  Documentation, RepositoryWithDocs,
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

export const getMe = async (token: string): Promise<User> => {
  const { data } = await api.get(`/api/auth/me?token=${token}`);
  return data;
};

// Orgs
export const listOrgs = async (): Promise<Org[]> => {
  const { data } = await api.get("/api/orgs");
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
  params?: { repo?: string; author?: string; state?: string; limit?: number; offset?: number }
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

export const getDocumentationContent = async (docId: number): Promise<string> => {
  const { data } = await api.get(`/api/documentations/${docId}/content`, {
    transformResponse: [(d) => d],
  });
  return data;
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
  file: File
): Promise<Documentation> => {
  const formData = new FormData();
  formData.append("file", file);
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

export default api;

