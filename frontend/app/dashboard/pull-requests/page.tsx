"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { getPRList, getRepoStats, getSyncStatus } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { relativeTime, stateColor, getApiError } from "@/lib/utils";
import type { PullRequest, RepoStat, SyncStatus, User } from "@/types";
import {
  GitPullRequest,
  GitBranch,
  FileCode,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  ArrowUpDown,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Copy,
  Check,
  AlertTriangle,
  User as UserIcon,
  MessageSquare,
  FileText,
  GitMerge,
  ArrowRight
} from "lucide-react";

const PAGE_SIZE = 30;

function PullRequestsContent() {
  const params = useSearchParams();
  const org = params.get("org") ?? "";
  const provider = (params.get("provider") ?? "github") as "github" | "gitlab";

  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [repos, setRepos] = useState<RepoStat[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Filters & State
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>("ALL"); // ALL, FAILED, PASSED
  const [selectedBaseBranch, setSelectedBaseBranch] = useState<string>(""); // To Branch: prod, staging, qa, dev
  const [selectedHeadBranch, setSelectedHeadBranch] = useState<string>(""); // From Branch: staging, qa, dev, feature
  const [sortBy, setSortBy] = useState<string>("newest"); // newest, env_priority, to_branch, from_branch, action_failed_first, action_passed_first
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [authorQuery, setAuthorQuery] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals & Active Selections
  const [activeActionFilePr, setActiveActionFilePr] = useState<PullRequest | null>(null);
  const [expandedPrId, setExpandedPrId] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const reqRef = useRef(0);

  const loadData = useCallback(async () => {
    if (!org) return;
    const req = ++reqRef.current;
    setLoading(true);
    setError(null);

    // Map filters for API
    let apiState: string | undefined = selectedState || undefined;
    let apiActionStatus: string | undefined = undefined;
    let apiSortBy: string | undefined = undefined;

    if (selectedActionFilter === "FAILED") {
      apiActionStatus = "failure";
      if (!apiState) apiState = "CLOSED";
    } else if (selectedActionFilter === "PASSED") {
      apiActionStatus = "success";
      if (!apiState) apiState = "CLOSED";
    }

    if (sortBy === "action_failed_first") {
      apiSortBy = "action_failed_first";
    } else if (sortBy === "action_passed_first") {
      apiSortBy = "action_passed_first";
    } else if (sortBy === "env_priority") {
      apiSortBy = "env_priority";
    } else if (sortBy === "to_branch") {
      apiSortBy = "to_branch";
    } else if (sortBy === "from_branch") {
      apiSortBy = "from_branch";
    }

    try {
      const [{ data, total: t }, repoData, sync] = await Promise.all([
        getPRList(org, {
          repo: selectedRepo || undefined,
          author: authorQuery || undefined,
          state: apiState,
          action_status: apiActionStatus,
          base_branch: selectedBaseBranch || undefined,
          head_branch: selectedHeadBranch || undefined,
          sort_by: apiSortBy,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        }),
        getRepoStats(org),
        getSyncStatus(org, provider),
      ]);

      if (req !== reqRef.current) return;
      setPrs(data);
      setTotal(t);
      setRepos(repoData);
      setSyncStatus(sync);
    } catch (e: unknown) {
      if (req !== reqRef.current) return;
      setError(getApiError(e, "Failed to fetch pull requests list."));
    } finally {
      if (req === reqRef.current) setLoading(false);
    }
  }, [
    org,
    provider,
    selectedRepo,
    selectedState,
    selectedActionFilter,
    selectedBaseBranch,
    selectedHeadBranch,
    sortBy,
    authorQuery,
    page,
  ]);

  useEffect(() => {
    setUser(getUser());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Copy Action File YAML
  const handleCopyCode = (code?: string | null) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Filter client-side search query
  const filteredPrs = prs.filter((pr) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      pr.title.toLowerCase().includes(q) ||
      (pr.body && pr.body.toLowerCase().includes(q)) ||
      pr.number.toString().includes(q) ||
      pr.author.toLowerCase().includes(q) ||
      pr.repo.toLowerCase().includes(q) ||
      (pr.head_branch && pr.head_branch.toLowerCase().includes(q)) ||
      (pr.base_branch && pr.base_branch.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Helper for branch badge styles
  const getBranchBadgeStyle = (branchName?: string | null) => {
    if (!branchName) return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    const b = branchName.toLowerCase();
    if (b.includes("prod") || b === "main" || b === "master") {
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold";
    }
    if (b.includes("staging")) {
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold";
    }
    if (b.includes("qa")) {
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 font-bold";
    }
    if (b.includes("dev")) {
      return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 font-bold";
    }
    return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100">
      <Header
        title="Pull Requests"
        org={org}
        provider={provider}
        user={user}
        syncStatus={syncStatus}
        onSyncComplete={loadData}
      />

      <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Page Title & Context Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900/90 via-slate-900 to-slate-900 text-white p-6 rounded-2xl border border-indigo-800/40 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
                <GitPullRequest className="w-6 h-6 text-indigo-400" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Repository Pull Requests</h1>
            </div>
            <p className="text-xs text-slate-300">
              Browse repository-level PRs, inspect messages & descriptions, view action workflows ran, and filter/sort by target & source branches (<strong className="text-rose-300">prod</strong>, <strong className="text-amber-300">staging</strong>, <strong className="text-purple-300">qa</strong>, <strong className="text-sky-300">dev</strong>).
            </p>
          </div>
          {org && (
            <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur border border-slate-700/60 px-3.5 py-1.5 rounded-xl text-xs">
              <span className="text-slate-400">Organization:</span>
              <span className="font-bold text-indigo-300">{org}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {/* Repo Filter (Repo Level PRs) */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-indigo-500" />
                Repository
              </label>
              <select
                value={selectedRepo}
                onChange={(e) => {
                  setSelectedRepo(e.target.value);
                  setPage(0);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Repositories ({repos.length})</option>
                {repos.map((r) => (
                  <option key={r.repo} value={r.repo}>
                    {r.name} ({r.total_prs} PRs)
                  </option>
                ))}
              </select>
            </div>

            {/* Target Branch Filter (To Branch: prod, staging, qa, dev) */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <GitMerge className="w-3.5 h-3.5 text-rose-500" />
                To Branch (Target)
              </label>
              <select
                value={selectedBaseBranch}
                onChange={(e) => {
                  setSelectedBaseBranch(e.target.value);
                  setPage(0);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Target Branches</option>
                <option value="prod">🎯 prod / main</option>
                <option value="staging">⚡ staging</option>
                <option value="qa">🧪 qa</option>
                <option value="dev">💻 dev</option>
              </select>
            </div>

            {/* Source Branch Filter (From Branch) */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-sky-500" />
                From Branch (Source)
              </label>
              <select
                value={selectedHeadBranch}
                onChange={(e) => {
                  setSelectedHeadBranch(e.target.value);
                  setPage(0);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Source Branches</option>
                <option value="staging">⚡ staging</option>
                <option value="qa">🧪 qa</option>
                <option value="dev">💻 dev</option>
                <option value="feature">✨ feature/*</option>
                <option value="bugfix">🐛 bugfix/*</option>
              </select>
            </div>

            {/* State Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-500" />
                PR State
              </label>
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setPage(0);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All States</option>
                <option value="OPEN">Open PRs</option>
                <option value="CLOSED">Closed PRs</option>
                <option value="MERGED">Merged PRs</option>
              </select>
            </div>

            {/* Closed PR Action Status Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Closed Action Filter
              </label>
              <select
                value={selectedActionFilter}
                onChange={(e) => {
                  setSelectedActionFilter(e.target.value);
                  setPage(0);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Action Results</option>
                <option value="FAILED">❌ Action Failed (Closed)</option>
                <option value="PASSED">✅ Action Passed (Closed)</option>
              </select>
            </div>

            {/* Sort Order including From / To Branch Sorting */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500" />
                Sort Order
              </label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(0);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="newest">Latest Created</option>
                <option value="env_priority">Environment Priority (prod ➔ staging ➔ qa ➔ dev)</option>
                <option value="to_branch">To Branch (Target A-Z)</option>
                <option value="from_branch">From Branch (Source A-Z)</option>
                <option value="action_failed_first">Action Failed First ⚠️</option>
                <option value="action_passed_first">Action Passed First ✅</option>
              </select>
            </div>

            {/* Quick Text Search */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-indigo-500" />
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search title, branch..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-800 dark:text-slate-200">{filteredPrs.length}</strong> of{" "}
              <strong className="text-slate-800 dark:text-slate-200">{total}</strong> pull requests
            </span>
            {(selectedRepo ||
              selectedState ||
              selectedActionFilter !== "ALL" ||
              selectedBaseBranch ||
              selectedHeadBranch ||
              sortBy !== "newest" ||
              searchQuery) && (
              <button
                onClick={() => {
                  setSelectedRepo("");
                  setSelectedState("");
                  setSelectedActionFilter("ALL");
                  setSelectedBaseBranch("");
                  setSelectedHeadBranch("");
                  setSortBy("newest");
                  setSearchQuery("");
                  setAuthorQuery("");
                  setPage(0);
                }}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold text-[11px]"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            <p className="text-xs font-semibold text-slate-500">Loading Pull Requests & Workflow Actions...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredPrs.length === 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <GitPullRequest className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Pull Requests Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No pull requests matched your selected branch or status filter criteria. Try resetting filters or choosing a different branch combination.
            </p>
          </div>
        )}

        {/* PR List / Cards View */}
        {!loading && !error && filteredPrs.length > 0 && (
          <div className="space-y-4">
            {filteredPrs.map((pr) => {
              const repoNameOnly = pr.repo.split("/")[1] || pr.repo;
              const isActionFailed = pr.action_status === "failure" || pr.action_status === "failed";
              const isActionPassed = pr.action_status === "success" || pr.action_status === "passed";
              const isExpanded = expandedPrId === pr.id;

              const headBranchName = pr.head_branch || `feature/pr-${pr.number}`;
              const baseBranchName = pr.base_branch || "main";

              return (
                <div
                  key={pr.id}
                  className={`bg-white dark:bg-slate-900 border transition-all rounded-2xl p-5 shadow-sm space-y-4 ${
                    isActionFailed
                      ? "border-rose-200 dark:border-rose-900/40 hover:border-rose-300 dark:hover:border-rose-800"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  {/* Top Metadata Line */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Repo Badge */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50">
                        <GitBranch className="w-3 h-3" />
                        {repoNameOnly}
                      </span>

                      {/* PR State Pill */}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${stateColor(pr.state)}`}>
                        {pr.state}
                      </span>

                      {/* Action Status Pill */}
                      {isActionFailed && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          Action Failed
                        </span>
                      )}
                      {isActionPassed && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          Action Passed
                        </span>
                      )}
                      {!isActionFailed && !isActionPassed && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                          <Clock className="w-3.5 h-3.5 text-sky-500" />
                          Action {pr.action_status || "Pending"}
                        </span>
                      )}

                      {/* PR Number */}
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500">#{pr.number}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>Opened {relativeTime(pr.created_at)}</span>
                    </div>
                  </div>

                  {/* PR Title & Message */}
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug flex items-start justify-between gap-2">
                      <span>{pr.title}</span>
                    </h3>

                    {/* From & To Branch Flow Pills */}
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="text-slate-400 font-medium">From (Source):</span>
                      <span className={`font-mono px-2 py-0.5 rounded border text-[11px] ${getBranchBadgeStyle(headBranchName)}`}>
                        {headBranchName}
                      </span>

                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />

                      <span className="text-slate-400 font-medium">To (Target):</span>
                      <span className={`font-mono px-2 py-0.5 rounded border text-[11px] ${getBranchBadgeStyle(baseBranchName)}`}>
                        {baseBranchName}
                      </span>
                    </div>
                  </div>

                  {/* PR Description Preview / Collapsible */}
                  {pr.body && (
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/60 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-500" />
                          PR Message & Description
                        </span>
                        <button
                          onClick={() => setExpandedPrId(isExpanded ? null : pr.id)}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline text-[11px] flex items-center gap-1"
                        >
                          {isExpanded ? (
                            <>
                              Show Less <ChevronUp className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              View Description <ChevronDown className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      </div>

                      <div
                        className={`text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed ${
                          !isExpanded ? "line-clamp-2" : ""
                        }`}
                      >
                        {pr.body}
                      </div>
                    </div>
                  )}

                  {/* Footer Bar with Action File Ran Button & Stats */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    {/* Author & Stats */}
                    <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        {pr.author_avatar ? (
                          <img src={pr.author_avatar} alt={pr.author} className="w-5 h-5 rounded-full" />
                        ) : (
                          <UserIcon className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{pr.author}</span>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-emerald-600 font-bold">+{pr.additions}</span>
                        <span className="text-rose-600 font-bold">-{pr.deletions}</span>
                        <span className="text-slate-400">({pr.changed_files} files)</span>
                      </div>

                      {pr.reviews_count > 0 && (
                        <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{pr.reviews_count} reviews</span>
                        </div>
                      )}
                    </div>

                    {/* VIEW ACTION FILE RAN BUTTON */}
                    <button
                      onClick={() => setActiveActionFilePr(pr)}
                      className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all hover:shadow-indigo-500/25"
                    >
                      <FileCode className="w-4 h-4 text-indigo-200" />
                      <span>View Action File Ran</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Previous
            </button>
            <span className="text-xs font-semibold text-slate-500">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* VIEW CORRESPONDING ACTION FILE RAN MODAL */}
      {activeActionFilePr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" onClick={() => setActiveActionFilePr(null)} />
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                  <FileCode className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    Action File Ran
                    <span className="text-xs font-mono text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800/40">
                      {activeActionFilePr.action_file || ".github/workflows/ci.yml"}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    PR #{activeActionFilePr.number}: {activeActionFilePr.title} ({activeActionFilePr.repo})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveActionFilePr(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Meta Details Bar */}
            <div className="px-6 py-3 bg-slate-800/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-slate-400">Workflow:</span>
                <span className="font-bold text-slate-200">
                  {activeActionFilePr.action_name || "CI & Test Pipeline"}
                </span>

                <span className="text-slate-600">|</span>

                <span className="text-slate-400">Status:</span>
                {activeActionFilePr.action_status === "failure" || activeActionFilePr.action_status === "failed" ? (
                  <span className="font-bold text-rose-400 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-rose-500" /> Failed
                  </span>
                ) : (
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Passed
                  </span>
                )}
              </div>

              <button
                onClick={() => handleCopyCode(activeActionFilePr.action_file_content)}
                className="py-1 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" /> Copy YAML
                  </>
                )}
              </button>
            </div>

            {/* Code Content Container */}
            <div className="p-6 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed bg-slate-950 flex-1">
              <pre className="whitespace-pre overflow-x-auto">
                <code>{activeActionFilePr.action_file_content}</code>
              </pre>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-900 flex justify-end">
              <button
                onClick={() => setActiveActionFilePr(null)}
                className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PullRequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-950">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <PullRequestsContent />
    </Suspense>
  );
}
