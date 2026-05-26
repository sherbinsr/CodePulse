"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { getDeveloperStats, getReviewNetwork, getSyncStatus } from "@/lib/api";
import { getUser } from "@/lib/auth";
import type { DeveloperStat, ReviewNetwork, SyncStatus, User } from "@/types";

function ReviewsContent() {
  const params = useSearchParams();
  const org = params.get("org") ?? "";
  const [devs, setDevs] = useState<DeveloperStat[]>([]);
  const [network, setNetwork] = useState<ReviewNetwork[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    setError(null);
    try {
      const [d, n, sync] = await Promise.all([
        getDeveloperStats(org),
        getReviewNetwork(org),
        getSyncStatus(org),
      ]);
      setDevs(d);
      setNetwork(n);
      setSyncStatus(sync);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to load review data.");
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => { setUser(getUser()); }, []);
  useEffect(() => { load(); }, [load]);

  const topReviewers = [...devs].sort((a, b) => b.reviews_given - a.reviews_given).slice(0, 10);
  const topPairs = network.slice(0, 20);

  return (
    <div className="flex flex-col h-full">
      <Header title="Review Analytics" org={org} user={user} syncStatus={syncStatus} onSyncComplete={load} />
      <div className="flex-1 p-6 overflow-auto space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
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
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Top Reviewers</h3>
              <div className="space-y-3">
                {topReviewers.map((dev, idx) => (
                  <div key={dev.login} className="flex items-center gap-4">
                    <span className="text-slate-400 text-xs font-mono w-4">{idx + 1}</span>
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
                    <div className="text-right text-sm flex gap-3 w-44">
                      <span className="text-slate-700 font-medium">{dev.reviews_given} reviews</span>
                      <span className="text-green-600">{dev.approvals} ✓</span>
                      <span className="text-amber-600">{dev.change_requests} △</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Review network */}
            {topPairs.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-800 mb-4">Review Network (Who Reviews Whose PRs)</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 text-slate-600 font-medium">PR Author</th>
                      <th className="text-left px-4 py-3 text-slate-600 font-medium">Reviewed By</th>
                      <th className="text-right px-4 py-3 text-slate-600 font-medium">Reviews</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPairs.map((pair, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium text-slate-800">{pair.pr_author}</td>
                        <td className="px-4 py-2.5 text-indigo-700">{pair.reviewer}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                            {pair.review_count}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Participation grid */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Review Participation</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {devs.map((dev) => {
                  const total = dev.total_prs + dev.reviews_given;
                  const participation = total > 0 ? Math.round((dev.reviews_given / total) * 100) : 0;
                  return (
                    <div key={dev.login} className="bg-slate-50 rounded-lg p-3 flex flex-col gap-2">
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
                        <span>{participation}%</span>
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
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
      <ReviewsContent />
    </Suspense>
  );
}
