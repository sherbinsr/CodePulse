"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { PRTrendChart } from "@/components/dashboard/pr-trend-chart";
import { ContributorLeaderboard } from "@/components/dashboard/contributor-leaderboard";
import { ReviewTimeChart } from "@/components/dashboard/review-time-chart";
import {
  getOrgOverview, getDeveloperStats, getMonthlyTrends, getSyncStatus,
} from "@/lib/api";
import { getUser } from "@/lib/auth";
import { formatHours } from "@/lib/utils";
import type { OrgOverview, DeveloperStat, MonthlyTrend, SyncStatus, User } from "@/types";
import {
  GitPullRequest, GitMerge, Clock, Users, Star, BarChart3, Layers,
} from "lucide-react";

function DashboardContent() {
  const params = useSearchParams();
  const org = params.get("org") ?? "";
  const [overview, setOverview] = useState<OrgOverview | null>(null);
  const [devStats, setDevStats] = useState<DeveloperStat[]>([]);
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [noData, setNoData] = useState(false);

  const loadData = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    setNoData(false);
    try {
      const [ov, devs, tr, sync] = await Promise.all([
        getOrgOverview(org),
        getDeveloperStats(org),
        getMonthlyTrends(org, 6),
        getSyncStatus(org),
      ]);
      setOverview(ov);
      setDevStats(devs);
      setTrends(tr);
      setSyncStatus(sync);
      if (ov.total_prs === 0) setNoData(true);
    } catch {
      setNoData(true);
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => {
    setUser(getUser());
    loadData();
  }, [loadData]);

  if (!org) return <div className="p-8 text-slate-500">Select an organization to get started.</div>;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title={`${org} — Overview`}
        org={org}
        user={user}
        syncStatus={syncStatus}
        onSyncComplete={loadData}
      />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {noData && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-800">
            No data yet. Click <strong>Sync Now</strong> to fetch PR data from GitHub.
          </div>
        )}

        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total PRs" value={overview.total_prs.toLocaleString()} icon={GitPullRequest} />
            <StatCard label="Merged PRs" value={overview.merged_prs.toLocaleString()} sub={`${overview.merge_rate}% merge rate`} icon={GitMerge} />
            <StatCard label="Open PRs" value={overview.open_prs.toLocaleString()} icon={Layers} />
            <StatCard label="Contributors" value={overview.unique_contributors} icon={Users} />
            <StatCard label="Avg Merge Time" value={formatHours(overview.avg_merge_time_hours)} sub="from open to merge" icon={Clock} />
            <StatCard label="Avg Review Time" value={formatHours(overview.avg_review_time_hours)} sub="to first review" icon={Star} />
            <StatCard label="Total Reviews" value={overview.total_reviews.toLocaleString()} icon={BarChart3} />
            <StatCard label="Repositories" value={overview.total_repos} icon={GitPullRequest} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PRTrendChart data={trends} />
          <ReviewTimeChart data={devStats} />
        </div>

        <ContributorLeaderboard data={devStats} limit={10} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
