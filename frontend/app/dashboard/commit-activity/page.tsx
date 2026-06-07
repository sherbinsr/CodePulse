"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { getCommitActivity, getCodeChurn, getSyncStatus } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { Moon } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { CommitActivity, CodeChurn, SyncStatus, User } from "@/types";

function fmtWeek(w: string) {
  return new Date(w).toLocaleDateString("default", { month: "short", day: "numeric" });
}

function BurnoutBadge({ pct, label }: { pct: number; label: string }) {
  if (pct >= 30) return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700">
      <Moon className="h-3 w-3" /> {pct}%
    </span>
  );
  if (pct >= 15) return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
      {pct}%
    </span>
  );
  return <span className="text-xs text-slate-400">{pct}%</span>;
}

function CommitContent() {
  const params = useSearchParams();
  const org = params.get("org") ?? "";
  const provider = (params.get("provider") ?? "github") as "github" | "gitlab";
  const [activity, setActivity] = useState<CommitActivity[]>([]);
  const [churn, setChurn] = useState<CodeChurn[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    setError(null);
    try {
      const [a, c, sync] = await Promise.all([
        getCommitActivity(org),
        getCodeChurn(org),
        getSyncStatus(org, provider),
      ]);
      setActivity(a);
      setChurn(c);
      setSyncStatus(sync);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to load commit data.");
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => { setUser(getUser()); }, []);
  useEffect(() => { load(); }, [load]);

  const churnChart = useMemo(() => {
    const topRepos = [...new Set(churn.map((c) => c.repo_name))].slice(0, 5);
    const byWeek: Record<string, Record<string, any>> = {};
    for (const c of churn) {
      if (!byWeek[c.week]) byWeek[c.week] = { week: c.week };
      if (topRepos.includes(c.repo_name)) byWeek[c.week][c.repo_name] = c.total_commits;
    }
    return {
      weeks: Object.values(byWeek).sort((a, b) => String(a.week).localeCompare(String(b.week))),
      topRepos,
    };
  }, [churn]);

  const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6"];
  const isEmpty = !loading && !error && activity.length === 0;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <Header title="Commit Activity" org={org} provider={provider} user={user} syncStatus={syncStatus} onSyncComplete={load} />
      <div className="flex-1 p-6 overflow-auto space-y-6">
        {!org && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 text-slate-600 dark:text-slate-300 text-sm">
            No organization selected.
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">{error}</div>
        )}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        )}
        {isEmpty && org && (
          <div className="flex flex-col items-center justify-center h-64 text-center gap-2">
            <p className="text-slate-500 dark:text-slate-400">No commit data found for <strong>{org}</strong>.</p>
            <p className="text-sm text-slate-400 dark:text-slate-500">Commit data is collected during sync (last 90 days).</p>
          </div>
        )}

        {!loading && !error && activity.length > 0 && (
          <>
            {/* Developer Commit Activity */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Developer Commit Activity</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Last 90 days · After-hours = before 9 AM or after 8 PM ·{" "}
                  <Moon className="inline h-3 w-3 text-red-400" /> = high after-hours rate (≥ 30%)
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Developer</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Commits</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Active Days</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Commits/Day</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">After-Hours</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Weekend</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Repos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {activity.map((dev) => (
                    <tr key={dev.author_login} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          {dev.author_avatar ? (
                            <Image src={dev.author_avatar} alt={dev.author_login} width={24} height={24} className="rounded-full" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-xs font-bold text-indigo-600">
                              {dev.author_login[0].toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-slate-800 dark:text-slate-200">{dev.author_login}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-slate-800 dark:text-slate-200">{dev.total_commits}</td>
                      <td className="px-4 py-3.5 text-right text-slate-500 dark:text-slate-400">{dev.active_days}</td>
                      <td className="px-4 py-3.5 text-right text-slate-500 dark:text-slate-400">{dev.commits_per_active_day}</td>
                      <td className="px-4 py-3.5 text-right">
                        <BurnoutBadge pct={dev.after_hours_pct} label="after hours" />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <BurnoutBadge pct={dev.weekend_pct} label="weekend" />
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-600 dark:text-slate-400">{dev.repos_contributed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Code Churn chart */}
            {churnChart.weeks.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Weekly Code Churn</h3>
                <p className="text-xs text-slate-400 mb-5">Commits per week by repository (top 5, last 8 weeks)</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={churnChart.weeks} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                    <XAxis
                      dataKey="week"
                      tickFormatter={fmtWeek}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip labelFormatter={fmtWeek} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                    {churnChart.topRepos.map((repo, i) => (
                      <Bar
                        key={repo}
                        dataKey={repo}
                        stackId="a"
                        fill={COLORS[i % COLORS.length]}
                        radius={i === churnChart.topRepos.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* After-hours leaderboard */}
            {activity.some((d) => d.after_hours_pct >= 15) && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">After-Hours Signal</h3>
                <p className="text-xs text-slate-400 mb-5">
                  Developers with elevated after-hours or weekend commit rates — a potential burnout indicator.
                </p>
                <div className="space-y-3">
                  {activity
                    .filter((d) => d.after_hours_pct >= 15 || d.weekend_pct >= 15)
                    .slice(0, 8)
                    .map((dev) => (
                      <div key={dev.author_login} className="flex items-center gap-4">
                        {dev.author_avatar ? (
                          <Image src={dev.author_avatar} alt={dev.author_login} width={28} height={28} className="rounded-full" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-300">
                            {dev.author_login[0].toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-slate-800 dark:text-slate-200 text-sm w-32 truncate">{dev.author_login}</span>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="w-20">After-hours</span>
                            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${dev.after_hours_pct >= 30 ? "bg-red-400" : "bg-amber-400"}`}
                                style={{ width: `${Math.min(dev.after_hours_pct, 100)}%` }}
                              />
                            </div>
                            <span className="w-10 text-right font-medium">{dev.after_hours_pct}%</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="w-20">Weekend</span>
                            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${dev.weekend_pct >= 20 ? "bg-red-400" : "bg-amber-300"}`}
                                style={{ width: `${Math.min(dev.weekend_pct, 100)}%` }}
                              />
                            </div>
                            <span className="w-10 text-right font-medium">{dev.weekend_pct}%</span>
                          </div>
                        </div>
                        <span className="text-xs text-slate-400 w-16 text-right">{dev.total_commits} commits</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function CommitActivityPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
      <CommitContent />
    </Suspense>
  );
}
