"use client";

import { useState } from "react";
import Link from "next/link";
import { getGitHubOAuthUrl } from "@/lib/auth";
import {
  GitBranch,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Clock,
  FolderGit2,
  AlertTriangle,
  Users,
  TrendingUp,
  Layers,
  GitPullRequest,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  Building2,
  Sliders,
} from "lucide-react";

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
  </svg>
);

const FAQS = [
  {
    q: "What is a GitHub audit?",
    a: "A GitHub audit is an analysis of GitHub repositories, pull requests, code reviews, developer activity, and other development data to understand repository health and engineering performance.",
  },
  {
    q: "What does a GitHub audit tool analyze?",
    a: "A GitHub audit tool can analyze repositories, pull requests, commits, code reviews, contributors, merge activity, and engineering metrics.",
  },
  {
    q: "Why should I audit my GitHub repositories?",
    a: "Auditing GitHub repositories can help identify development bottlenecks, review delays, repository activity patterns, and opportunities to improve engineering workflows.",
  },
  {
    q: "Can GitHub Audit analyze multiple repositories?",
    a: "Yes. GitHub Audit is designed to provide visibility across multiple repositories so teams can understand development activity at both repository and organizational levels.",
  },
  {
    q: "Can GitHub Audit help measure developer productivity?",
    a: "GitHub activity can provide useful engineering signals such as pull request activity, review activity, and contribution patterns. These metrics should be interpreted as indicators of engineering workflows rather than as a simplistic measure of individual developer performance.",
  },
  {
    q: "Is GitHub Audit useful for engineering managers?",
    a: "Yes. Engineering managers can use GitHub analytics to understand team activity, pull request performance, review workflows, and development trends.",
  },
];

const INTERNAL_LINKS = [
  { name: "GitHub Analytics", href: "/github-analytics" },
  { name: "GitHub PR Analytics", href: "#" },
  { name: "GitHub Code Review Analytics", href: "#" },
  { name: "GitHub Developer Analytics", href: "#" },
  { name: "GitHub Repository Analytics", href: "#" },
  { name: "Engineering Analytics", href: "#" },
  { name: "Developer Productivity", href: "#" },
  { name: "Engineering Metrics", href: "#" },
];

export default function GitHubAuditClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleConnectGitHub = () => {
    window.location.href = getGitHubOAuthUrl();
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      {/* ── Header Navigation ────────────────────────────────────────────── */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="bg-indigo-600 rounded-lg p-1.5 shadow-sm">
              <GitBranch className="h-5 w-5 text-white" />
            </div>
            <span className="text-slate-900 font-bold text-lg tracking-tight">GitAudit</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors hidden sm:block font-medium"
            >
              Home
            </Link>
            <Link
              href="/github-analytics"
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors hidden sm:block font-medium"
            >
              Analytics
            </Link>
            <button
              onClick={handleConnectGitHub}
              className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-sm"
            >
              <GitHubIcon className="h-4 w-4" />
              <span>Audit Your GitHub →</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section (Boxed Container) ───────────────────────────────── */}
      <section className="py-16 md:py-20 border-b border-slate-200 bg-gradient-to-b from-slate-50/80 to-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-sm space-y-6 text-left">
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full px-3.5 py-1 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>GitHub Audit Tool</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              GitHub Audit Tool
            </h1>

            <p className="text-xl sm:text-2xl font-semibold text-indigo-600 leading-snug">
              Analyze Your GitHub Repositories, Pull Requests &amp; Engineering Performance
            </p>

            <div className="space-y-4 text-slate-700 text-base sm:text-lg leading-relaxed max-w-4xl">
              <p>
                Get a comprehensive view of your GitHub development activity with GitHub Audit. Analyze repositories, pull requests, code reviews, developer activity, merge patterns, and engineering metrics from a single platform.
              </p>
              <p>
                Identify bottlenecks, understand development trends, and turn GitHub activity into actionable engineering insights.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleConnectGitHub}
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-3.5 rounded-xl font-bold text-base transition-all shadow-md shadow-indigo-600/20"
              >
                <span>Audit Your GitHub →</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Turn GitHub Activity Into Engineering Insights ──────── */}
      <section className="py-16 border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 space-y-10 text-left">
          <div className="space-y-4 max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Turn GitHub Activity Into Engineering Insights
            </h2>
            <p className="text-slate-700 text-base leading-relaxed">
              GitHub contains valuable information about how your engineering teams build, review, and deliver software.
            </p>
            <p className="text-slate-700 text-base leading-relaxed">
              However, raw GitHub activity doesn&apos;t always provide the complete picture.
            </p>
            <p className="text-slate-700 text-base leading-relaxed font-semibold">
              GitHub Audit helps engineering teams analyze their GitHub data and understand:
            </p>
          </div>

          {/* 7 Boxes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              "How efficiently pull requests move through the development lifecycle",
              "How long code reviews take",
              "Which repositories are most active",
              "Where development bottlenecks exist",
              "How teams collaborate",
              "How developer activity changes over time",
              "How engineering performance evolves",
            ].map((text, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex items-start gap-3.5"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 mt-2 shrink-0" />
                <span className="text-slate-800 text-sm font-medium leading-relaxed">{text}</span>
              </div>
            ))}
          </div>

          {/* Highlight Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
            <p className="text-slate-800 text-base font-medium leading-relaxed">
              Instead of manually analyzing GitHub repositories and pull requests, get a centralized view of your engineering activity.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section: What Can You Audit in GitHub? ───────────────────────── */}
      <section className="py-16 border-b border-slate-200 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-6 space-y-10 text-left">
          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              What Can You Audit in GitHub?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Box 1: Pull Request Analytics */}
            <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-sm hover:shadow-md transition-all space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                    <GitPullRequest className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Pull Request Analytics</h3>
                </div>

                <p className="text-slate-700 text-sm leading-relaxed">
                  Understand how pull requests move from creation to merge.
                </p>

                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Track metrics such as:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {[
                      "Pull request volume",
                      "Open vs. merged pull requests",
                      "Average PR cycle time",
                      "PR review time",
                      "Merge trends",
                      "Open PRs",
                      "PR activity over time",
                    ].map((m) => (
                      <div key={m} className="flex items-center gap-2 text-xs text-slate-800 bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-slate-700 text-sm leading-relaxed pt-2">
                  Identify where pull requests are getting delayed and improve your development workflow.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <Link
                  href="/github-analytics"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <span>Explore Pull Request Analytics →</span>
                </Link>
              </div>
            </div>

            {/* Box 2: Code Review Analytics */}
            <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-sm hover:shadow-md transition-all space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Code Review Analytics</h3>
                </div>

                <p className="text-slate-700 text-sm leading-relaxed">
                  Code reviews are an important part of software quality and engineering collaboration.
                </p>

                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">GitHub Audit helps you understand:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {[
                      "Review activity",
                      "Review turnaround time",
                      "Review participation",
                      "Pending reviews",
                      "Review bottlenecks",
                      "Changes waiting for approval",
                    ].map((m) => (
                      <div key={m} className="flex items-center gap-2 text-xs text-slate-800 bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-slate-700 text-sm leading-relaxed pt-2">
                  Use these insights to identify opportunities to make your code review process faster and more efficient.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <Link
                  href="/github-analytics"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <span>Explore Code Review Analytics →</span>
                </Link>
              </div>
            </div>

            {/* Box 3: Developer Activity Analytics */}
            <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-sm hover:shadow-md transition-all space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Developer Activity Analytics</h3>
                </div>

                <p className="text-slate-700 text-sm leading-relaxed">
                  Understand development activity across your GitHub organization.
                </p>

                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Analyze:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {[
                      "Developer contributions",
                      "Commit activity",
                      "Pull request activity",
                      "Review activity",
                      "Repository participation",
                      "Development trends",
                    ].map((m) => (
                      <div key={m} className="flex items-center gap-2 text-xs text-slate-800 bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-slate-700 text-sm leading-relaxed pt-2">
                  Get a clearer picture of how engineering work is distributed across teams and repositories.
                </p>
              </div>
            </div>

            {/* Box 4: Repository Analytics */}
            <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-sm hover:shadow-md transition-all space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                    <FolderGit2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Repository Analytics</h3>
                </div>

                <p className="text-slate-700 text-sm leading-relaxed">
                  Analyze the health and activity of your GitHub repositories.
                </p>

                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Monitor:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {[
                      "Repository activity",
                      "Pull request trends",
                      "Commit activity",
                      "Contributor activity",
                      "Repository growth",
                      "Development patterns",
                    ].map((m) => (
                      <div key={m} className="flex items-center gap-2 text-xs text-slate-800 bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-slate-700 text-sm leading-relaxed pt-2">
                  Identify highly active repositories and repositories that may require additional attention.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: GitHub Engineering Metrics ───────────────────────────── */}
      <section className="py-16 border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 space-y-8 text-left">
          <div className="space-y-3 max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              GitHub Engineering Metrics
            </h2>
            <p className="text-slate-700 text-base leading-relaxed">
              GitHub Audit turns development activity into measurable engineering metrics.
            </p>
            <p className="text-slate-700 text-base leading-relaxed font-semibold">
              Track important indicators such as:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                title: "PR Cycle Time",
                desc: "How long changes take from creation to merge",
                icon: Clock,
              },
              {
                title: "Review Time",
                desc: "How quickly code reviews are completed",
                icon: CheckCircle2,
              },
              {
                title: "PR Volume",
                desc: "Development and collaboration activity",
                icon: GitPullRequest,
              },
              {
                title: "Merge Trends",
                desc: "How effectively changes move through development",
                icon: TrendingUp,
              },
              {
                title: "Developer Activity",
                desc: "Contribution and collaboration patterns",
                icon: Users,
              },
              {
                title: "Repository Activity",
                desc: "Health and development activity of repositories",
                icon: Layers,
              },
            ].map(({ title, desc, icon: Icon }) => (
              <div
                key={title}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all space-y-3"
              >
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 w-fit">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-slate-700 text-sm font-medium leading-relaxed">
              These metrics can help engineering leaders identify trends and continuously improve software delivery.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section: Identify Engineering Bottlenecks ─────────────────────── */}
      <section className="py-16 border-b border-slate-200 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-6 space-y-8 text-left">
          <div className="space-y-3 max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Identify Engineering Bottlenecks
            </h2>
            <p className="text-slate-700 text-base leading-relaxed">
              A growing engineering team can generate thousands of GitHub events every month. Finding bottlenecks manually can be difficult.
            </p>
            <p className="text-slate-700 text-base leading-relaxed font-semibold">
              GitHub Audit helps you identify areas such as:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                title: "Long review times",
                desc: "Pull requests waiting too long for review can slow down development.",
              },
              {
                title: "PR backlog",
                desc: "A growing number of open pull requests may indicate workflow or review bottlenecks.",
              },
              {
                title: "Uneven activity",
                desc: "Understand how development activity is distributed across repositories and teams.",
              },
              {
                title: "Slow merges",
                desc: "Identify changes that take longer than expected to reach production.",
              },
              {
                title: "Repository inactivity",
                desc: "Discover repositories with declining development activity.",
              },
            ].map(({ title, desc }) => (
              <div
                key={title}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-slate-300 transition-colors space-y-2.5"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <h3 className="text-base font-bold text-slate-900">{title}</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section: GitHub Audit for Leadership (Side-by-Side Boxes) ─────── */}
      <section className="py-16 border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
          {/* Box 1: For Engineering Managers */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="p-3 w-fit rounded-2xl bg-indigo-100 text-indigo-700">
                <UserCheck className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                GitHub Audit for Engineering Managers
              </h2>
              <p className="text-slate-700 text-sm leading-relaxed">
                Engineering managers need more than a list of commits and pull requests.
              </p>
              <p className="text-slate-700 text-sm leading-relaxed">
                They need to understand how the engineering process is performing.
              </p>

              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">GitHub Audit provides visibility into:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    "Team development activity",
                    "Pull request performance",
                    "Code review efficiency",
                    "Repository activity",
                    "Engineering trends",
                    "Development bottlenecks",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs text-slate-800 bg-white border border-slate-200 p-3 rounded-xl shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                      <span className="font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-slate-600 text-xs font-medium pt-4 border-t border-slate-200">
              Use these insights to have more informed engineering discussions and improve development processes.
            </p>
          </div>

          {/* Box 2: For CTOs & Engineering Leaders */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="p-3 w-fit rounded-2xl bg-emerald-100 text-emerald-700">
                <Building2 className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                GitHub Audit for CTOs &amp; Engineering Leaders
              </h2>
              <p className="text-slate-700 text-sm leading-relaxed">
                For CTOs and engineering leaders, GitHub can provide valuable operational data about software development.
              </p>

              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">GitHub Audit helps answer questions such as:</span>
                <div className="space-y-2">
                  {[
                    "How efficiently are our teams shipping code?",
                    "Are pull requests being reviewed quickly?",
                    "Where are development bottlenecks occurring?",
                    "Which repositories are most active?",
                    "How is engineering activity changing over time?",
                    "Are our development processes improving?",
                  ].map((q) => (
                    <div key={q} className="flex items-start gap-2.5 text-xs text-slate-800 bg-white border border-slate-200 p-3 rounded-xl shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1 shrink-0" />
                      <span className="font-medium">{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-slate-600 text-xs font-medium pt-4 border-t border-slate-200">
              Use engineering data from GitHub to understand development performance.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section: Why Audit Your GitHub Repositories? ──────────────────── */}
      <section className="py-16 border-b border-slate-200 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-6 space-y-8 text-left">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Why Audit Your GitHub Repositories?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                title: "Improve Development Visibility",
                desc: "Get a centralized view of GitHub activity across repositories and teams.",
              },
              {
                title: "Reduce Development Bottlenecks",
                desc: "Find delays in pull requests, reviews, and merging.",
              },
              {
                title: "Improve Code Review Efficiency",
                desc: "Understand review patterns and identify opportunities to improve turnaround time.",
              },
              {
                title: "Measure Engineering Performance",
                desc: "Track meaningful engineering metrics over time.",
              },
              {
                title: "Make Data-Driven Decisions",
                desc: "Use GitHub activity data to support engineering planning and process improvement.",
              },
            ].map(({ title, desc }) => (
              <div
                key={title}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all space-y-2.5"
              >
                <h3 className="text-base font-bold text-slate-900">{title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section: How GitHub Audit Works (Numbered Boxes) ──────────────── */}
      <section className="py-16 border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 space-y-8 text-left">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            How GitHub Audit Works
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                step: "1",
                title: "Connect GitHub",
                desc: "Connect your GitHub organization or repositories to GitHub Audit.",
              },
              {
                step: "2",
                title: "Analyze Your GitHub Data",
                desc: "The platform analyzes relevant repository, pull request, review, and development activity.",
              },
              {
                step: "3",
                title: "Discover Engineering Insights",
                desc: "View dashboards and metrics that help you understand development performance.",
              },
              {
                step: "4",
                title: "Identify Opportunities",
                desc: "Find bottlenecks, trends, and areas where your engineering workflow can improve.",
              },
              {
                step: "5",
                title: "Continuously Monitor",
                desc: "Track engineering activity and performance over time.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                  {item.step}
                </span>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section: GitHub Audit Dashboard ──────────────────────────────── */}
      <section className="py-16 border-b border-slate-200 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-6 space-y-8 text-left">
          <div className="space-y-3 max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              GitHub Audit Dashboard
            </h2>
            <p className="text-slate-700 text-base leading-relaxed">
              Get a centralized view of your GitHub engineering activity.
            </p>
            <p className="text-slate-700 text-base leading-relaxed font-semibold">
              Your dashboard can provide insights into:
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {[
              "Repository activity",
              "Pull request activity",
              "Review performance",
              "Developer activity",
              "Merge trends",
              "Engineering metrics",
            ].map((item) => (
              <div
                key={item}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center space-y-2 flex flex-col items-center justify-center"
              >
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                <span className="text-xs font-semibold text-slate-800 leading-snug">{item}</span>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <p className="text-slate-700 text-base font-medium">
              Move from raw GitHub data to meaningful engineering insights.
            </p>
            <button
              onClick={handleConnectGitHub}
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-3 rounded-xl font-bold text-sm transition-all shadow-md shadow-indigo-600/20 shrink-0"
            >
              <span>Start Your GitHub Audit →</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Section: Who Is GitHub Audit For? ────────────────────────────── */}
      <section className="py-16 border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 space-y-8 text-left">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Who Is GitHub Audit For?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                role: "Engineering Managers",
                desc: "Monitor team development activity and identify workflow bottlenecks.",
              },
              {
                role: "CTOs",
                desc: "Get visibility into engineering performance across your organization.",
              },
              {
                role: "Engineering Leaders",
                desc: "Track software delivery and development trends.",
              },
              {
                role: "Development Teams",
                desc: "Understand collaboration, reviews, and pull request performance.",
              },
              {
                role: "Software Organizations",
                desc: "Analyze GitHub repositories and establish measurable engineering processes.",
              },
            ].map(({ role, desc }) => (
              <div
                key={role}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-slate-300 transition-colors space-y-2"
              >
                <h3 className="text-base font-bold text-slate-900">{role}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section: GitHub Audit vs Manual GitHub Analysis (Boxed Table) ── */}
      <section className="py-16 border-b border-slate-200 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-6 space-y-8 text-left">
          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              GitHub Audit vs Manual GitHub Analysis
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Box 1: Manual Analysis */}
            <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900 pb-2 border-b border-slate-100">
                Manual Analysis:
              </h3>
              <ul className="space-y-3 text-slate-700 text-sm">
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                  <span>Export GitHub data manually</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                  <span>Build spreadsheets</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                  <span>Manually calculate PR metrics</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                  <span>Difficult to track trends</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                  <span>Time-consuming reporting</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                  <span>Limited visibility</span>
                </li>
              </ul>
            </div>

            {/* Box 2: GitHub Audit */}
            <div className="bg-white border border-indigo-200 rounded-3xl p-7 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-indigo-900 pb-2 border-b border-indigo-100">
                GitHub Audit:
              </h3>
              <ul className="space-y-3 text-slate-800 text-sm font-medium">
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 shrink-0" />
                  <span>Centralized analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 shrink-0" />
                  <span>Automated metrics</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 shrink-0" />
                  <span>Automatic PR analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 shrink-0" />
                  <span>Historical insights</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 shrink-0" />
                  <span>Ready-to-use dashboards</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 shrink-0" />
                  <span>Comprehensive engineering view</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center">
            <p className="text-slate-800 text-sm font-medium leading-relaxed">
              Spend less time collecting GitHub data and more time improving your engineering processes.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section: Frequently Asked Questions (Boxed Accordion) ─────────── */}
      <section className="py-16 border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 space-y-8 text-left">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Frequently Asked Questions
          </h2>

          <div className="space-y-3.5">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={faq.q}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-5 text-left font-semibold text-base text-slate-900 flex justify-between items-center gap-4 hover:text-indigo-600 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-indigo-600 shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-0 text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                      <p className="pt-3">{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section: Start Auditing Your GitHub Repositories (Callout Box) ── */}
      <section className="py-16 border-b border-slate-200 bg-slate-50/50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-sm text-center space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Start Auditing Your GitHub Repositories
            </h2>

            <div className="space-y-3 text-slate-700 text-base leading-relaxed max-w-2xl mx-auto">
              <p>
                Your GitHub repositories contain valuable information about how your engineering organization builds and delivers software.
              </p>
              <p>
                Turn that activity into actionable engineering insights.
              </p>
              <p>
                Connect GitHub and discover your engineering performance.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleConnectGitHub}
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-bold text-base transition-all shadow-md shadow-indigo-600/20"
              >
                <span>Start Your GitHub Audit →</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Recommended Internal Links (Boxed Grid) ────────────── */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-left space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Recommended Internal Links
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {INTERNAL_LINKS.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="bg-white border border-slate-200 rounded-xl p-3.5 text-center text-xs font-medium text-slate-700 hover:text-indigo-600 hover:border-indigo-300 hover:shadow-xs transition-all flex items-center justify-center"
              >
                <span>{link.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
