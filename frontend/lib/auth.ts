"use client";
import type { User } from "@/types";

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function setToken(token: string): void {
  localStorage.setItem("token", token);
}

export function removeToken(): void {
  localStorage.removeItem("token");
}

export function getUser(): User | null {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setUser(user: User): void {
  localStorage.setItem("user", JSON.stringify(user));
}

export function logout(): void {
  localStorage.clear();
}

export function getGitHubOAuthUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID!;
  const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
  const scope = encodeURIComponent("read:org repo read:user user:email");
  return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
}

export function getGitLabOAuthUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_GITLAB_CLIENT_ID!;
  const redirectUri = encodeURIComponent(`${window.location.origin}/auth/gitlab/callback`);
  const scope = encodeURIComponent("read_api read_user read_repository");
  return `https://gitlab.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
}
