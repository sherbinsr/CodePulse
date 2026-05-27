"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { getCISummary, getBuildTrends, getFlakyWorkflows, getSyncStatus } from "@/lib/api";
import { getUser } from "@/lib/auth";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { CISummary, BuildTrend, FlakyWorkflow, SyncStatus, User } from "@/types";

function fmtSeconds(s: number | null) {
  if (s == null) return "—";
  if (s < 60) return `${Math.round(s)}s`;
  return `${Math.round(s / 60)}m ${Math.round(s % 60)}s`;
}

function fmtWeek(w: string) {
  return new Date(w).toLocaleDateString("default", { month: "short", day: "numeric" });
}

function PassRateBadge({ rate }: { rate: number }) {
  const cls =
    rate >= 80 ? "bg-emerald-50 text-emerald-700" :
    rate >= 60 ? "bg-amber-50 text-amber-700" :
    "bg-red-50 text-red-700";
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>
      {rate}%
    </span>
  );
}

function CIContent() {
  const params = useSearchParams();
  const org = params.get("org") ?? "";
  const [summary, setSummary] = useState<CISummary[]>([]);
  const [trends, setTrends] = useState<BuildTrend[]>([]);
  const [flaky, setFlaky] = useState<FlakyWorkflow[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    setError(null);
    try {
      const [s, t, f, sync] = await Promise.all([
        getCISummary(org),
        getBuildTrends(org),
        getFlakyWorkflows(org),
        getSyncStatus(org),
      ]);
      setSummary(s);
      setTrends(t);
      setFlaky(f);
      setSyncStatus(sync);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to load CI data.");
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => { setUser(getUser()); }, []);
  useEffect(() => { load(); }, [load]);

  // Aggregate weekly avg duration across all repos for the trend chart
  const weeklyAvg = useMemo(() => {
    const byWeek: Record<string, { total: number; count: number }> = {};
    for (const t of trends) {
      if (!byWeek[t.week]) byWeek[t.week] = { total: 0, count: 0 };
      byWeek[t.week].total += t.avg_duration_seconds * t.run_count;
      byWeek[t.week].count += t.run_count;
    }
    return Object.entries(byWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, { total, count }]) => ({
        week,
        avg_seconds: Math.round(total / count),
        avg_minutes: +(total / count / 60).toFixed(1),
      }));
  }, [trends]);

  const isEmpty = !loading && !error && summary.length === 0;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <Header title="CI Insights" org={org} user={user} syncStatus={syncStatus} onSyncComplete={load} />
      <div className="flex-1 p-6 overflow-auto space-y-6">
        {!org && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-slate-600 text-sm">
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
            <p className="text-slate-500">No CI data found for <strong>{org}</strong>.</p>
            <p className="text-sm text-slate-400">
              CI data is collected during sync. Ensure repositories use GitHub Actions and trigger a sync.
            </p>
          </div>
        )}

        {!loading && !error && summary.length > 0 && (
          <>
            {/* CI Summary table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">CI Pass Rate by Repository</h3>
                <p className="text-xs text-slate-400 mt-0.5">First-try = passed on the very first run attempt</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Repository</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Total Runs</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">First-Try Pass</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Overall Pass</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Avg Build Time</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Failed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {summary.map((r) => (
                    <tr key={r.repo} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-slate-800">{r.name}</td>
                      <td className="px-4 py-3.5 text-right text-slate-600">{r.total_runs}</td>
                      <td className="px-4 py-3.5 text-right"><PassRateBadge rate={r.first_try_pass_rate} /></td>
                      <td className="px-4 py-3.5 text-right"><PassRateBadge rate={r.overall_pass_rate} /></td>
                      <td className="px-4 py-3.5 text-right text-slate-500">{fmtSeconds(r.avg_duration_seconds)}</td>
                      <td className="px-4 py-3.5 text-right text-red-500 font-medium">{r.failed_runs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Build Time Trend */}
            {weeklyAvg.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="font-semibold text-slate-800 mb-1">Avg Build Time Trend</h3>
                <p className="text-xs text-slate-400 mb-5">Org-wide weekly average for successful runs (minutes)</p>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={weeklyAvg} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                    <defs>
                      <linearGradient id="buildGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
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
                      tickFormatter={(v) => `${v}m`}
                    />
                    <Tooltip
                      formatter={(v: number) => [`${v}m`, "Avg Build"]}
                      labelFormatter={fmtWeek}
                    />
                    <Area
                      type="monotone"
                      dataKey="avg_minutes"
                      name="Avg Build (min)"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fill="url(#buildGrad)"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Flaky Workflows */}
            {flaky.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-800">Flaky Workflows</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Workflows that failed then re-ran to success (run_attempt &gt; 1)</p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Workflow</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Repository</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Flaky Runs</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Total Runs</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Flakiness</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {flaky.map((f, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3.5 font-medium text-slate-800">{f.workflow_name}</td>
                        <td className="px-4 py-3.5 text-slate-500">{f.repo_name}</td>
                        <td className="px-4 py-3.5 text-right text-amber-600 font-medium">{f.flaky_count}</td>
                        <td className="px-4 py-3.5 text-right text-slate-600">{f.total_runs}</td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${
                            f.flakiness_rate >= 20 ? "bg-red-50 text-red-700" :
                            f.flakiness_rate >= 10 ? "bg-amber-50 text-amber-700" :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            {f.flakiness_rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function CIInsightsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 bg-slate-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
      <CIContent />
    </Suspense>
  );
}
