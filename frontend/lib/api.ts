import axios from "axios";
import type {
  OrgOverview, DeveloperStat, RepoStat, MonthlyTrend,
  ReviewNetwork, PullRequest, Org, SyncStatus, User, DigestData,
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

export const getMe = async (token: string): Promise<User> => {
  const { data } = await api.get(`/api/auth/me?token=${token}`);
  return data;
};

// Orgs
export const listOrgs = async (): Promise<Org[]> => {
  const { data } = await api.get("/api/orgs");
  return data;
};

export const triggerSync = async (org: string): Promise<{ job_id: number; status: string; message: string }> => {
  const { data } = await api.post(`/api/orgs/${org}/sync`);
  return data;
};

export const getSyncStatus = async (org: string): Promise<SyncStatus> => {
  const { data } = await api.get(`/api/orgs/${org}/sync/status`);
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

export const getDigest = async (org: string, period: string): Promise<DigestData> => {
  const { data } = await api.get(`/api/analytics/${org}/digest?period=${period}`);
  return data;
};

export default api;
