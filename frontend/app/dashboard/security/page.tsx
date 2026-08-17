"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import {
  getUserSettings,
  runVulnerabilityScan,
  listVulnerabilityScans,
  getVulnerabilityScan,
  getRepoStats,
  getDocumentationRepos,
  getSyncStatus,
  deleteVulnerabilityScan,
  getRepoBranches,
} from "@/lib/api";
import { getUser } from "@/lib/auth";
import type {
  User,
  UserSettings,
  SyncStatus,
  VulnerabilityScan,
  VulnerabilityScanSummary,
  VulnerabilityFinding,
  DependencyReportItem,
  RepoBranch,
} from "@/types";
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Key,
  Play,
  RefreshCw,
  Clock,
  Download,
  FileText,
  Filter,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Wrench,
  Package,
  Trash2,
  Sparkles,
  Zap,
  GitBranch,
} from "lucide-react";
import { toast } from "sonner";

function SecurityContent() {
  const params = useSearchParams();
  const org = params.get("org") ?? "";
  const provider = (params.get("provider") ?? "github") as "github" | "gitlab";

  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  // Repositories & Branches
  const [repos, setRepos] = useState<string[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [branches, setBranches] = useState<RepoBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("main");
  const [loadingBranches, setLoadingBranches] = useState<boolean>(false);

  // Scan state
  const [currentScan, setCurrentScan] = useState<VulnerabilityScan | null>(null);
  const [scansHistory, setScansHistory] = useState<VulnerabilityScanSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanningStep, setScanningStep] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [expandedFindings, setExpandedFindings] = useState<Record<number, boolean>>({});

  // Inline key modal / prompt state if key is missing
  const [inlineKey, setInlineKey] = useState("");
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);

  const reqRef = useRef(0);

  // Load initial data
  const loadInitial = useCallback(async () => {
    if (!org) return;
    const req = ++reqRef.current;
    setLoading(true);

    try {
      const [userSettings, repoStats, docRepos, sync, scans] = await Promise.all([
        getUserSettings().catch(() => null),
        getRepoStats(org).catch(() => []),
        getDocumentationRepos(org, provider).catch(() => []),
        getSyncStatus(org, provider).catch(() => null),
        listVulnerabilityScans(org).catch(() => []),
      ]);

      if (req !== reqRef.current) return;

      setSettings(userSettings);
      setSyncStatus(sync);
      setScansHistory(scans);

      // Aggregate repo names
      const repoSet = new Set<string>();
      for (const r of repoStats) if (r.name) repoSet.add(r.name);
      for (const dr of docRepos) if (dr.name) repoSet.add(dr.name);
      const repoList = Array.from(repoSet).sort();
      setRepos(repoList);

      if (repoList.length > 0 && !selectedRepo) {
        setSelectedRepo(repoList[0]);
      }

      // If scans exist, load latest scan details
      if (scans.length > 0) {
        const latest = await getVulnerabilityScan(scans[0].id).catch(() => null);
        if (latest) {
          setCurrentScan(latest);
          setSelectedRepo(latest.repo_name);
          if (latest.branch) {
            setSelectedBranch(latest.branch);
          }
        }
      }
    } catch {
      toast.error("Failed to load security dashboard data.");
    } finally {
      if (req === reqRef.current) setLoading(false);
    }
  }, [org, provider, selectedRepo]);

  useEffect(() => {
    setUser(getUser());
    loadInitial();
  }, [loadInitial]);

  // Fetch branches whenever selected repository changes
  useEffect(() => {
    if (!org || !selectedRepo) return;
    let active = true;
    setLoadingBranches(true);

    getRepoBranches(org, selectedRepo, provider)
      .then((res) => {
        if (!active) return;
        const branchList = res.branches || [];
        setBranches(branchList);
        const branchNames = branchList.map((b) => b.name);

        if (res.default_branch && (!selectedBranch || !branchNames.includes(selectedBranch))) {
          setSelectedBranch(res.default_branch);
        } else if (!selectedBranch && branchNames.length > 0) {
          setSelectedBranch(branchNames[0]);
        }
      })
      .catch(() => {
        if (!active) return;
        setBranches([{ name: "main" }]);
        if (!selectedBranch) setSelectedBranch("main");
      })
      .finally(() => {
        if (active) setLoadingBranches(false);
      });

    return () => {
      active = false;
    };
  }, [org, selectedRepo, provider]);

  const handleSelectScan = async (scanId: number) => {
    setLoading(true);
    try {
      const scan = await getVulnerabilityScan(scanId);
      setCurrentScan(scan);
      setSelectedRepo(scan.repo_name);
      if (scan.branch) setSelectedBranch(scan.branch);
      setExpandedFindings({});
    } catch {
      toast.error("Failed to load scan details.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteScan = async (scanId: number) => {
    if (!confirm("Are you sure you want to delete this scan record?")) return;
    try {
      await deleteVulnerabilityScan(scanId);
      setScansHistory((prev) => prev.filter((s) => s.id !== scanId));
      if (currentScan?.id === scanId) {
        const remaining = scansHistory.filter((s) => s.id !== scanId);
        if (remaining.length > 0) {
          const next = await getVulnerabilityScan(remaining[0].id);
          setCurrentScan(next);
        } else {
          setCurrentScan(null);
        }
      }
      toast.success("Scan report deleted.");
    } catch {
      toast.error("Failed to delete scan.");
    }
  };

  const handleTriggerScan = async () => {
    if (!selectedRepo) {
      toast.warning("Please select a repository to audit.");
      return;
    }

    const keyToUse = settings?.has_openai_key ? undefined : inlineKey.trim();
    if (!settings?.has_openai_key && !keyToUse) {
      setShowKeyPrompt(true);
      return;
    }

    setScanning(true);
    setScanningStep(`Step 1/5: Auditing dependencies & manifests on branch '${selectedBranch || "main"}'...`);

    const stepInterval = setInterval(() => {
      setScanningStep((prev) => {
        if (prev.includes("Step 1")) return "Step 2/5: Reviewing configurations, secrets & headers...";
        if (prev.includes("Step 2")) return "Step 3/5: Analyzing code patterns for injection & vulnerabilities...";
        if (prev.includes("Step 3")) return "Step 4/5: Evaluating container & infrastructure posture...";
        if (prev.includes("Step 4")) return "Step 5/5: Calculating security score & remediation roadmap...";
        return prev;
      });
    }, 2500);

    try {
      const newScan = await runVulnerabilityScan({
        org,
        repo_name: selectedRepo,
        branch: selectedBranch || "main",
        provider,
        openai_api_key: keyToUse,
      });

      clearInterval(stepInterval);
      setCurrentScan(newScan);
      setScansHistory((prev) => [
        {
          id: newScan.id,
          org: newScan.org,
          repo_name: newScan.repo_name,
          repo_full_name: newScan.repo_full_name,
          branch: newScan.branch || selectedBranch,
          provider: newScan.provider,
          security_score: newScan.security_score,
          grade: newScan.grade,
          critical_count: newScan.critical_count,
          high_count: newScan.high_count,
          medium_count: newScan.medium_count,
          low_count: newScan.low_count,
          status: newScan.status,
          created_at: newScan.created_at,
        },
        ...prev.filter((s) => s.id !== newScan.id),
      ]);
      setShowKeyPrompt(false);
      setExpandedFindings({});
      toast.success(
        `Vulnerability scan completed for ${selectedRepo} (${newScan.branch || selectedBranch})! Score: ${newScan.security_score}/100`
      );
    } catch (err: any) {
      clearInterval(stepInterval);
      const detail = err?.response?.data?.detail || err.message;
      toast.error(`Scan failed: ${detail}`);
    } finally {
      setScanning(false);
      setScanningStep("");
    }
  };

  const toggleFinding = (index: number) => {
    setExpandedFindings((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  // Filtered findings
  const filteredFindings = useMemo(() => {
    if (!currentScan?.findings) return [];
    if (severityFilter === "ALL") return currentScan.findings;
    return currentScan.findings.filter((f) => f.severity.toUpperCase() === severityFilter);
  }, [currentScan, severityFilter]);

  // Export report as Markdown
  const exportMarkdown = () => {
    if (!currentScan) return;
    const s = currentScan;
    let md = `# Vulnerability Assessment Report\n\n`;
    md += `**Repository:** ${s.repo_full_name}\n`;
    md += `**Target Branch:** ${s.branch || "main"}\n`;
    md += `**Security Score:** ${s.security_score}/100 (Grade ${s.grade})\n`;
    md += `**Date:** ${new Date(s.created_at).toUTCString()}\n`;
    md += `**Model:** ${s.model_used || "OpenAI"}\n\n`;
    md += `## Executive Summary\n${s.executive_summary || "N/A"}\n\n`;
    md += `## Vulnerability Metrics\n`;
    md += `- **Critical:** ${s.critical_count}\n- **High:** ${s.high_count}\n- **Medium:** ${s.medium_count}\n- **Low:** ${s.low_count}\n\n`;

    md += `## Detailed Findings\n\n`;
    s.findings.forEach((f, i) => {
      md += `### ${i + 1}. [${f.severity.toUpperCase()}] ${f.title}\n`;
      md += `- **Affected Component:** \`${f.component}\`\n`;
      md += `- **CVSS Score:** ${f.cvss}\n`;
      md += `- **Quick Win:** ${f.quick_win ? "Yes" : "No"}\n\n`;
      md += `**Description:**\n${f.description}\n\n`;
      md += `**Remediation:**\n${f.remediation}\n\n`;
      md += `---\n\n`;
    });

    if (s.dependency_report?.length) {
      md += `## Dependency Audit\n\n`;
      md += `| Package | Version | Status | Known Issues | Recommendation |\n`;
      md += `|---|---|---|---|---|\n`;
      s.dependency_report.forEach((d) => {
        md += `| ${d.package} | ${d.version} | ${d.status} | ${d.known_issues || "None"} | ${d.recommendation || "Up to date"} |\n`;
      });
      md += `\n`;
    }

    if (s.remediation_roadmap) {
      md += `## Remediation Roadmap\n\n`;
      md += `### Quick Wins\n`;
      s.remediation_roadmap.quick_wins.forEach((q) => (md += `- ${q}\n`));
      md += `\n### Long-Term Hardening\n`;
      s.remediation_roadmap.long_term.forEach((l) => (md += `- ${l}\n`));
      md += `\n`;
    }

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${s.repo_name}-${s.branch || "main"}-vulnerability-report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    if (!currentScan) return;
    const blob = new Blob([JSON.stringify(currentScan, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentScan.repo_name}-${currentScan.branch || "main"}-vulnerability-report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <Header
        title="Security & Vulnerability Assessment"
        org={org}
        provider={provider}
        user={user}
        syncStatus={syncStatus}
        onSyncComplete={loadInitial}
      />

      <div className="flex-1 p-6 md:p-8 overflow-auto space-y-6 max-w-7xl mx-auto w-full">
        {/* OpenAI Key Missing Notice Banner */}
        {!settings?.has_openai_key && (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  OpenAI API Key Required for AI Security Scans
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Add your OpenAI API key in settings to unlock automated dependency audits, code pattern scans, and vulnerability scoring.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all shrink-0"
            >
              <span>Configure Key in Settings</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Scan Control Header Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Automated AppSec Engine</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Repository Vulnerability Assessment
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Assess dependency security, review configurations, detect vulnerable code patterns, and receive an actionable remediation roadmap.
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Repository Selector */}
              {repos.length > 0 ? (
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
                  <select
                    value={selectedRepo}
                    onChange={(e) => setSelectedRepo(e.target.value)}
                    disabled={scanning}
                    className="bg-transparent text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    {repos.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-xs text-slate-400">No synced repositories</span>
              )}

              {/* Branch Selector */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
                <GitBranch className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                {loadingBranches ? (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : branches.length > 0 ? (
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    disabled={scanning}
                    className="bg-transparent text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none cursor-pointer"
                    title="Select branch to scan"
                  >
                    {branches.map((b) => (
                      <option key={b.name} value={b.name}>
                        {b.name} {b.protected ? "🛡️" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    placeholder="branch"
                    disabled={scanning}
                    className="bg-transparent text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none w-24"
                  />
                )}
              </div>

              <button
                onClick={handleTriggerScan}
                disabled={scanning || !selectedRepo}
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm shadow-indigo-600/20 disabled:opacity-50"
              >
                {scanning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Auditing...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Vulnerability Scan</span>
                  </>
                )}
              </button>

              {currentScan && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={exportMarkdown}
                    title="Export Markdown Report"
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={exportJSON}
                    title="Export JSON Data"
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Active Scan Progress Status */}
          {scanning && (
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  {scanningStep || "Analyzing repository posture..."}
                </span>
                <span className="text-[11px] text-slate-400">GPT-powered audit in progress</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full w-full animate-pulse" />
              </div>
            </div>
          )}
        </div>

        {/* Inline API Key Modal if Prompted */}
        {showKeyPrompt && (
          <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-600" />
                Enter OpenAI API Key to Run Scan
              </h3>
              <button
                onClick={() => setShowKeyPrompt(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You can enter a key for this one-time scan or save it permanently in Settings.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={inlineKey}
                onChange={(e) => setInlineKey(e.target.value)}
                placeholder="sk-..."
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleTriggerScan}
                disabled={!inlineKey.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50"
              >
                Run Scan
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : !currentScan ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <Shield className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                No Vulnerability Scans Yet for {selectedRepo || "this repository"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Select a repository and branch above and click <strong>Run Vulnerability Scan</strong> to generate a complete security audit, dependency analysis, and score.
              </p>
            </div>
            <button
              onClick={handleTriggerScan}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm shadow-indigo-600/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start First Security Scan</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. Score & Tally Banner */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Score Card */}
              <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Security Health Score
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      <GitBranch className="w-3 h-3" />
                      {currentScan.branch || "main"}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {currentScan.model_used || "OpenAI"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-5 my-2">
                  <div
                    className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center font-extrabold text-2xl shadow-sm ${
                      currentScan.security_score >= 85
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                        : currentScan.security_score >= 70
                        ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                        : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                    }`}
                  >
                    <span>{currentScan.security_score}</span>
                    <span className="text-[10px] font-semibold text-slate-400">/ 100</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                        Grade {currentScan.grade}
                      </span>
                    </div>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        currentScan.security_score >= 85
                          ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200"
                          : currentScan.security_score >= 70
                          ? "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200"
                          : "bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200"
                      }`}
                    >
                      {currentScan.security_score >= 85
                        ? "Strong Posture"
                        : currentScan.security_score >= 70
                        ? "Moderate Risk"
                        : "Action Required"}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Audited on {new Date(currentScan.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Vulnerabilities Tally Cards */}
              <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {/* Critical */}
                <div
                  onClick={() => setSeverityFilter(severityFilter === "CRITICAL" ? "ALL" : "CRITICAL")}
                  className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-xs cursor-pointer transition-all ${
                    severityFilter === "CRITICAL"
                      ? "border-rose-500 ring-2 ring-rose-500/20"
                      : "border-slate-200 dark:border-slate-800 hover:border-rose-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      Critical
                    </span>
                    <AlertOctagon className="w-4 h-4 text-rose-500" />
                  </div>
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-2 block">
                    {currentScan.critical_count}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1 block">Immediate Fix</span>
                </div>

                {/* High */}
                <div
                  onClick={() => setSeverityFilter(severityFilter === "HIGH" ? "ALL" : "HIGH")}
                  className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-xs cursor-pointer transition-all ${
                    severityFilter === "HIGH"
                      ? "border-orange-500 ring-2 ring-orange-500/20"
                      : "border-slate-200 dark:border-slate-800 hover:border-orange-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                      High
                    </span>
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                  </div>
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-2 block">
                    {currentScan.high_count}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1 block">Sprint Priority</span>
                </div>

                {/* Medium */}
                <div
                  onClick={() => setSeverityFilter(severityFilter === "MEDIUM" ? "ALL" : "MEDIUM")}
                  className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-xs cursor-pointer transition-all ${
                    severityFilter === "MEDIUM"
                      ? "border-amber-500 ring-2 ring-amber-500/20"
                      : "border-slate-200 dark:border-slate-800 hover:border-amber-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Medium
                    </span>
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-2 block">
                    {currentScan.medium_count}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1 block">Scheduled Review</span>
                </div>

                {/* Low */}
                <div
                  onClick={() => setSeverityFilter(severityFilter === "LOW" ? "ALL" : "LOW")}
                  className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-xs cursor-pointer transition-all ${
                    severityFilter === "LOW"
                      ? "border-blue-500 ring-2 ring-blue-500/20"
                      : "border-slate-200 dark:border-slate-800 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Low / Info
                    </span>
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-2 block">
                    {currentScan.low_count}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1 block">Best Practices</span>
                </div>
              </div>
            </div>

            {/* 2. Executive Summary Box */}
            {currentScan.executive_summary && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Executive Security Assessment Summary
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {currentScan.executive_summary}
                </p>
              </div>
            )}

            {/* 3. Findings Breakdown */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Vulnerability Findings ({filteredFindings.length})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Code pattern analysis, secrets exposure, configuration weaknesses, and infrastructure risks on branch <strong>{currentScan.branch || "main"}</strong>.
                  </p>
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
                  {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setSeverityFilter(lvl)}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        severityFilter === lvl
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {filteredFindings.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No findings matching the selected filter ({severityFilter}).
                </div>
              ) : (
                <div className="space-y-3.5">
                  {filteredFindings.map((f, idx) => {
                    const isExpanded = expandedFindings[idx] ?? true;
                    return (
                      <div
                        key={idx}
                        className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-800/30 space-y-3 transition-all"
                      >
                        <div
                          className="flex items-start justify-between gap-3 cursor-pointer select-none"
                          onClick={() => toggleFinding(idx)}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase shrink-0 mt-0.5 ${
                                f.severity.toUpperCase() === "CRITICAL"
                                  ? "bg-rose-500/10 text-rose-600 border border-rose-500/30 dark:bg-rose-950/60 dark:text-rose-400"
                                  : f.severity.toUpperCase() === "HIGH"
                                  ? "bg-orange-500/10 text-orange-600 border border-orange-500/30 dark:bg-orange-950/60 dark:text-orange-400"
                                  : f.severity.toUpperCase() === "MEDIUM"
                                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/30 dark:bg-amber-950/60 dark:text-amber-400"
                                  : "bg-blue-500/10 text-blue-600 border border-blue-500/30 dark:bg-blue-950/60 dark:text-blue-400"
                              }`}
                            >
                              {f.severity}
                            </span>
                            <div className="space-y-1">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {f.title}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <span>Component: <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[11px]">{f.component}</code></span>
                                {f.cvss > 0 && <span>· CVSS: <strong>{f.cvss}</strong></span>}
                                {f.quick_win && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    <Zap className="w-3 h-3" /> Quick Win
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button className="text-slate-400 hover:text-slate-600 p-1">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-3 text-xs text-slate-700 dark:text-slate-300">
                            <div>
                              <strong className="text-slate-900 dark:text-slate-100 block mb-1">
                                Risk Description:
                              </strong>
                              <p className="leading-relaxed whitespace-pre-line">{f.description}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-3.5 space-y-1.5">
                              <strong className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                <Wrench className="w-3.5 h-3.5" /> Actionable Remediation:
                              </strong>
                              <p className="leading-relaxed whitespace-pre-line font-mono text-[11px] text-slate-800 dark:text-slate-200">
                                {f.remediation}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Dependency Security Audit Table */}
            {currentScan.dependency_report && currentScan.dependency_report.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Package className="w-4 h-4 text-indigo-600" />
                    Dependency &amp; Manifest Audit
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Known CVEs, outdated lockfile components, and unmaintained package trust signals.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-3">Package</th>
                        <th className="p-3">Current Version</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Known Issues / CVEs</th>
                        <th className="p-3">Recommendation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {currentScan.dependency_report.map((dep, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-3 font-bold font-mono text-slate-900 dark:text-slate-100">
                            {dep.package}
                          </td>
                          <td className="p-3 font-mono text-slate-500">{dep.version}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                                dep.status.toLowerCase() === "vulnerable"
                                  ? "bg-rose-500/10 text-rose-600"
                                  : dep.status.toLowerCase() === "outdated"
                                  ? "bg-amber-500/10 text-amber-600"
                                  : dep.status.toLowerCase() === "unmaintained"
                                  ? "bg-orange-500/10 text-orange-600"
                                  : "bg-emerald-500/10 text-emerald-600"
                              }`}
                            >
                              {dep.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">
                            {dep.known_issues || "None known"}
                          </td>
                          <td className="p-3 text-slate-900 dark:text-slate-200 font-medium">
                            {dep.recommendation || "Up to date"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. Remediation Roadmap */}
            {currentScan.remediation_roadmap && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-indigo-600" />
                    Actionable Remediation Roadmap
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Step-by-step mitigation actions organized by immediate fixes and architectural hardening.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                  {currentScan.remediation_roadmap.quick_wins?.length > 0 && (
                    <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-3">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" /> Quick Wins (Fix in &lt; 1 Hour)
                      </span>
                      <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                        {currentScan.remediation_roadmap.quick_wins.map((qw, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                            <span className="leading-relaxed">{qw}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {currentScan.remediation_roadmap.long_term?.length > 0 && (
                    <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 space-y-3">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" /> Long-Term Security Hardening
                      </span>
                      <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                        {currentScan.remediation_roadmap.long_term.map((lt, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                            <span className="leading-relaxed">{lt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. Past Scan History Table */}
            {scansHistory.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Scan History for {org}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-3">Repository</th>
                        <th className="p-3">Branch</th>
                        <th className="p-3">Score &amp; Grade</th>
                        <th className="p-3">Critical / High</th>
                        <th className="p-3">Date</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {scansHistory.map((s) => (
                        <tr
                          key={s.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer ${
                            currentScan.id === s.id ? "bg-indigo-50/40 dark:bg-indigo-950/30" : ""
                          }`}
                          onClick={() => handleSelectScan(s.id)}
                        >
                          <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                            {s.repo_name}
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              <GitBranch className="w-3 h-3 text-indigo-500" />
                              {s.branch || "main"}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                s.security_score >= 80
                                  ? "bg-emerald-100 text-emerald-800"
                                  : s.security_score >= 60
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {s.security_score}/100 (Grade {s.grade})
                            </span>
                          </td>
                          <td className="p-3 text-slate-500">
                            {s.critical_count} Crit · {s.high_count} High
                          </td>
                          <td className="p-3 text-slate-500">
                            {new Date(s.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDeleteScan(s.id)}
                              className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Delete Scan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <SecurityContent />
    </Suspense>
  );
}
