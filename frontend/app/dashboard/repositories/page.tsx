"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { getRepoStats, getSyncStatus } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { formatHours } from "@/lib/utils";
import type { RepoStat, SyncStatus, User } from "@/types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

function EmptyState({ org, onSync }: { org: string; onSync: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
      <p className="text-slate-500">No repository data found for <strong>{org}</strong>.</p>
      <p className="text-sm text-slate-400">Click <strong>Sync Now</strong> in the header to fetch data from GitHub.</p>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-100 px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: entry.fill }} />
          <span className="text-slate-500">{entry.name}:</span>
          <span className="font-semibold text-slate-800">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function RepositoriesContent() {
  const params = useSearchParams();
  const org = params.get("org") ?? "";
  const [repos, setRepos] = useState<RepoStat[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    setError(null);
    try {
      const [data, sync] = await Promise.all([getRepoStats(org), getSyncStatus(org)]);
      setRepos(data);
      setSyncStatus(sync);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to load repository data.");
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => { setUser(getUser()); }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = repos.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );
  const top10 = repos.slice(0, 10);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <Header
        title="Repository Analytics"
        org={org}
        user={user}
        syncStatus={syncStatus}
        onSyncComplete={load}
      />
      <div className="flex-1 p-6 overflow-auto space-y-6">
        {!org && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-slate-600 text-sm">
            No organization selected. Go back to the overview and select one.
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        )}

        {!loading && !error && org && repos.length === 0 && (
          <EmptyState org={org} onSync={load} />
        )}

        {!loading && !error && repos.length > 0 && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-semibold text-slate-800 mb-5">
                PR Volume by Repository (Top 10)
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={top10}
                  margin={{ top: 0, right: 16, bottom: 60, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#475569" }}
                    angle={-35}
                    textAnchor="end"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
                  <Bar
                    dataKey="merged_prs"
                    name="Merged"
                    fill="#6366f1"
                    stackId="a"
                  />
                  <Bar
                    dataKey="open_prs"
                    name="Open"
                    fill="#10b981"
                    stackId="a"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-6 mt-4">
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  Merged
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Open
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">
                  All Repositories <span className="text-slate-400 font-normal">({repos.length})</span>
                </h3>
                <input
                  type="text"
                  placeholder="Search repos…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-48 bg-slate-50"
                />
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Repository</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Total PRs</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Merged</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Open</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Merge %</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Avg Merge</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Avg Review</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Contributors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((r) => (
                    <tr key={r.repo} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-slate-800">{r.name}</td>
                      <td className="px-4 py-3.5 text-right text-slate-700">{r.total_prs}</td>
                      <td className="px-4 py-3.5 text-right text-indigo-600 font-medium">{r.merged_prs}</td>
                      <td className="px-4 py-3.5 text-right text-emerald-600 font-medium">{r.open_prs}</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${r.merge_rate >= 80 ? "bg-emerald-50 text-emerald-700" : r.merge_rate >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                          {r.merge_rate}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-500">{formatHours(r.avg_merge_hours)}</td>
                      <td className="px-4 py-3.5 text-right text-slate-500">{formatHours(r.avg_review_hours)}</td>
                      <td className="px-4 py-3.5 text-right text-slate-700">{r.contributors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function RepositoriesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 bg-slate-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
      <RepositoriesContent />
    </Suspense>
  );
}
