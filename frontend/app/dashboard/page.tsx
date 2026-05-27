"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { PRTrendChart } from "@/components/dashboard/pr-trend-chart";
import { ContributorLeaderboard } from "@/components/dashboard/contributor-leaderboard";
import { ReviewTimeChart } from "@/components/dashboard/review-time-chart";
import {
  getOrgOverview, getDeveloperStats, getMonthlyTrends, getSyncStatus, listOrgs,
} from "@/lib/api";
import { getUser } from "@/lib/auth";
import { formatHours, getApiError } from "@/lib/utils";
import type { OrgOverview, DeveloperStat, MonthlyTrend, SyncStatus, User, Org } from "@/types";
import { GitPullRequest, GitMerge, Clock, Users, Star, BarChart3, Layers, ShieldAlert, Building2 } from "lucide-react";

function GrantPermissionBanner({ onCheckAgain }: { onCheckAgain?: () => void }) {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID!;

  const handleReauthorize = () => {
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
    const scope = encodeURIComponent("read:org repo read:user user:email");
    window.location.href =
      `https://github.com/login/oauth/authorize?client_id=${clientId}` +
      `&redirect_uri=${redirectUri}&scope=${scope}&prompt=consent`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-8 text-center max-w-xl mx-auto mt-16">
      <div className="flex justify-center mb-5">
        <div className="bg-indigo-50 rounded-2xl p-4 ring-1 ring-indigo-100">
          <ShieldAlert className="h-8 w-8 text-indigo-600" />
        </div>
      </div>
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No Organization Access</h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
        CodePulse couldn't find any GitHub organizations linked to your account.
        This happens for one of two reasons:
      </p>

      <div className="text-left bg-slate-50 dark:bg-slate-800 rounded-xl p-5 mb-6 space-y-4">
        <div className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">1</span>
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Re-authorize CodePulse with org access</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Click the button below to re-authorize and grant the <code className="bg-slate-200 px-1 rounded">read:org</code> permission.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">2</span>
          <div>
            <p className="text-sm font-medium text-slate-800">Approve CodePulse in your organization settings</p>
            <p className="text-xs text-slate-500 mt-0.5">
              If your org has third-party restrictions enabled, an org owner must approve the app at{" "}
              <a
                href={`https://github.com/settings/connections/applications/${clientId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-500 underline"
              >
                GitHub → Settings → Applications
              </a>.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={handleReauthorize}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
          </svg>
          Re-authorize with Organization Access
        </button>
        {onCheckAgain && (
          <button
            onClick={onCheckAgain}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-medium transition-colors text-sm"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            My admin approved access — check again
          </button>
        )}
        <a
          href="https://github.com/organizations/new"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-medium transition-colors text-sm"
        >
          <Building2 className="h-4 w-4" />
          Create a GitHub Organization
        </a>
      </div>
    </div>
  );
}

function OrgSelector({ orgs, onSelect }: { orgs: Org[]; onSelect: (org: string) => void }) {
  return (
    <div className="max-w-2xl mx-auto mt-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Select an Organization</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Choose an organization to view analytics</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {orgs.map((org) => (
          <button
            key={org.login}
            onClick={() => onSelect(org.login)}
            className="flex items-center gap-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md p-5 text-left transition-all group"
          >
            {org.avatar_url ? (
              <Image
                src={org.avatar_url}
                alt={org.login}
                width={48}
                height={48}
                className="rounded-xl"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center ring-1 ring-indigo-100">
                <Building2 className="h-6 w-6 text-indigo-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                {org.login}
              </p>
              {org.description && (
                <p className="text-xs text-slate-400 truncate mt-0.5">{org.description}</p>
              )}
            </div>
            <svg className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

function DashboardContent() {
  const params = useSearchParams();
  const router = useRouter();
  const org = params.get("org") ?? "";

  const [overview, setOverview] = useState<OrgOverview | null>(null);
  const [devStats, setDevStats] = useState<DeveloperStat[]>([]);
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [orgsLoaded, setOrgsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reqRef = useRef(0);

  // Load analytics when org is available
  const loadData = useCallback(async () => {
    if (!org) return;
    const req = ++reqRef.current;
    setLoading(true);
    setError(null);
    try {
      const [ov, devs, tr, sync] = await Promise.all([
        getOrgOverview(org),
        getDeveloperStats(org),
        getMonthlyTrends(org, 6),
        getSyncStatus(org),
      ]);
      if (req !== reqRef.current) return;
      setOverview(ov);
      setDevStats(devs);
      setTrends(tr);
      setSyncStatus(sync);
    } catch (e: unknown) {
      if (req !== reqRef.current) return;
      setError(getApiError(e, "Failed to load overview."));
    } finally {
      if (req === reqRef.current) setLoading(false);
    }
  }, [org]);

  // Load orgs list when no org selected
  const loadOrgs = useCallback(async () => {
    if (orgsLoaded) return;
    setOrgsLoading(true);
    try {
      const data = await listOrgs();
      setOrgs(data);
    } catch {
      setOrgs([]);
    } finally {
      setOrgsLoading(false);
      setOrgsLoaded(true);
    }
  }, [orgsLoaded]);

  // Manual refresh — bypasses the orgsLoaded guard so the user can check
  // after an org admin has approved access without needing a full page reload
  const refreshOrgs = useCallback(async () => {
    setOrgsLoading(true);
    try {
      const data = await listOrgs();
      setOrgs(data);
      if (data.length > 0) router.replace(`/dashboard?org=${data[0].login}`);
    } catch {
      setOrgs([]);
    } finally {
      setOrgsLoading(false);
      setOrgsLoaded(true);
    }
  }, [router]);

  useEffect(() => { setUser(getUser()); }, []);

  useEffect(() => {
    if (org) {
      loadData();
    } else {
      loadOrgs();
    }
  }, [org, loadData, loadOrgs]);

  const handleSelectOrg = (selected: string) => {
    router.replace(`/dashboard?org=${selected}`);
  };

  // --- No org state ---
  if (!org) {
    if (orgsLoading) {
      return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
          <Header title="Overview" org="" user={user} syncStatus={null} />
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
        <Header title="Overview" org="" user={user} syncStatus={null} />
        <div className="flex-1 p-6">
          {orgsLoaded && orgs.length === 0 && <GrantPermissionBanner onCheckAgain={refreshOrgs} />}
          {orgsLoaded && orgs.length > 0 && (
            <OrgSelector orgs={orgs} onSelect={handleSelectOrg} />
          )}
        </div>
      </div>
    );
  }

  // --- Org selected ---
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <Header
        title={`${org} — Overview`}
        org={org}
        user={user}
        syncStatus={syncStatus}
        onSyncComplete={loadData}
      />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">{error}</div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        )}

        {!loading && !error && (!overview || overview.total_prs === 0) && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-8 text-center max-w-lg mx-auto mt-8">
            <div className="flex justify-center mb-4">
              <div className="bg-indigo-50 rounded-2xl p-4 ring-1 ring-indigo-100">
                <GitPullRequest className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No data yet for {org}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Click <strong className="text-slate-700">Sync Now</strong> in the header to fetch PR data from GitHub.
            </p>
          </div>
        )}

        {!loading && !error && overview && overview.total_prs > 0 && (
          <>
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Key Metrics</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total PRs" value={overview.total_prs.toLocaleString()} icon={GitPullRequest} color="indigo" />
                <StatCard label="Merged PRs" value={overview.merged_prs.toLocaleString()} sub={`${overview.merge_rate}% merge rate`} icon={GitMerge} color="emerald" />
                <StatCard label="Open PRs" value={overview.open_prs.toLocaleString()} icon={Layers} color="amber" />
                <StatCard label="Contributors" value={overview.unique_contributors} icon={Users} color="violet" />
                <StatCard label="Avg Merge Time" value={formatHours(overview.avg_merge_time_hours)} sub="from open to merge" icon={Clock} color="blue" />
                <StatCard label="Avg Review Time" value={formatHours(overview.avg_review_time_hours)} sub="to first review" icon={Star} color="cyan" />
                <StatCard label="Total Reviews" value={overview.total_reviews.toLocaleString()} icon={BarChart3} color="purple" />
                <StatCard label="Repositories" value={overview.total_repos} icon={GitPullRequest} color="rose" />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Trends &amp; Performance</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PRTrendChart data={trends} />
                <ReviewTimeChart data={devStats} />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Contributors</p>
              <ContributorLeaderboard data={devStats} limit={10} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 bg-slate-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
