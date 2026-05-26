"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GitPullRequest, Users, GitBranch, Star, Home, LogOut, ChevronsUpDown, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Org } from "@/types";

const navItems = [
  { href: "/dashboard",              icon: Home,           label: "Overview",     requiresOrg: false },
  { href: "/dashboard/repositories", icon: GitBranch,      label: "Repositories", requiresOrg: true },
  { href: "/dashboard/developers",   icon: Users,          label: "Developers",   requiresOrg: true },
  { href: "/dashboard/reviews",      icon: Star,           label: "Reviews",      requiresOrg: true },
  { href: "/dashboard/pr-insights",  icon: GitPullRequest, label: "PR Insights",  requiresOrg: true },
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

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <aside className="w-60 shrink-0 bg-slate-900 flex flex-col border-r border-slate-800 min-h-screen">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-800">
        <GitBranch className="h-5 w-5 text-indigo-400" />
        <span className="text-white font-bold">CodePulse</span>
      </div>

      <div className="px-3 py-3 border-b border-slate-800">
        <div className="flex items-center justify-between px-2 mb-1.5">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Organization</p>
          {onRefreshOrgs && (
            <button
              onClick={async () => {
                setRefreshing(true);
                await onRefreshOrgs();
                setRefreshing(false);
              }}
              disabled={refreshing}
              title="Check for newly approved organizations"
              className="text-slate-600 hover:text-slate-300 transition-colors disabled:opacity-40"
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
              className="w-full appearance-none bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 text-sm font-medium rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-colors"
            >
              {orgs.map((o) => (
                <option key={o.login} value={o.login}>{o.login}</option>
              ))}
            </select>
            <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>
        ) : (
          <p className="text-slate-300 font-medium text-sm truncate px-1">{org}</p>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
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
                <Icon className="h-4 w-4" />
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
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
