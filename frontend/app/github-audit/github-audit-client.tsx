"use client";

import { useState } from "react";
import Link from "next/link";
import { getGitHubOAuthUrl } from "@/lib/auth";
import {
  GitBranch,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
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
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
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

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section className="pt-16 pb-20 border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 space-y-6 text-left">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            GitHub Audit Tool
          </h1>

          <p className="text-2xl sm:text-3xl font-semibold text-indigo-600 leading-snug">
            Analyze Your GitHub Repositories, Pull Requests &amp; Engineering Performance
          </p>

          <p className="text-slate-700 text-base sm:text-lg leading-relaxed">
            Get a comprehensive view of your GitHub development activity with GitHub Audit. Analyze repositories, pull requests, code reviews, developer activity, merge patterns, and engineering metrics from a single platform.
          </p>

          <p className="text-slate-700 text-base sm:text-lg leading-relaxed">
            Identify bottlenecks, understand development trends, and turn GitHub activity into actionable engineering insights.
          </p>

          <div className="pt-4">
            <button
              onClick={handleConnectGitHub}
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-3.5 rounded-xl font-bold text-base transition-all shadow-md shadow-indigo-600/20"
            >
              <span>Audit Your GitHub →</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Section: Turn GitHub Activity Into Engineering Insights ──────── */}
      <section className="py-16 border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 space-y-6 text-left">
          <h2 className="text-3xl font-bold text-slate-900">
            Turn GitHub Activity Into Engineering Insights
          </h2>

          <p className="text-slate-700 text-base leading-relaxed">
            GitHub contains valuable information about how your engineering teams build, review, and deliver software.
          </p>

          <p className="text-slate-700 text-base leading-relaxed">
            However, raw GitHub activity doesn&apos;t always provide the complete picture.
          </p>

          <p className="text-slate-700 text-base leading-relaxed">
            GitHub Audit helps engineering teams analyze their GitHub data and understand:
          </p>

          <ul className="space-y-3 pl-2 text-slate-800 text-base">
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>How efficiently pull requests move through the development lifecycle</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>How long code reviews take</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>Which repositories are most active</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>Where development bottlenecks exist</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>How teams collaborate</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>How developer activity changes over time</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>How engineering performance evolves</span>
            </li>
          </ul>

          <p className="text-slate-700 text-base leading-relaxed pt-2">
            Instead of manually analyzing GitHub repositories and pull requests, get a centralized view of your engineering activity.
          </p>
        </div>
      </section>

      {/* ── Section: What Can You Audit in GitHub? ───────────────────────── */}
      <section className="py-16 border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 space-y-12 text-left">
          <h2 className="text-3xl font-bold text-slate-900">
            What Can You Audit in GitHub?
          </h2>

          {/* 1. Pull Request Analytics */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-slate-900">
              Pull Request Analytics
            </h3>
            <p className="text-slate-700 text-base leading-relaxed">
              Understand how pull requests move from creation to merge.
            </p>
            <p className="text-slate-700 text-base leading-relaxed">
              Track metrics such as:
            </p>
            <ul className="space-y-2 pl-2 text-slate-800 text-base">
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Pull request volume</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Open vs. merged pull requests</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Average PR cycle time</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>PR review time</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Merge trends</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Open PRs</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>PR activity over time</span>
              </li>
            </ul>
            <p className="text-slate-700 text-base leading-relaxed">
              Identify where pull requests are getting delayed and improve your development workflow.
            </p>
            <div className="pt-1">
              <Link
                href="/github-analytics"
                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-semibold text-base"
              >
                <span>Explore Pull Request Analytics →</span>
              </Link>
            </div>
          </div>

          {/* 2. Code Review Analytics */}
          <div className="space-y-4 pt-6 border-t border-slate-200">
            <h3 className="text-2xl font-bold text-slate-900">
              Code Review Analytics
            </h3>
            <p className="text-slate-700 text-base leading-relaxed">
              Code reviews are an important part of software quality and engineering collaboration.
            </p>
            <p className="text-slate-700 text-base leading-relaxed">
              GitHub Audit helps you understand:
            </p>
            <ul className="space-y-2 pl-2 text-slate-800 text-base">
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Review activity</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Review turnaround time</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Review participation</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Pending reviews</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Review bottlenecks</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Changes waiting for approval</span>
              </li>
            </ul>
            <p className="text-slate-700 text-base leading-relaxed">
              Use these insights to identify opportunities to make your code review process faster and more efficient.
            </p>
            <div className="pt-1">
              <Link
                href="/github-analytics"
                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-semibold text-base"
              >
                <span>Explore Code Review Analytics →</span>
              </Link>
            </div>
          </div>

          {/* 3. Developer Activity Analytics */}
          <div className="space-y-4 pt-6 border-t border-slate-200">
            <h3 className="text-2xl font-bold text-slate-900">
              Developer Activity Analytics
            </h3>
            <p className="text-slate-700 text-base leading-relaxed">
              Understand development activity across your GitHub organization.
            </p>
            <p className="text-slate-700 text-base leading-relaxed">
              Analyze:
            </p>
            <ul className="space-y-2 pl-2 text-slate-800 text-base">
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Developer contributions</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Commit activity</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Pull request activity</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Review activity</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Repository participation</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Development trends</span>
              </li>
            </ul>
            <p className="text-slate-700 text-base leading-relaxed">
              Get a clearer picture of how engineering work is distributed across teams and repositories.
            </p>
          </div>

          {/* 4. Repository Analytics */}
          <div className="space-y-4 pt-6 border-t border-slate-200">
            <h3 className="text-2xl font-bold text-slate-900">
              Repository Analytics
            </h3>
            <p className="text-slate-700 text-base leading-relaxed">
              Analyze the health and activity of your GitHub repositories.
            </p>
            <p className="text-slate-700 text-base leading-relaxed">
              Monitor:
            </p>
            <ul className="space-y-2 pl-2 text-slate-800 text-base">
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Repository activity</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Pull request trends</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Commit activity</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Contributor activity</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Repository growth</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Development patterns</span>
              </li>
            </ul>
            <p className="text-slate-700 text-base leading-relaxed">
              Identify highly active repositories and repositories that may require additional attention.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section: GitHub Engineering Metrics ───────────────────────────── */}
      <section className="py-16 border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 space-y-6 text-left">
          <h2 className="text-3xl font-bold text-slate-900">
            GitHub Engineering Metrics
          </h2>
          <p className="text-slate-700 text-base leading-relaxed">
            GitHub Audit turns development activity into measurable engineering metrics.
          </p>
          <p className="text-slate-700 text-base leading-relaxed">
            Track important indicators such as:
          </p>
          <div className="space-y-4 pt-2 text-slate-800 text-base">
            <p>
              <strong className="text-slate-900 font-bold">PR Cycle Time</strong> — How long changes take from creation to merge
            </p>
            <p>
              <strong className="text-slate-900 font-bold">Review Time</strong> — How quickly code reviews are completed
            </p>
            <p>
              <strong className="text-slate-900 font-bold">PR Volume</strong> — Development and collaboration activity
            </p>
            <p>
              <strong className="text-slate-900 font-bold">Merge Trends</strong> — How effectively changes move through development
            </p>
            <p>
              <strong className="text-slate-900 font-bold">Developer Activity</strong> — Contribution and collaboration patterns
            </p>
            <p>
              <strong className="text-slate-900 font-bold">Repository Activity</strong> — Health and development activity of repositories
            </p>
          </div>
          <p className="text-slate-700 text-base leading-relaxed pt-2">
            These metrics can help engineering leaders identify trends and continuously improve software delivery.
          </p>
        </div>
      </section>

      {/* ── Section: Identify Engineering Bottlenecks ─────────────────────── */}
      <section className="py-16 border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 space-y-6 text-left">
          <h2 className="text-3xl font-bold text-slate-900">
            Identify Engineering Bottlenecks
          </h2>
          <p className="text-slate-700 text-base leading-relaxed">
            A growing engineering team can generate thousands of GitHub events every month. Finding bottlenecks manually can be difficult.
          </p>
          <p className="text-slate-700 text-base leading-relaxed">
            GitHub Audit helps you identify areas such as:
          </p>
          <div className="space-y-4 pt-2 text-slate-800 text-base">
            <p>
              <strong className="text-slate-900 font-bold">Long review times</strong> — Pull requests waiting too long for review can slow down development.
            </p>
            <p>
              <strong className="text-slate-900 font-bold">PR backlog</strong> — A growing number of open pull requests may indicate workflow or review bottlenecks.
            </p>
            <p>
              <strong className="text-slate-900 font-bold">Uneven activity</strong> — Understand how development activity is distributed across repositories and teams.
            </p>
            <p>
              <strong className="text-slate-900 font-bold">Slow merges</strong> — Identify changes that take longer than expected to reach production.
            </p>
            <p>
              <strong className="text-slate-900 font-bold">Repository inactivity</strong> — Discover repositories with declining development activity.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section: GitHub Audit for Engineering Managers ───────────────── */}
      <section className="py-16 border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 space-y-6 text-left">
          <h2 className="text-3xl font-bold text-slate-900">
            GitHub Audit for Engineering Managers
          </h2>
          <p className="text-slate-700 text-base leading-relaxed">
            Engineering managers need more than a list of commits and pull requests.
          </p>
          <p className="text-slate-700 text-base leading-relaxed">
            They need to understand how the engineering process is performing.
          </p>
          <p className="text-slate-700 text-base leading-relaxed">
            GitHub Audit provides visibility into:
          </p>
          <ul className="space-y-2 pl-2 text-slate-800 text-base">
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>Team development activity</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>Pull request performance</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>Code review efficiency</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>Repository activity</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>Engineering trends</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>Development bottlenecks</span>
            </li>
          </ul>
          <p className="text-slate-700 text-base leading-relaxed pt-2">
            Use these insights to have more informed engineering discussions and improve development processes.
          </p>
        </div>
      </section>

      {/* ── Section: GitHub Audit for CTOs & Engineering Leaders ──────────── */}
      <section className="py-16 border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 space-y-6 text-left">
          <h2 className="text-3xl font-bold text-slate-900">
            GitHub Audit for CTOs &amp; Engineering Leaders
          </h2>
          <p className="text-slate-700 text-base leading-relaxed">
            For CTOs and engineering leaders, GitHub can provide valuable operational data about software development.
          </p>
          <p className="text-slate-700 text-base leading-relaxed">
            GitHub Audit helps answer questions such as:
          </p>
          <ul className="space-y-2 pl-2 text-slate-800 text-base">
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>How efficiently are our teams shipping code?</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>Are pull requests being reviewed quickly?</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>Where are development bottlenecks occurring?</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>Which repositories are most active?</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>How is engineering activity changing over time?</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>Are our development processes improving?</span>
            </li>
          </ul>
          <p className="text-slate-700 text-base leading-relaxed pt-2">
            Use engineering data from GitHub to understand development performance.
          </p>
        </div>
      </section>

      {/* ── Section: Why Audit Your GitHub Repositories? ──────────────────── */}
      <section className="py-16 border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 space-y-8 text-left">
          <h2 className="text-3xl font-bold text-slate-900">
            Why Audit Your GitHub Repositories?
          </h2>

          <div className="space-y-6 text-slate-800 text-base">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">Improve Development Visibility</h3>
              <p className="text-slate-700">Get a centralized view of GitHub activity across repositories and teams.</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">Reduce Development Bottlenecks</h3>
              <p className="text-slate-700">Find delays in pull requests, reviews, and merging.</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">Improve Code Review Efficiency</h3>
              <p className="text-slate-700">Understand review patterns and identify opportunities to improve turnaround time.</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">Measure Engineering Performance</h3>
              <p className="text-slate-700">Track meaningful engineering metrics over time.</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">Make Data-Driven Decisions</h3>
              <p className="text-slate-700">Use GitHub activity data to support engineering planning and process improvement.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: How GitHub Audit Works ───────────────────────────────── */}
      <section className="py-16 border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 space-y-8 text-left">
          <h2 className="text-3xl font-bold text-slate-900">
            How GitHub Audit Works
          </h2>

          <div className="space-y-6 text-slate-800 text-base">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">1. Connect GitHub</h3>
              <p className="text-slate-700">Connect your GitHub organization or repositories to GitHub Audit.</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">2. Analyze Your GitHub Data</h3>
              <p className="text-slate-700">The platform analyzes relevant repository, pull request, review, and development activity.</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">3. Discover Engineering Insights</h3>
              <p className="text-slate-700">View dashboards and metrics that help you understand development performance.</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">4. Identify Opportunities</h3>
              <p className="text-slate-700">Find bottlenecks, trends, and areas where your engineering workflow can improve.</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">5. Continuously Monitor</h3>
              <p className="text-slate-700">Track engineering activity and performance over time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: GitHub Audit Dashboard ──────────────────────────────── */}
      <section className="py-16 border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 space-y-6 text-left">
          <h2 className="text-3xl font-bold text-slate-900">
            GitHub Audit Dashboard
          </h2>

          <p className="text-slate-700 text-base leading-relaxed">
            Get a centralized view of your GitHub engineering activity.
          </p>

          <p className="text-slate-700 text-base leading-relaxed">
            Your dashboard can provide insights into:
          </p>

          <ul className="space-y-2 pl-2 text-slate-800 text-base">
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>Repository activity</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>Pull request activity</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>Review performance</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>Developer activity</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>Merge trends</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-600 font-bold">•</span>
              <span>Engineering metrics</span>
            </li>
          </ul>

          <p className="text-slate-700 text-base leading-relaxed pt-2">
            Move from raw GitHub data to meaningful engineering insights.
          </p>

          <div className="pt-2">
            <button
              onClick={handleConnectGitHub}
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-3.5 rounded-xl font-bold text-base transition-all shadow-md shadow-indigo-600/20"
            >
              <span>Start Your GitHub Audit →</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Section: Who Is GitHub Audit For? ────────────────────────────── */}
      <section className="py-16 border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 space-y-6 text-left">
          <h2 className="text-3xl font-bold text-slate-900">
            Who Is GitHub Audit For?
          </h2>

          <div className="space-y-4 text-slate-800 text-base">
            <p>
              <strong className="text-slate-900 font-bold">Engineering Managers</strong> — Monitor team development activity and identify workflow bottlenecks.
            </p>
            <p>
              <strong className="text-slate-900 font-bold">CTOs</strong> — Get visibility into engineering performance across your organization.
            </p>
            <p>
              <strong className="text-slate-900 font-bold">Engineering Leaders</strong> — Track software delivery and development trends.
            </p>
            <p>
              <strong className="text-slate-900 font-bold">Development Teams</strong> — Understand collaboration, reviews, and pull request performance.
            </p>
            <p>
              <strong className="text-slate-900 font-bold">Software Organizations</strong> — Analyze GitHub repositories and establish measurable engineering processes.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section: GitHub Audit vs Manual GitHub Analysis ───────────────── */}
      <section className="py-16 border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 space-y-8 text-left">
          <h2 className="text-3xl font-bold text-slate-900">
            GitHub Audit vs Manual GitHub Analysis
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-base">
            <div className="border border-slate-200 rounded-2xl p-6 space-y-3 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">Manual Analysis:</h3>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2.5">
                  <span className="text-slate-400 font-bold">•</span>
                  <span>Export GitHub data manually</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-slate-400 font-bold">•</span>
                  <span>Build spreadsheets</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-slate-400 font-bold">•</span>
                  <span>Manually calculate PR metrics</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-slate-400 font-bold">•</span>
                  <span>Difficult to track trends</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-slate-400 font-bold">•</span>
                  <span>Time-consuming reporting</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-slate-400 font-bold">•</span>
                  <span>Limited visibility</span>
                </li>
              </ul>
            </div>

            <div className="border border-indigo-200 rounded-2xl p-6 space-y-3 bg-indigo-50/30">
              <h3 className="text-lg font-bold text-indigo-900">GitHub Audit:</h3>
              <ul className="space-y-2 text-slate-800">
                <li className="flex items-start gap-2.5">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span>Centralized analytics</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span>Automated metrics</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span>Automatic PR analytics</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span>Historical insights</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span>Ready-to-use dashboards</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span>Comprehensive engineering view</span>
                </li>
              </ul>
            </div>
          </div>

          <p className="text-slate-700 text-base leading-relaxed">
            Spend less time collecting GitHub data and more time improving your engineering processes.
          </p>
        </div>
      </section>

      {/* ── Section: Frequently Asked Questions ───────────────────────────── */}
      <section className="py-16 border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 space-y-8 text-left">
          <h2 className="text-3xl font-bold text-slate-900">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={faq.q}
                  className="border border-slate-200 rounded-xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-5 text-left font-semibold text-base text-slate-900 flex justify-between items-center gap-4 hover:text-indigo-600"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-indigo-600 shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-0 text-base text-slate-700 leading-relaxed border-t border-slate-100 bg-slate-50/40">
                      <p className="pt-3">{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section: Start Auditing Your GitHub Repositories ─────────────── */}
      <section className="py-16 border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 space-y-6 text-left">
          <h2 className="text-3xl font-bold text-slate-900">
            Start Auditing Your GitHub Repositories
          </h2>

          <p className="text-slate-700 text-base leading-relaxed">
            Your GitHub repositories contain valuable information about how your engineering organization builds and delivers software.
          </p>

          <p className="text-slate-700 text-base leading-relaxed">
            Turn that activity into actionable engineering insights.
          </p>

          <p className="text-slate-700 text-base leading-relaxed">
            Connect GitHub and discover your engineering performance.
          </p>

          <div className="pt-2">
            <button
              onClick={handleConnectGitHub}
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-3.5 rounded-xl font-bold text-base transition-all shadow-md shadow-indigo-600/20"
            >
              <span>Start Your GitHub Audit →</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Section: Recommended Internal Links ────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="max-w-5xl mx-auto px-6 text-left space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Recommended Internal Links
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {INTERNAL_LINKS.map((link) => (
              <li key={link.name}>
                <Link
                  href={link.href}
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 hover:underline transition-all"
                >
                  <span>•</span>
                  <span>{link.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
