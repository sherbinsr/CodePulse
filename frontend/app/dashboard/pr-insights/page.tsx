"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { getPRList, getRepoStats, getSyncStatus } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { formatHours, relativeTime, stateColor } from "@/lib/utils";
import type { PullRequest, RepoStat, SyncStatus, User } from "@/types";

const PAGE_SIZE = 50;

function PRInsightsContent() {
  const params = useSearchParams();
  const org = params.get("org") ?? "";
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [repos, setRepos] = useState<RepoStat[]>([]);
  const [filters, setFilters] = useState({ repo: "", author: "", state: "" });
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);
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
        getSyncStatus(org),
      ]);
      setPrs(data);
      setTotal(t);
      setRepos(repoData);
      setSyncStatus(sync);
    } finally {
      setLoading(false);
    }
  }, [org, filters, page]);

  useEffect(() => { setUser(getUser()); }, []);
  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-col h-full">
      <Header title="PR Insights" org={org} user={user} syncStatus={syncStatus} onSyncComplete={load} />
      <div className="flex-1 p-6 overflow-auto space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3">
          <select
            value={filters.state}
            onChange={(e) => { setFilters({ ...filters, state: e.target.value }); setPage(0); }}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">All States</option>
            <option value="OPEN">Open</option>
            <option value="MERGED">Merged</option>
            <option value="CLOSED">Closed</option>
          </select>
          <select
            value={filters.repo}
            onChange={(e) => { setFilters({ ...filters, repo: e.target.value }); setPage(0); }}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">All Repos</option>
            {repos.map((r) => <option key={r.repo} value={r.repo}>{r.name}</option>)}
          </select>
          <input
            type="text"
            placeholder="Filter by author…"
            value={filters.author}
            onChange={(e) => { setFilters({ ...filters, author: e.target.value }); setPage(0); }}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-44"
          />
          <span className="text-sm text-slate-500 self-center ml-auto">{total.toLocaleString()} PRs</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 text-slate-600 font-medium">Pull Request</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Repository</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Author</th>
                  <th className="text-center px-4 py-3 text-slate-600 font-medium">State</th>
                  <th className="text-right px-4 py-3 text-slate-600 font-medium">Changes</th>
                  <th className="text-right px-4 py-3 text-slate-600 font-medium">Reviews</th>
                  <th className="text-right px-4 py-3 text-slate-600 font-medium">Time to Merge</th>
                  <th className="text-right px-4 py-3 text-slate-600 font-medium">Opened</th>
                </tr>
              </thead>
              <tbody>
                {prs.map((pr) => (
                  <tr key={pr.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-3 max-w-xs">
                      <p className="font-medium text-slate-800 truncate" title={pr.title}>{pr.title}</p>
                      <p className="text-xs text-slate-400">#{pr.number}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{pr.repo.split("/")[1]}</td>
                    <td className="px-4 py-3 text-slate-700">{pr.author}</td>
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
                    <td className="px-4 py-3 text-right text-slate-700">{pr.reviews_count}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{formatHours(pr.time_to_merge_hours)}</td>
                    <td className="px-4 py-3 text-right text-slate-400 text-xs">{relativeTime(pr.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-200">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="text-sm text-slate-600 hover:text-slate-900 disabled:opacity-40 px-3 py-1 rounded border border-slate-200 hover:bg-white transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-500">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="text-sm text-slate-600 hover:text-slate-900 disabled:opacity-40 px-3 py-1 rounded border border-slate-200 hover:bg-white transition-colors"
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
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
      <PRInsightsContent />
    </Suspense>
  );
}
