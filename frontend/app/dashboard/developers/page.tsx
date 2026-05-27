"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { getDeveloperStats, getSyncStatus } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { formatHours } from "@/lib/utils";
import type { DeveloperStat, SyncStatus, User } from "@/types";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from "recharts";

function DevelopersContent() {
  const params = useSearchParams();
  const org = params.get("org") ?? "";
  const [devs, setDevs] = useState<DeveloperStat[]>([]);
  const [selected, setSelected] = useState<DeveloperStat | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    setError(null);
    try {
      const [data, sync] = await Promise.all([getDeveloperStats(org), getSyncStatus(org)]);
      setDevs(data);
      setSyncStatus(sync);
      if (data.length > 0) setSelected(data[0]);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to load developer data.");
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => { setUser(getUser()); }, []);
  useEffect(() => { load(); }, [load]);

  const radarData = selected
    ? [
        { metric: "PRs", value: selected.total_prs },
        { metric: "Merged", value: selected.merged_prs },
        { metric: "Reviews", value: selected.reviews_given },
        { metric: "Approvals", value: selected.approvals },
        { metric: "+k Lines", value: Math.round(selected.total_additions / 1000) },
      ]
    : [];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <Header title="Developer Analytics" org={org} user={user} syncStatus={syncStatus} onSyncComplete={load} />
      <div className="flex-1 p-6 overflow-auto">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">{error}</div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        )}

        {!loading && !error && org && devs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center gap-2">
            <p className="text-slate-500">No developer data found for <strong>{org}</strong>.</p>
            <p className="text-sm text-slate-400">Click <strong>Sync Now</strong> to fetch data from GitHub.</p>
          </div>
        )}

        {!loading && !error && devs.length > 0 && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Developer table */}
            <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Developer</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">PRs</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Merged</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Merge %</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Reviews</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Avg Merge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {devs.map((dev) => (
                    <tr
                      key={dev.login}
                      onClick={() => setSelected(dev)}
                      className={`cursor-pointer hover:bg-slate-50 transition-colors ${selected?.login === dev.login ? "bg-indigo-50 hover:bg-indigo-50" : ""}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {dev.avatar_url ? (
                            <Image src={dev.avatar_url} alt={dev.login} width={40} height={40} className="rounded-full flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-sm font-bold text-indigo-600 flex-shrink-0">
                              {dev.login[0].toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-slate-800">{dev.login}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-700">{dev.total_prs}</td>
                      <td className="px-4 py-3.5 text-right text-slate-700">{dev.merged_prs}</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${dev.merge_rate >= 80 ? "bg-emerald-50 text-emerald-700" : dev.merge_rate >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                          {dev.merge_rate}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-700">{dev.reviews_given}</td>
                      <td className="px-4 py-3.5 text-right text-slate-500">{formatHours(dev.avg_merge_hours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Detail panel */}
            {selected && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <div className="flex items-center gap-4 mb-5">
                    {selected.avatar_url ? (
                      <Image src={selected.avatar_url} alt={selected.login} width={48} height={48} className="rounded-full ring-2 ring-slate-100" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-xl font-bold text-indigo-600 ring-2 ring-indigo-100">
                        {selected.login[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-slate-900">{selected.login}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{selected.total_prs} PRs · {selected.reviews_given} reviews</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ["Merge Rate", `${selected.merge_rate}%`],
                      ["Avg Merge", formatHours(selected.avg_merge_hours)],
                      ["Approvals", selected.approvals],
                      ["Change Req.", selected.change_requests],
                      ["+Lines", `+${selected.total_additions.toLocaleString()}`],
                      ["-Lines", `-${selected.total_deletions.toLocaleString()}`],
                    ].map(([label, val]) => (
                      <div key={label as string} className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
                        <p className="font-semibold text-slate-800 mt-1">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <h4 className="font-semibold text-slate-700 text-sm mb-4">Activity Radar</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#f1f5f9" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DevelopersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 bg-slate-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
      <DevelopersContent />
    </Suspense>
  );
}
