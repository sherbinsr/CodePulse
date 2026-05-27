"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { getDigest, getSyncStatus } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { formatHours, getApiError } from "@/lib/utils";
import { Download, FileText, Calendar, Users, GitMerge, Clock } from "lucide-react";
import type { DigestData, SyncStatus, User } from "@/types";

const PERIODS = [
  { value: "1w", label: "1 Week" },
  { value: "2w", label: "2 Weeks" },
  { value: "3w", label: "3 Weeks" },
  { value: "1m", label: "1 Month" },
  { value: "2m", label: "2 Months" },
  { value: "3m", label: "3 Months" },
  { value: "6m", label: "6 Months" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("default", { day: "numeric", month: "short", year: "numeric" });
}

function StatPill({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-slate-50 rounded-xl px-4 py-3 flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</span>
      <span className="text-2xl font-bold text-slate-800">{value}</span>
      {sub && <span className="text-xs text-slate-400">{sub}</span>}
    </div>
  );
}

function DigestPreview({ digest, org }: { digest: DigestData; org: string }) {
  return (
    <div id="digest-preview" className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-indigo-600 px-8 py-6">
        <div className="flex items-center gap-3 mb-1">
          <FileText className="h-5 w-5 text-indigo-200" />
          <span className="text-indigo-200 text-sm font-medium">Team Digest</span>
        </div>
        <h2 className="text-white text-2xl font-bold">{org}</h2>
        <div className="flex items-center gap-2 mt-2 text-indigo-200 text-sm">
          <Calendar className="h-4 w-4" />
          <span>{digest.period_label} · {formatDate(digest.since)} – {formatDate(digest.until)}</span>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Summary metrics */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatPill label="Total PRs" value={digest.total_prs} />
            <StatPill label="Merged" value={digest.merged_prs} sub={`${digest.merge_rate}% merge rate`} />
            <StatPill label="Open" value={digest.open_prs} />
            <StatPill label="Contributors" value={digest.unique_contributors} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            <StatPill
              label="Avg Merge Time"
              value={digest.avg_merge_hours != null ? formatHours(digest.avg_merge_hours) : "—"}
            />
            <StatPill
              label="Avg First Review"
              value={digest.avg_review_hours != null ? formatHours(digest.avg_review_hours) : "—"}
            />
            <StatPill label="Total Reviews" value={digest.total_reviews} />
          </div>
        </div>

        {/* Top Contributors */}
        {digest.top_contributors.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Top Contributors</h3>
            <div className="space-y-2">
              {digest.top_contributors.map((c, i) => (
                <div key={c.login} className="flex items-center gap-4 py-2.5 px-4 rounded-xl bg-slate-50">
                  <span className="text-sm font-bold text-slate-400 w-5 text-center">{i + 1}</span>
                  {c.avatar_url ? (
                    <Image src={c.avatar_url} alt={c.login} width={32} height={32} className="rounded-full" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-indigo-600">{c.login[0].toUpperCase()}</span>
                    </div>
                  )}
                  <span className="flex-1 font-medium text-slate-800 text-sm">{c.login}</span>
                  <div className="flex items-center gap-6 text-xs text-slate-500">
                    <span><span className="font-semibold text-slate-700">{c.total_prs}</span> PRs</span>
                    <span><span className="font-semibold text-indigo-600">{c.merged_prs}</span> merged</span>
                    <span><span className="font-semibold text-emerald-600">{c.reviews_given}</span> reviews</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Repos */}
        {digest.top_repos.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Top Repositories</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left pb-2 text-xs font-semibold text-slate-400">Repository</th>
                  <th className="text-right pb-2 text-xs font-semibold text-slate-400">Total PRs</th>
                  <th className="text-right pb-2 text-xs font-semibold text-slate-400">Merged</th>
                  <th className="text-right pb-2 text-xs font-semibold text-slate-400">Merge %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {digest.top_repos.map((r) => (
                  <tr key={r.name}>
                    <td className="py-2.5 font-medium text-slate-800">{r.name}</td>
                    <td className="py-2.5 text-right text-slate-600">{r.total_prs}</td>
                    <td className="py-2.5 text-right text-indigo-600 font-medium">{r.merged_prs}</td>
                    <td className="py-2.5 text-right">
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                        r.merge_rate >= 80 ? "bg-emerald-50 text-emerald-700" :
                        r.merge_rate >= 50 ? "bg-amber-50 text-amber-700" :
                        "bg-red-50 text-red-700"
                      }`}>{r.merge_rate}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-slate-300 text-right">
          Generated by CodePulse · {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

function DigestContent() {
  const params = useSearchParams();
  const org = params.get("org") ?? "";
  const [period, setPeriod] = useState("1w");
  const [digest, setDigest] = useState<DigestData | null>(null);
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
      const [data, sync] = await Promise.all([getDigest(org, period), getSyncStatus(org)]);
      if (req !== reqRef.current) return;
      setDigest(data);
      setSyncStatus(sync);
    } catch (e: unknown) {
      if (req !== reqRef.current) return;
      setError(getApiError(e, "Failed to load digest."));
    } finally {
      if (req === reqRef.current) setLoading(false);
    }
  }, [org, period]);

  useEffect(() => { setUser(getUser()); }, []);
  useEffect(() => { load(); }, [load]);

  const downloadCSV = () => {
    if (!digest) return;
    const lines = [
      ["CodePulse Digest", digest.org, digest.period_label],
      ["Period", `${digest.since} to ${digest.until}`],
      [],
      ["Metric", "Value"],
      ["Total PRs", digest.total_prs],
      ["Merged PRs", digest.merged_prs],
      ["Open PRs", digest.open_prs],
      ["Merge Rate", `${digest.merge_rate}%`],
      ["Avg Merge Time", digest.avg_merge_hours != null ? formatHours(digest.avg_merge_hours) : "N/A"],
      ["Avg First Review", digest.avg_review_hours != null ? formatHours(digest.avg_review_hours) : "N/A"],
      ["Unique Contributors", digest.unique_contributors],
      ["Total Reviews", digest.total_reviews],
      [],
      ["Top Contributors"],
      ["Login", "Total PRs", "Merged", "Reviews Given"],
      ...digest.top_contributors.map((c) => [c.login, c.total_prs, c.merged_prs, c.reviews_given]),
      [],
      ["Top Repositories"],
      ["Repository", "Total PRs", "Merged", "Merge Rate"],
      ...digest.top_repos.map((r) => [r.name, r.total_prs, r.merged_prs, `${r.merge_rate}%`]),
    ];
    const csv = lines.map((row) => row.map(String).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${digest.org}-digest-${period}-${digest.since}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #digest-preview, #digest-preview * { visibility: visible; }
          #digest-preview { position: fixed; inset: 0; box-shadow: none; border: none; border-radius: 0; }
        }
      `}</style>

      <div className="flex flex-col h-full bg-slate-50">
        <Header
          title="Digest"
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
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">{error}</div>
          )}

          {org && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800 mb-1">Generate Digest</h3>
                  <p className="text-sm text-slate-500">Select a time window to preview and download your team's activity report.</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex rounded-xl overflow-hidden border border-slate-200">
                    {PERIODS.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setPeriod(p.value)}
                        className={`px-3 py-2 text-xs font-semibold transition-colors ${
                          period === p.value
                            ? "bg-indigo-600 text-white"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {digest && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={downloadCSV}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        CSV
                      </button>
                      <button
                        onClick={downloadPDF}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          )}

          {!loading && digest && <DigestPreview digest={digest} org={org} />}
        </div>
      </div>
    </>
  );
}

export default function DigestPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 bg-slate-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
      <DigestContent />
    </Suspense>
  );
}
