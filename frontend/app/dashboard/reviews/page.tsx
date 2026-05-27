"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { getDeveloperStats, getReviewNetwork, getSyncStatus } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { getApiError } from "@/lib/utils";
import type { DeveloperStat, ReviewNetwork, SyncStatus, User } from "@/types";

// ── Heatmap ───────────────────────────────────────────────────────────────────

function cellColor(count: number, max: number): string {
  if (count === 0 || max === 0) return "bg-slate-50 text-slate-300";
  const ratio = count / max;
  if (ratio >= 0.75) return "bg-emerald-600 text-white";
  if (ratio >= 0.5)  return "bg-emerald-400 text-white";
  if (ratio >= 0.25) return "bg-emerald-200 text-emerald-900";
  return "bg-emerald-100 text-emerald-700";
}

function ReviewHeatmap({ network }: { network: ReviewNetwork[] }) {
  const [tooltip, setTooltip] = useState<{ author: string; reviewer: string; count: number; x: number; y: number } | null>(null);

  // derive top authors and reviewers by total activity
  const authorTotals: Record<string, number> = {};
  const reviewerTotals: Record<string, number> = {};
  const matrix: Record<string, Record<string, number>> = {};

  for (const row of network) {
    authorTotals[row.pr_author] = (authorTotals[row.pr_author] || 0) + row.review_count;
    reviewerTotals[row.reviewer] = (reviewerTotals[row.reviewer] || 0) + row.review_count;
    if (!matrix[row.pr_author]) matrix[row.pr_author] = {};
    matrix[row.pr_author][row.reviewer] = row.review_count;
  }

  const authors = Object.entries(authorTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([login]) => login);

  const reviewers = Object.entries(reviewerTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([login]) => login);

  const max = Math.max(...network.map((r) => r.review_count), 1);

  if (authors.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="mb-5">
        <h3 className="font-semibold text-slate-800">Review Heatmap</h3>
        <p className="text-xs text-slate-400 mt-1">
          Rows = PR authors · Columns = reviewers · Color intensity = review count
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Column headers (reviewers) */}
          <div className="flex mb-1 ml-32">
            {reviewers.map((r) => (
              <div
                key={r}
                className="w-12 flex-shrink-0 flex items-end justify-center pb-1"
                style={{ height: 72 }}
              >
                <span
                  className="text-[10px] font-medium text-slate-500 leading-none"
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                    whiteSpace: "nowrap",
                    maxHeight: 70,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {r}
                </span>
              </div>
            ))}
          </div>

          {/* Rows */}
          {authors.map((author) => (
            <div key={author} className="flex items-center mb-1">
              {/* Row label */}
              <div className="w-32 flex-shrink-0 pr-3 text-right">
                <span className="text-xs font-medium text-slate-600 truncate block">{author}</span>
              </div>

              {/* Cells */}
              {reviewers.map((reviewer) => {
                const count = matrix[author]?.[reviewer] ?? 0;
                const isSelf = author === reviewer;
                return (
                  <div
                    key={reviewer}
                    className="w-12 h-10 flex-shrink-0 flex items-center justify-center rounded-md mx-0.5 cursor-default relative"
                    onMouseEnter={(e) => {
                      if (!isSelf)
                        setTooltip({
                          author,
                          reviewer,
                          count,
                          x: e.currentTarget.getBoundingClientRect().left,
                          y: e.currentTarget.getBoundingClientRect().top,
                        });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <div
                      className={`w-10 h-9 rounded-md flex items-center justify-center text-[11px] font-semibold transition-all ${
                        isSelf
                          ? "bg-slate-100 text-slate-300"
                          : cellColor(count, max)
                      }`}
                    >
                      {isSelf ? "—" : count > 0 ? count : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-5 justify-end">
        <span className="text-[11px] text-slate-400">Less</span>
        {["bg-emerald-100", "bg-emerald-200", "bg-emerald-400", "bg-emerald-600"].map((c) => (
          <span key={c} className={`inline-block w-5 h-5 rounded-sm ${c}`} />
        ))}
        <span className="text-[11px] text-slate-400">More</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl pointer-events-none"
          style={{ left: tooltip.x + 24, top: tooltip.y - 8 }}
        >
          <p className="font-semibold mb-0.5">{tooltip.reviewer} → {tooltip.author}</p>
          <p className="text-slate-300">
            {tooltip.count === 0
              ? "No reviews"
              : `${tooltip.count} review${tooltip.count > 1 ? "s" : ""}`}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function ReviewsContent() {
  const params = useSearchParams();
  const org = params.get("org") ?? "";
  const [devs, setDevs] = useState<DeveloperStat[]>([]);
  const [network, setNetwork] = useState<ReviewNetwork[]>([]);
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
      const [d, n, sync] = await Promise.all([
        getDeveloperStats(org),
        getReviewNetwork(org),
        getSyncStatus(org),
      ]);
      if (req !== reqRef.current) return;
      setDevs(d);
      setNetwork(n);
      setSyncStatus(sync);
    } catch (e: unknown) {
      if (req !== reqRef.current) return;
      setError(getApiError(e, "Failed to load review data."));
    } finally {
      if (req === reqRef.current) setLoading(false);
    }
  }, [org]);

  useEffect(() => { setUser(getUser()); }, []);
  useEffect(() => { load(); }, [load]);

  const topReviewers = useMemo(
    () => [...devs].sort((a, b) => b.reviews_given - a.reviews_given).slice(0, 10),
    [devs],
  );

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <Header title="Review Analytics" org={org} user={user} syncStatus={syncStatus} onSyncComplete={load} />
      <div className="flex-1 p-6 overflow-auto space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">{error}</div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        )}

        {!loading && !error && org && devs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center gap-2">
            <p className="text-slate-500">No review data found for <strong>{org}</strong>.</p>
            <p className="text-sm text-slate-400">Click <strong>Sync Now</strong> to fetch data from GitHub.</p>
          </div>
        )}

        {!loading && !error && devs.length > 0 && (
          <>
            {/* Top reviewers */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-semibold text-slate-800 mb-5">Top Reviewers</h3>
              <div className="space-y-3">
                {topReviewers.map((dev, idx) => (
                  <div key={dev.login} className="flex items-center gap-4">
                    <span className="text-slate-400 text-xs font-mono w-4 text-center">{idx + 1}</span>
                    {dev.avatar_url ? (
                      <Image src={dev.avatar_url} alt={dev.login} width={28} height={28} className="rounded-full" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                        {dev.login[0].toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-slate-800 text-sm w-32 truncate">{dev.login}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${(dev.reviews_given / (topReviewers[0]?.reviews_given || 1)) * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-4 text-sm w-44 justify-end">
                      <span className="text-slate-700 font-medium">{dev.reviews_given} reviews</span>
                      <span className="text-emerald-600 font-medium">{dev.approvals} ✓</span>
                      <span className="text-amber-600 font-medium">{dev.change_requests} △</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Heatmap — between Top Reviewers and Review Participation */}
            {network.length > 0 && <ReviewHeatmap network={network} />}

            {/* Review participation */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-semibold text-slate-800 mb-5">Review Participation</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {devs.map((dev) => {
                  const total = dev.total_prs + dev.reviews_given;
                  const participation = total > 0 ? Math.round((dev.reviews_given / total) * 100) : 0;
                  return (
                    <div key={dev.login} className="bg-slate-50 rounded-xl p-3 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        {dev.avatar_url ? (
                          <Image src={dev.avatar_url} alt={dev.login} width={20} height={20} className="rounded-full" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                            {dev.login[0].toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs font-medium text-slate-700 truncate">{dev.login}</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${participation}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>{dev.reviews_given} given</span>
                        <span className="font-medium">{participation}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 bg-slate-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
      <ReviewsContent />
    </Suspense>
  );
}
