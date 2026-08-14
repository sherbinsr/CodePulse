"use client";

import { useState } from "react";
import Link from "next/link";
import { getGitHubOAuthUrl } from "@/lib/auth";
import {
  GitBranch,
  BarChart3,
  Users,
  Clock,
  Zap,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  Cpu,
  FileCode2,
  Sliders,
  Check,
  X,
  Building2,
  UserCheck,
  LineChart,
} from "lucide-react";

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
  </svg>
);

const FAQS = [
  {
    q: "What is GitHub Analytics?",
    a: "GitHub Analytics is the process of analyzing GitHub development data to understand repositories, pull requests, code reviews, developer activity, team collaboration, and engineering trends.",
  },
  {
    q: "What can GitHub Analytics track?",
    a: "GitHub analytics can track repository activity, commits, pull requests, code reviews, contributors, merges, development trends, and engineering metrics.",
  },
  {
    q: "What is a GitHub analytics tool?",
    a: "A GitHub analytics tool collects and analyzes GitHub activity and presents it through dashboards, reports, metrics, and visualizations.",
  },
  {
    q: "Can GitHub Analytics analyze multiple repositories?",
    a: "Yes. A GitHub analytics platform can provide centralized insights across multiple repositories and teams.",
  },
  {
    q: "Can GitHub Analytics measure developer productivity?",
    a: "GitHub activity can provide useful signals about development workflows and collaboration. However, individual developer activity should not be treated as a simple or definitive measure of productivity.",
  },
  {
    q: "What is the difference between GitHub Analytics and GitHub Audit?",
    a: "GitHub Analytics focuses primarily on metrics, dashboards, trends, and engineering insights. GitHub Audit focuses more broadly on assessing repositories, identifying potential bottlenecks, and understanding overall engineering health.",
  },
  {
    q: "Is GitHub Analytics useful for engineering managers?",
    a: "Yes. Engineering managers can use GitHub analytics to understand team activity, PR performance, code review workflows, repository activity, and development trends.",
  },
];

const INTERNAL_LINKS = [
  { name: "GitHub Audit", href: "/github-audit" },
  { name: "GitHub PR Analytics", href: "#" },
  { name: "GitHub Code Review", href: "#" },
  { name: "GitHub Developer Analytics", href: "#" },
  { name: "GitHub Repository Analytics", href: "#" },
  { name: "GitHub Team Analytics", href: "#" },
  { name: "Engineering Analytics", href: "#" },
  { name: "Developer Productivity", href: "#" },
  { name: "Engineering Metrics", href: "#" },
];

export default function GitHubAnalyticsClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleConnectGitHub = () => {
    window.location.href = getGitHubOAuthUrl();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* ── Top Header Navigation ────────────────────────────────────────── */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="bg-indigo-600 rounded-lg p-1.5 shadow-md shadow-indigo-500/20">
              <GitBranch className="h-5 w-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">GitAudit</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs text-slate-300 hover:text-white transition-colors hidden sm:block font-medium"
            >
              Home
            </Link>
            <button
              onClick={handleConnectGitHub}
              className="inline-flex items-center gap-2 bg-white text-slate-950 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all shadow-md"
            >
              <GitHubIcon className="h-4 w-4" />
              <span>Start Analyzing GitHub →</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-16 pb-20 border-b border-slate-800/60 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full px-3.5 py-1 text-xs font-semibold">
              <Activity className="w-3.5 h-3.5" />
              <span>ENGINEERING INTELLIGENCE PLATFORM</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
              GitHub Analytics
            </h1>

            <p className="text-xl sm:text-2xl font-semibold text-indigo-300">
              Turn GitHub Data Into Actionable Engineering Insights
            </p>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
              Get a complete view of your GitHub development activity with powerful GitHub Analytics. Analyze repositories, pull requests, code reviews, developer activity, team performance, merge trends, and engineering metrics from a centralized dashboard. Understand how your engineering organization is building, reviewing, and delivering software.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <button
                onClick={handleConnectGitHub}
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-7 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/30"
              >
                <span>Start Analyzing GitHub →</span>
              </button>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all"
              >
                <span>View Live Demo</span>
              </Link>
            </div>
          </div>

          {/* Right Side Dashboard Graphic */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs text-slate-400 font-mono ml-2">github-analytics-dashboard</span>
                </div>
                <span className="text-[11px] font-bold bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20">Live Sync</span>
              </div>

              {/* Metrics Cards Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl">
                  <span className="text-[11px] text-slate-400 font-medium block">PR Cycle Time</span>
                  <span className="text-xl font-bold text-white mt-1 block">14.2 hrs</span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
                    <TrendingUp className="w-3 h-3" /> ↓ 24% faster
                  </span>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl">
                  <span className="text-[11px] text-slate-400 font-medium block">Code Review Time</span>
                  <span className="text-xl font-bold text-white mt-1 block">2.4 hrs</span>
                  <span className="text-[10px] text-indigo-400 font-semibold mt-1 block">Turnaround: Fast</span>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl">
                  <span className="text-[11px] text-slate-400 font-medium block">Total Pull Requests</span>
                  <span className="text-xl font-bold text-white mt-1 block">1,247</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">18 Open PRs</span>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl">
                  <span className="text-[11px] text-slate-400 font-medium block">Active Repos & Devs</span>
                  <span className="text-xl font-bold text-white mt-1 block">34 / 89</span>
                  <span className="text-[10px] text-emerald-400 font-semibold mt-1 block">High Engagement</span>
                </div>
              </div>

              {/* Chart Mockup */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Merge Velocity Trend</span>
                  <span className="text-slate-400">Last 30 Days</span>
                </div>
                <div className="h-24 w-full flex items-end justify-between gap-1.5 pt-4">
                  {[40, 55, 35, 70, 65, 85, 60, 90, 75, 95, 100].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-gradient-to-t from-indigo-600/40 to-indigo-500 rounded-t transition-all hover:opacity-80"
                        style={{ height: `${h}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Understand Your GitHub Engineering Activity ─────────── */}
      <section className="py-20 border-b border-slate-800/60 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 space-y-12 text-left">
          <div className="max-w-3xl space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Understand Your GitHub Engineering Activity
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              GitHub generates a huge amount of development data every day. Commits, pull requests, reviews, repositories, contributors, and merges can provide valuable insights into your engineering workflows—but analyzing this information manually can be difficult. GitHub Analytics brings this data together and transforms it into easy-to-understand engineering insights.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              "Monitor repository activity",
              "Analyze pull request performance",
              "Track code review activity",
              "Understand developer contributions",
              "Monitor team activity",
              "Identify engineering bottlenecks",
              "Track development trends",
              "Measure software engineering metrics",
            ].map((item) => (
              <div
                key={item}
                className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-xl flex items-center gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-200">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section: GitHub Analytics Dashboard ──────────────────────────── */}
      <section className="py-20 border-b border-slate-800/60 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-6 space-y-12 text-left">
          <div className="max-w-3xl space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Centralized Visibility
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              GitHub Analytics Dashboard
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Get a centralized view of your GitHub engineering activity. Your dashboard can help you monitor:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Repository Activity",
                desc: "Understand which repositories are active, growing, or experiencing declining activity.",
                icon: Layers,
              },
              {
                title: "Pull Request Performance",
                desc: "Track pull request volume, cycle time, merge trends, and open PRs.",
                icon: GitBranch,
              },
              {
                title: "Code Review Activity",
                desc: "Understand review participation, review turnaround time, and pending reviews.",
                icon: Clock,
              },
              {
                title: "Developer Activity",
                desc: "Analyze contribution and collaboration patterns across your engineering organization.",
                icon: Users,
              },
              {
                title: "Team Performance",
                desc: "Compare engineering activity across teams, projects, and repositories.",
                icon: BarChart3,
              },
              {
                title: "Engineering Trends",
                desc: "Monitor how engineering activity changes over time.",
                icon: LineChart,
              },
            ].map(({ title, desc, icon: Icon }) => (
              <div
                key={title}
                className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3 hover:border-indigo-500/40 transition-all group"
              >
                <div className="p-3 w-fit rounded-xl bg-indigo-600/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-start">
            <button
              onClick={handleConnectGitHub}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <span>Explore GitHub Analytics →</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Section: Feature Breakdown Grids ──────────────────────────────── */}
      <section className="py-20 border-b border-slate-800/60 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 space-y-16 text-left">
          {/* 1. Repository Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-900/60 border border-slate-800 p-8 rounded-3xl">
            <div className="lg:col-span-7 space-y-4">
              <h3 className="text-2xl font-bold text-white">GitHub Repository Analytics</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Understand what&apos;s happening across your GitHub repositories. Repository analytics can help engineering leaders understand which repositories are receiving the most development activity and where additional attention may be needed.
              </p>
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                {[
                  "Repository activity",
                  "Commit trends",
                  "Pull request activity",
                  "Contributor activity",
                  "Repository growth",
                  "Development trends",
                  "Merge activity",
                  "Active contributors",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <button
                  onClick={handleConnectGitHub}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 underline underline-offset-4"
                >
                  <span>Explore Repository Analytics →</span>
                </button>
              </div>
            </div>
            <div className="lg:col-span-5 bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-slate-300">Repository Insights Overview</span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2.5 bg-slate-900 rounded-lg">
                  <span className="text-slate-400">core-backend</span>
                  <span className="font-bold text-emerald-400">High Velocity (342 PRs)</span>
                </div>
                <div className="flex justify-between p-2.5 bg-slate-900 rounded-lg">
                  <span className="text-slate-400">web-dashboard</span>
                  <span className="font-bold text-indigo-400">Active (189 PRs)</span>
                </div>
                <div className="flex justify-between p-2.5 bg-slate-900 rounded-lg">
                  <span className="text-slate-400">docs-portal</span>
                  <span className="font-bold text-slate-400">Stable (45 PRs)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Pull Request Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-900/60 border border-slate-800 p-8 rounded-3xl">
            <div className="lg:col-span-5 bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3 order-2 lg:order-1">
              <span className="text-xs font-bold text-slate-300">PR Cycle Time Metrics</span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2.5 bg-slate-900 rounded-lg">
                  <span className="text-slate-400">Time to First Review</span>
                  <span className="font-bold text-white">2.1 Hours</span>
                </div>
                <div className="flex justify-between p-2.5 bg-slate-900 rounded-lg">
                  <span className="text-slate-400">Time to Merge</span>
                  <span className="font-bold text-white">12.4 Hours</span>
                </div>
                <div className="flex justify-between p-2.5 bg-slate-900 rounded-lg">
                  <span className="text-slate-400">Overall Merge Rate</span>
                  <span className="font-bold text-emerald-400">94.2%</span>
                </div>
              </div>
            </div>
            <div className="lg:col-span-7 space-y-4 order-1 lg:order-2">
              <h3 className="text-2xl font-bold text-white">GitHub Pull Request Analytics</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Pull requests provide important signals about the software development lifecycle. Identify delays and understand how efficiently changes move through your development workflow.
              </p>
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                {[
                  "Total pull requests",
                  "Open pull requests",
                  "Merged pull requests",
                  "Closed pull requests",
                  "Pull request cycle time",
                  "Review time",
                  "Merge trends",
                  "PR activity over time",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <button
                  onClick={handleConnectGitHub}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-4"
                >
                  <span>Explore GitHub PR Analytics →</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. Code Review & Developer Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-900/60 border border-slate-800 p-7 rounded-3xl space-y-4">
              <h3 className="text-xl font-bold text-white">GitHub Code Review Analytics</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Code reviews are an important part of software development and collaboration. Use these insights to understand your code review workflow and identify potential bottlenecks.
              </p>
              <ul className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
                <li>• Number of reviews</li>
                <li>• Review activity</li>
                <li>• Review turnaround time</li>
                <li>• Reviewer participation</li>
                <li>• Pending reviews</li>
                <li>• PRs waiting for review</li>
                <li>• Review trends</li>
              </ul>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-7 rounded-3xl space-y-4">
              <h3 className="text-xl font-bold text-white">GitHub Developer Analytics</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Understand development activity across your engineering organization (contributions, commits, PRs, code reviews, repo participation, development trends).
              </p>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 leading-relaxed">
                <strong>Note:</strong> These metrics should be used to understand engineering workflows and collaboration, rather than treating individual activity as a simplistic measure of developer productivity.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Identify Bottlenecks & Trends Over Time ──────────────── */}
      <section className="py-20 border-b border-slate-800/60 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-6 space-y-16 text-left">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Trends Left */}
            <div className="lg:col-span-6 space-y-6">
              <h2 className="text-3xl font-bold text-white">
                Track Engineering Trends Over Time
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                A single snapshot doesn&apos;t tell the complete story. GitHub Analytics allows you to look at development activity over time. Historical data makes it easier to identify changes in your engineering workflow.
              </p>
              <div className="space-y-3 pt-2">
                {[
                  "Increasing or decreasing PR volume",
                  "Changes in review time",
                  "Repository activity trends",
                  "Developer participation changes",
                  "Merge activity velocity",
                  "Team collaboration trends",
                ].map((trend) => (
                  <div key={trend} className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200">
                    <TrendingUp className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>{trend}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottlenecks Right */}
            <div className="lg:col-span-6 space-y-6">
              <h2 className="text-3xl font-bold text-white">
                Identify Engineering Bottlenecks
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                GitHub Analytics can help surface potential bottlenecks in your development process before they impact delivery dates.
              </p>
              <div className="space-y-3 pt-2">
                {[
                  { label: "Long PR Cycle Times", desc: "Identify pull requests taking significantly longer to move from creation to merge." },
                  { label: "Slow Code Reviews", desc: "Find areas where reviews are taking longer than expected." },
                  { label: "Growing PR Backlogs", desc: "Monitor open pull requests and identify increasing backlogs." },
                  { label: "Repository Imbalance", desc: "Understand how development activity is distributed across repositories." },
                  { label: "Review Bottlenecks", desc: "Identify areas where pending reviews may be slowing delivery." },
                ].map((item) => (
                  <div key={item.label} className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-rose-400 block">{item.label}</span>
                    <span className="text-slate-400 block">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Who Is GitHub Analytics For? ────────────────────────── */}
      <section className="py-20 border-b border-slate-800/60 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 space-y-12 text-left">
          <div className="max-w-3xl space-y-3">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Who Is GitHub Analytics For?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Designed to serve stakeholders across all levels of the software engineering organization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
              <div className="p-3 w-fit rounded-xl bg-indigo-500/10 text-indigo-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">For Engineering Managers</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Engineering managers need visibility into development workflows without manually analyzing GitHub data. Track team activity, PR performance, review trends, and development patterns to support better planning.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
              <div className="p-3 w-fit rounded-xl bg-emerald-500/10 text-emerald-400">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">For CTOs & VPs</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                CTOs need organization-level visibility into software development. Understand how active teams are, how quickly PRs move, where review bottlenecks occur, and if processes are improving.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
              <div className="p-3 w-fit rounded-xl bg-purple-500/10 text-purple-400">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">For Engineering Leaders</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Engineering leaders can use GitHub analytics to understand development trends across teams and repositories, monitoring delivery trends, review performance, and repo health.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: GitHub Analytics vs Manual Reporting ─────────────────── */}
      <section className="py-20 border-b border-slate-800/60 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-6 space-y-10 text-left">
          <div className="max-w-3xl space-y-3">
            <h2 className="text-3xl font-bold text-white">
              GitHub Analytics vs Manual Reporting
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Spend less time preparing engineering reports and more time improving engineering processes.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900 text-slate-300">
                  <th className="p-4 font-bold">Feature / Capability</th>
                  <th className="p-4 font-bold text-rose-400">Manual GitHub Reporting</th>
                  <th className="p-4 font-bold text-emerald-400">GitAudit GitHub Analytics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr>
                  <td className="p-4 font-semibold text-white">Data Collection</td>
                  <td className="p-4 text-slate-400">Export data manually via CSV or API scripts</td>
                  <td className="p-4 text-emerald-300 font-semibold">Automated OAuth sync & background polling</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-white">Dashboards</td>
                  <td className="p-4 text-slate-400">Build custom spreadsheets manually</td>
                  <td className="p-4 text-emerald-300 font-semibold">Centralized real-time web dashboard</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-white">Metrics Calculation</td>
                  <td className="p-4 text-slate-400">Calculate cycle times & review averages manually</td>
                  <td className="p-4 text-emerald-300 font-semibold">Automated real-time metric processing</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-white">Historical Trends</td>
                  <td className="p-4 text-slate-400">Difficult to track history across months</td>
                  <td className="p-4 text-emerald-300 font-semibold">Seamless historical trends & area charts</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-white">Reporting Speed</td>
                  <td className="p-4 text-slate-400">Hours spent preparing weekly reports</td>
                  <td className="p-4 text-emerald-300 font-semibold">Instant reports & exportable digests</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-white">Visualization</td>
                  <td className="p-4 text-slate-400">Static charts or raw numbers</td>
                  <td className="p-4 text-emerald-300 font-semibold">Interactive charts, heatmaps & leaderboards</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Section: How GitHub Analytics Works ───────────────────────────── */}
      <section className="py-20 border-b border-slate-800/60 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 space-y-12 text-left">
          <div className="max-w-3xl space-y-3">
            <h2 className="text-3xl font-bold text-white">How GitHub Analytics Works</h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Get up and running in minutes with read-only OAuth access.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { step: "1", title: "Connect GitHub", desc: "Connect your GitHub organization or repositories securely." },
              { step: "2", title: "Collect Data", desc: "Analyze relevant GitHub activity across repos, PRs, reviews, and contributors." },
              { step: "3", title: "Process Metrics", desc: "Convert raw GitHub activity into useful metrics and trends." },
              { step: "4", title: "Explore Dashboard", desc: "View repository, team, developer, PR, review, and engineering analytics." },
              { step: "5", title: "Monitor Trends", desc: "Continue tracking engineering activity and performance over time." },
            ].map((item) => (
              <div key={item.step} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
                <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                  {item.step}
                </span>
                <h3 className="text-sm font-bold text-white pt-1">{item.title}</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={handleConnectGitHub}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <span>Connect GitHub →</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Section: Frequently Asked Questions ───────────────────────────── */}
      <section className="py-20 border-b border-slate-800/60 bg-slate-900/30">
        <div className="max-w-4xl mx-auto px-6 space-y-10 text-left">
          <div className="space-y-3 text-center sm:text-left">
            <h2 className="text-3xl font-bold text-white">Frequently Asked Questions</h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Common questions about GitHub Analytics and engineering intelligence metrics.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={faq.q}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-5 text-left font-semibold text-sm text-white flex justify-between items-center gap-4 hover:text-indigo-300"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-indigo-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-0 text-xs text-slate-300 leading-relaxed border-t border-slate-800/50">
                      <p className="pt-3">{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section: Final Call to Action Banner ─────────────────────────── */}
      <section className="py-20 bg-gradient-to-b from-slate-950 via-indigo-950/20 to-slate-950 border-b border-slate-800/60">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Start Using GitHub Analytics
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            Your GitHub repositories contain valuable engineering data. Turn that data into clear, actionable insights. Understand your repositories. Measure your engineering activity. Improve your development workflows.
          </p>
          <div className="pt-2">
            <button
              onClick={handleConnectGitHub}
              className="inline-flex items-center gap-3 bg-white hover:bg-slate-100 text-slate-950 px-8 py-4 rounded-2xl font-bold text-sm transition-all shadow-xl shadow-white/10"
            >
              <GitHubIcon className="w-5 h-5" />
              <span>Start GitHub Analytics →</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Section: Recommended Internal Links ────────────────────────── */}
      <section className="py-12 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 text-left space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Recommended GitHub Analytics Resources
          </h3>
          <div className="flex flex-wrap gap-2.5">
            {INTERNAL_LINKS.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-xs bg-slate-900 border border-slate-800/80 px-3.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:border-slate-700 transition-all"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
