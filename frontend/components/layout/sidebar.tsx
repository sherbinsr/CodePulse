"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GitPullRequest, Users, GitBranch, Star, Home, LogOut, ChevronsUpDown, RefreshCw,
  FileText, Zap, GitCommit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";
import type { Org } from "@/types";

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  requiresOrg: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard",               icon: Home,           label: "Overview",       requiresOrg: false },
  { href: "/dashboard/repositories",  icon: GitBranch,      label: "Repositories",   requiresOrg: true },
  { href: "/dashboard/developers",    icon: Users,          label: "Developers",     requiresOrg: true },
  { href: "/dashboard/reviews",       icon: Star,           label: "Reviews",        requiresOrg: true },
  { href: "/dashboard/pr-insights",   icon: GitPullRequest, label: "PR Insights",    requiresOrg: true },
  { href: "/dashboard/ci-insights",   icon: Zap,            label: "CI Insights",    requiresOrg: true },
  { href: "/dashboard/commit-activity", icon: GitCommit,    label: "Commit Activity",requiresOrg: true },
  { href: "/dashboard/digest",        icon: FileText,       label: "Digest",         requiresOrg: true },
];

interface SidebarProps {
  org: string;
  hasOrg: boolean;
  orgs?: Org[];
  onOrgChange?: (org: string) => void;
  onRefreshOrgs?: () => Promise<void>;
}

export function Sidebar({ org, hasOrg, orgs = [], onOrgChange, onRefreshOrgs }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <>
      <aside className="w-64 shrink-0 bg-slate-900 flex flex-col border-r border-slate-800 h-screen sticky top-0 overflow-y-auto">

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-800 shrink-0">
          <div className="bg-indigo-600 rounded-lg p-1.5 shrink-0">
            <GitBranch className="h-4 w-4 text-white" />
          </div>
          <span className="text-white font-bold text-base tracking-tight">CodePulse</span>
        </div>

        {/* Organization section */}
        <div className="px-4 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Organization</span>
            {onRefreshOrgs && (
              <button
                onClick={async () => {
                  setRefreshing(true);
                  await onRefreshOrgs();
                  setRefreshing(false);
                }}
                disabled={refreshing}
                title="Check for newly approved organizations"
                className="text-slate-600 hover:text-slate-300 transition-colors disabled:opacity-40 p-0.5 rounded"
              >
                <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
              </button>
            )}
          </div>

          {orgs.length > 1 ? (
            <div className="relative">
              <select
                value={org}
                onChange={(e) => onOrgChange?.(e.target.value)}
                className="w-full appearance-none bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-100 text-sm font-medium rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-colors"
              >
                {orgs.map((o) => (
                  <option key={o.login} value={o.login}>{o.login}</option>
                ))}
              </select>
              <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>
          ) : (
            <p className="text-slate-100 text-sm font-medium truncate">{org || "—"}</p>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {navItems.map(({ href, icon: Icon, label, requiresOrg }) => {
            const disabled = requiresOrg && !hasOrg;
            const isActive = pathname === href;

            if (disabled) {
              return (
                <div
                  key={href}
                  title="Select an organization first"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 cursor-not-allowed select-none"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </div>
              );
            }

            return (
              <Link
                key={href}
                href={org ? `${href}?org=${org}` : href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-3 border-t border-slate-800 sticky bottom-0 bg-slate-900 shrink-0">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {showLogoutConfirm && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4">
            <div className="flex justify-center mb-4">
              <div className="bg-red-50 rounded-full p-3">
                <LogOut className="h-6 w-6 text-red-500" />
              </div>
            </div>
            <h3 className="text-slate-900 font-semibold text-center text-lg mb-1">Sign out?</h3>
            <p className="text-slate-500 text-sm text-center mb-6">
              You'll need to reconnect GitHub to access your analytics again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
