"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { getPRList, getRepoStats, getSyncStatus } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { formatHours, relativeTime, stateColor, getApiError } from "@/lib/utils";
import type { PullRequest, RepoStat, SyncStatus, User } from "@/types";

const PAGE_SIZE = 50;

function PRInsightsContent() {
  const params = useSearchParams();
  const org = params.get("org") ?? "";
  const provider = (params.get("provider") ?? "github") as "github" | "gitlab";
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [repos, setRepos] = useState<RepoStat[]>([]);
  const [filters, setFilters] = useState({ repo: "", author: "", state: "" });
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqRef = useRef(0);

  const load = useCallback(async () => {
    if (!org) return;
    const req = ++reqRef.current;
    setLoading(true);
    setError(null);
    try {
      const [{ data, total: t }, repoData, sync] = await Promise.all([
        getPRList(org, {
          repo: filters.repo || undefined,
          author: filters.author || undefined,
          state: filters.state || undefined,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        }),
        getRepoStats(org),
        getSyncStatus(org, provider),
      ]);
      if (req !== reqRef.current) return;
      setPrs(data);
      setTotal(t);
      setRepos(repoData);
      setSyncStatus(sync);
    } catch (e: unknown) {
      if (req !== reqRef.current) return;
      setError(getApiError(e, "Failed to load PR data."));
    } finally {
      if (req === reqRef.current) setLoading(false);
    }
  }, [org, filters, page]);

  useEffect(() => { setUser(getUser()); }, []);
  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <Header title="PR Insights" org={org} provider={provider} user={user} syncStatus={syncStatus} onSyncComplete={load} />
      <div className="flex-1 p-6 overflow-auto space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-wrap gap-3">
          <select
            value={filters.state}
            onChange={(e) => { setFilters({ ...filters, state: e.target.value }); setPage(0); }}
            className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">All States</option>
            <option value="OPEN">Open</option>
            <option value="MERGED">Merged</option>
            <option value="CLOSED">Closed</option>
          </select>
          <select
            value={filters.repo}
            onChange={(e) => { setFilters({ ...filters, repo: e.target.value }); setPage(0); }}
            className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">All Repos</option>
            {repos.map((r) => <option key={r.repo} value={r.repo}>{r.name}</option>)}
          </select>
          <input
            type="text"
            placeholder="Filter by author…"
            value={filters.author}
            onChange={(e) => { setFilters({ ...filters, author: e.target.value }); setPage(0); }}
            className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-44 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
          />
          <span className="text-sm text-slate-500 dark:text-slate-400 self-center ml-auto">
            {total.toLocaleString()} PRs
          </span>
        </div>

        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        )}

        {!loading && !error && org && prs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center gap-2">
            <p className="text-slate-500 dark:text-slate-400">No PRs found for <strong>{org}</strong>.</p>
            <p className="text-sm text-slate-400 dark:text-slate-500">Click <strong>Sync Now</strong> to fetch data from GitHub.</p>
          </div>
        )}

        {!loading && !error && prs.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-5 py-3 text-slate-600 dark:text-slate-400 font-medium">Pull Request</th>
                  <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Repository</th>
                  <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Author</th>
                  <th className="text-center px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">State</th>
                  <th className="text-right px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Changes</th>
                  <th className="text-right px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Reviews</th>
                  <th className="text-right px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Time to Merge</th>
                  <th className="text-right px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Opened</th>
                </tr>
              </thead>
              <tbody>
                {prs.map((pr) => (
                  <tr key={pr.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="px-5 py-3 max-w-xs">
                      <p className="font-medium text-slate-800 dark:text-slate-200 truncate" title={pr.title}>{pr.title}</p>
                      <p className="text-xs text-slate-400">#{pr.number}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">{pr.repo.split("/")[1]}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{pr.author}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stateColor(pr.state)}`}>
                        {pr.state}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      <span className="text-green-600">+{pr.additions}</span>
                      {" / "}
                      <span className="text-red-600">-{pr.deletions}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{pr.reviews_count}</td>
                    <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">{formatHours(pr.time_to_merge_hours)}</td>
                    <td className="px-4 py-3 text-right text-slate-400 text-xs">{relativeTime(pr.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 px-3 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-500 dark:text-slate-400">Page {page + 1} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 px-3 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PRInsightsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
      <PRInsightsContent />
    </Suspense>
  );
}
