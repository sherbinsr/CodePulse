"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { getRepoStats, getSyncStatus } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { formatHours } from "@/lib/utils";
import type { RepoStat, SyncStatus, User } from "@/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

function RepositoriesContent() {
  const params = useSearchParams();
  const org = params.get("org") ?? "";
  const [repos, setRepos] = useState<RepoStat[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    try {
      const [data, sync] = await Promise.all([getRepoStats(org), getSyncStatus(org)]);
      setRepos(data);
      setSyncStatus(sync);
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => { setUser(getUser()); load(); }, [load]);

  const filtered = repos.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
  const top10 = repos.slice(0, 10);

  return (
    <div className="flex flex-col h-full">
      <Header title="Repository Analytics" org={org} user={user} syncStatus={syncStatus} onSyncComplete={load} />
      <div className="flex-1 p-6 overflow-auto space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">PR Volume by Repository (Top 10)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={top10} margin={{ top: 0, right: 16, bottom: 60, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} angle={-35} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Bar dataKey="merged_prs" name="Merged" fill="#6366f1" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="open_prs" name="Open" fill="#22c55e" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">All Repositories</h3>
                <input
                  type="text"
                  placeholder="Search repos…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-48"
                />
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-5 py-3 text-slate-600 font-medium">Repository</th>
                    <th className="text-right px-4 py-3 text-slate-600 font-medium">Total PRs</th>
                    <th className="text-right px-4 py-3 text-slate-600 font-medium">Merged</th>
                    <th className="text-right px-4 py-3 text-slate-600 font-medium">Open</th>
                    <th className="text-right px-4 py-3 text-slate-600 font-medium">Merge %</th>
                    <th className="text-right px-4 py-3 text-slate-600 font-medium">Avg Merge</th>
                    <th className="text-right px-4 py-3 text-slate-600 font-medium">Avg Review</th>
                    <th className="text-right px-4 py-3 text-slate-600 font-medium">Contributors</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.repo} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-800">{r.name}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{r.total_prs}</td>
                      <td className="px-4 py-3 text-right text-purple-700">{r.merged_prs}</td>
                      <td className="px-4 py-3 text-right text-green-700">{r.open_prs}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.merge_rate >= 80 ? "bg-green-50 text-green-700" : r.merge_rate >= 50 ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-700"}`}>
                          {r.merge_rate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">{formatHours(r.avg_merge_hours)}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{formatHours(r.avg_review_hours)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{r.contributors}</td>
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
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
      <RepositoriesContent />
    </Suspense>
  );
}
