"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { getDeveloperStats, getSyncStatus } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { formatHours, stateColor } from "@/lib/utils";
import type { DeveloperStat, SyncStatus, User } from "@/types";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

function DevelopersContent() {
  const params = useSearchParams();
  const org = params.get("org") ?? "";
  const [devs, setDevs] = useState<DeveloperStat[]>([]);
  const [selected, setSelected] = useState<DeveloperStat | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    try {
      const [data, sync] = await Promise.all([getDeveloperStats(org), getSyncStatus(org)]);
      setDevs(data);
      setSyncStatus(sync);
      if (data.length > 0) setSelected(data[0]);
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => {
    setUser(getUser());
    load();
  }, [load]);

  const radarData = selected
    ? [
        { metric: "PRs", value: selected.total_prs },
        { metric: "Merged", value: selected.merged_prs },
        { metric: "Reviews", value: selected.reviews_given },
        { metric: "Approvals", value: selected.approvals },
        { metric: "Additions(k)", value: Math.round(selected.total_additions / 1000) },
      ]
    : [];

  return (
    <div className="flex flex-col h-full">
      <Header title="Developer Analytics" org={org} user={user} syncStatus={syncStatus} onSyncComplete={load} />
      <div className="flex-1 p-6 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Table */}
            <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-slate-600 font-medium">Developer</th>
                    <th className="text-right px-4 py-3 text-slate-600 font-medium">PRs</th>
                    <th className="text-right px-4 py-3 text-slate-600 font-medium">Merged</th>
                    <th className="text-right px-4 py-3 text-slate-600 font-medium">Merge %</th>
                    <th className="text-right px-4 py-3 text-slate-600 font-medium">Reviews</th>
                    <th className="text-right px-4 py-3 text-slate-600 font-medium">Avg Merge</th>
                  </tr>
                </thead>
                <tbody>
                  {devs.map((dev) => (
                    <tr
                      key={dev.login}
                      onClick={() => setSelected(dev)}
                      className={`border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${selected?.login === dev.login ? "bg-indigo-50" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {dev.avatar_url ? (
                            <Image src={dev.avatar_url} alt={dev.login} width={24} height={24} className="rounded-full" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                              {dev.login[0].toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-slate-800">{dev.login}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">{dev.total_prs}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{dev.merged_prs}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${dev.merge_rate >= 80 ? "bg-green-50 text-green-700" : dev.merge_rate >= 50 ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-700"}`}>
                          {dev.merge_rate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">{dev.reviews_given}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{formatHours(dev.avg_merge_hours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Detail panel */}
            {selected && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    {selected.avatar_url ? (
                      <Image src={selected.avatar_url} alt={selected.login} width={48} height={48} className="rounded-full" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-600">
                        {selected.login[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-slate-900">{selected.login}</h3>
                      <p className="text-xs text-slate-400">{selected.total_prs} PRs · {selected.reviews_given} reviews given</p>
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
                      <div key={label as string} className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500">{label}</p>
                        <p className="font-semibold text-slate-800 mt-0.5">{val}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <h4 className="font-medium text-slate-700 text-sm mb-3">Activity Radar</h4>
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
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
      <DevelopersContent />
    </Suspense>
  );
}
