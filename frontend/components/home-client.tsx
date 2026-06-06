"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, getGitHubOAuthUrl } from "@/lib/auth";
import { GitBranch, BarChart3, Users, Clock, Zap } from "lucide-react";

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
  </svg>
);

const FEATURES = [
  { icon: BarChart3, label: "PR Analytics", desc: "Per-dev & per-repo breakdowns" },
  { icon: Users, label: "Leaderboards", desc: "Top contributors & reviewers" },
  { icon: Clock, label: "Review Time", desc: "Average time to first review" },
  { icon: GitBranch, label: "Merge Trends", desc: "Monthly velocity charts" },
  { icon: Zap, label: "CI Insights", desc: "Build success rates & durations" },
];

export default function HomeClient() {
  const router = useRouter();

  useEffect(() => {
    if (getToken()) router.push("/dashboard");
  }, [router]);

  const handleLogin = () => {
    window.location.href = getGitHubOAuthUrl();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <header>
        <nav
          className="flex items-center justify-between px-8 py-4"
          aria-label="Main navigation"
        >
          <a href="/" className="flex items-center gap-2" aria-label="CodePulse home">
            <GitBranch className="h-6 w-6 text-indigo-400" aria-hidden="true" />
            <span className="text-white font-bold text-xl">CodePulse</span>
          </a>
          <button
            onClick={handleLogin}
            className="flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-lg font-medium hover:bg-slate-100 transition-colors"
            aria-label="Connect your GitHub account"
          >
            <GitHubIcon className="h-4 w-4" />
            Connect GitHub
          </button>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full px-4 py-1 text-sm font-medium mb-6">
            Engineering Productivity Platform
          </div>

          <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
            Ship faster with
            <br />
            <span className="text-indigo-400">deep PR insights</span>
          </h1>

          <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">
            Connect your GitHub organization and get instant analytics on pull requests,
            code reviews, developer performance, and team velocity — all in one dashboard.
          </p>

          <button
            onClick={handleLogin}
            className="inline-flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg shadow-indigo-500/25"
            aria-label="Get started by connecting your GitHub account"
          >
            <GitHubIcon className="h-5 w-5" />
            Get Started with GitHub
          </button>
        </div>

        <section
          aria-label="Platform features"
          className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-20 max-w-4xl w-full"
        >
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <article
              key={label}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 text-left"
            >
              <Icon className="h-6 w-6 text-indigo-400 mb-3" aria-hidden="true" />
              <h2 className="text-white font-semibold text-sm mb-1">{label}</h2>
              <p className="text-slate-400 text-xs">{desc}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
