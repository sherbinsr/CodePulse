"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { getRepoStats, getSyncStatus, generateRepoDocs } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { formatHours, getApiError } from "@/lib/utils";
import type { RepoStat, SyncStatus, User, DocGenResponse } from "@/types";
import { DocGeneratorModal } from "@/components/dashboard/doc-generator-modal";
import { Sparkles, FileText, CheckSquare, Square } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

function EmptyState({ org }: { org: string; onSync: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
      <p className="text-slate-500 dark:text-slate-400">No repository data found for <strong>{org}</strong>.</p>
      <p className="text-sm text-slate-400 dark:text-slate-500">Click <strong>Sync Now</strong> in the header to fetch data from GitHub.</p>
    </div>
  );
}

interface TooltipPayloadEntry {
  name: string;
  value: number;
  fill: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: entry.fill }} />
          <span className="text-slate-500 dark:text-slate-400">{entry.name}:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function RepositoriesContent() {
  const params = useSearchParams();
  const org = params.get("org") ?? "";
  const provider = (params.get("provider") ?? "github") as "github" | "gitlab";
  const [repos, setRepos] = useState<RepoStat[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Doc Generator state
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [docData, setDocData] = useState<DocGenResponse | null>(null);

  const reqRef = useRef(0);

  const load = useCallback(async () => {
    if (!org) return;
    const req = ++reqRef.current;
    setLoading(true);
    setError(null);
    try {
      const [data, sync] = await Promise.all([getRepoStats(org), getSyncStatus(org, provider)]);
      if (req !== reqRef.current) return;
      setRepos(data);
      setSyncStatus(sync);
    } catch (e: unknown) {
      if (req !== reqRef.current) return;
      setError(getApiError(e, "Failed to load repository data."));
    } finally {
      if (req === reqRef.current) setLoading(false);
    }
  }, [org, provider]);

  useEffect(() => { setUser(getUser()); }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => repos.filter((r) => r.name.toLowerCase().includes(search.toLowerCase())),
    [repos, search],
  );
  const top10 = useMemo(() => repos.slice(0, 10), [repos]);

  const toggleSelect = (name: string) => {
    setSelectedRepos((prev) =>
      prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRepos.length === filtered.length) {
      setSelectedRepos([]);
    } else {
      setSelectedRepos(filtered.map((r) => r.name));
    }
  };

  const handleGenerateDocs = async (targetRepos?: string[], overrideApiKey?: string) => {
    const reposToGen = targetRepos ?? selectedRepos;
    const keyToUse = overrideApiKey !== undefined ? overrideApiKey : (typeof window !== "undefined" ? localStorage.getItem("openai_api_key") || undefined : undefined);
    setDocModalOpen(true);
    setDocLoading(true);
    setDocError(null);
    try {
      const res = await generateRepoDocs(org, reposToGen, keyToUse);
      setDocData(res);
    } catch (e: unknown) {
      setDocError(getApiError(e, "Failed to generate documentation."));
    } finally {
      setDocLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <Header
        title="Repository Analytics"
        org={org}
        provider={provider}
        user={user}
        syncStatus={syncStatus}
        onSyncComplete={load}
      />
      <div className="flex-1 p-6 overflow-auto space-y-6">
        {!org && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 text-slate-600 dark:text-slate-300 text-sm">
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
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-5">
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
                <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  Merged
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Open
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                    All Repositories <span className="text-slate-400 font-normal">({repos.length})</span>
                  </h3>
                  <button
                    onClick={() => handleGenerateDocs()}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {selectedRepos.length > 0
                      ? `Generate Docs for ${selectedRepos.length} Repos`
                      : "Generate Docs for All Repos"}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Search repos…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-48 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
                />
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                    <th className="px-4 py-3 text-left w-10">
                      <button onClick={toggleSelectAll} className="p-1 text-slate-400 hover:text-indigo-600">
                        {selectedRepos.length === filtered.length && filtered.length > 0 ? (
                          <CheckSquare className="h-4 w-4 text-indigo-600" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Repository</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total PRs</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Merged</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Open</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Merge %</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Avg Merge</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Avg Review</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Contributors</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Docs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {filtered.map((r) => {
                    const isSelected = selectedRepos.includes(r.name);
                    return (
                      <tr key={r.repo} className={`hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${isSelected ? "bg-indigo-50/30 dark:bg-indigo-950/20" : ""}`}>
                        <td className="px-4 py-3.5">
                          <button onClick={() => toggleSelect(r.name)} className="p-1 text-slate-400 hover:text-indigo-600">
                            {isSelected ? <CheckSquare className="h-4 w-4 text-indigo-600" /> : <Square className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200">{r.name}</td>
                        <td className="px-4 py-3.5 text-right text-slate-700 dark:text-slate-300">{r.total_prs}</td>
                        <td className="px-4 py-3.5 text-right text-indigo-600 font-medium">{r.merged_prs}</td>
                        <td className="px-4 py-3.5 text-right text-emerald-600 font-medium">{r.open_prs}</td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${r.merge_rate >= 80 ? "bg-emerald-50 text-emerald-700" : r.merge_rate >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                            {r.merge_rate}%
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right text-slate-500 dark:text-slate-400">{formatHours(r.avg_merge_hours)}</td>
                        <td className="px-4 py-3.5 text-right text-slate-500 dark:text-slate-400">{formatHours(r.avg_review_hours)}</td>
                        <td className="px-4 py-3.5 text-right text-slate-700 dark:text-slate-300">{r.contributors}</td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => handleGenerateDocs([r.name])}
                            title="Generate docs for this repo"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <DocGeneratorModal
        isOpen={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        loading={docLoading}
        error={docError}
        data={docData}
        selectedRepoCount={selectedRepos.length}
        onRegenerate={(key) => handleGenerateDocs(undefined, key)}
      />
    </div>
  );
}

export default function RepositoriesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
      <RepositoriesContent />
    </Suspense>
  );
}
