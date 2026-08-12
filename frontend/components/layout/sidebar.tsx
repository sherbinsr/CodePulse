"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GitPullRequest, Users, GitBranch, Star, Home, LogOut, ChevronsUpDown, RefreshCw,
  FileText, Zap, GitCommit, BookOpen, Kanban, Plus, Building, Trash2, X, Check, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout, getGitHubOAuthUrl } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";
import type { Org } from "@/types";
import { addOrg, deleteCustomOrg } from "@/lib/api";
import { ThemeToggle } from "@/components/layout/theme-toggle";

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  requiresOrg: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard",               icon: Home,           label: "Overview",       requiresOrg: false },
  { href: "/dashboard/projects",      icon: Kanban,         label: "Projects",       requiresOrg: true },
  { href: "/dashboard/repositories",  icon: GitBranch,      label: "Repositories",   requiresOrg: true },
  { href: "/dashboard/documentations",icon: BookOpen,       label: "Documentation",  requiresOrg: true },
  { href: "/dashboard/developers",    icon: Users,          label: "Developers",     requiresOrg: true },
  { href: "/dashboard/reviews",       icon: Star,           label: "Reviews",        requiresOrg: true },
  { href: "/dashboard/pr-insights",   icon: GitPullRequest, label: "PR Insights",    requiresOrg: true },
  { href: "/dashboard/ci-insights",   icon: Zap,            label: "CI Insights",    requiresOrg: true },
  { href: "/dashboard/commit-activity", icon: GitCommit,    label: "Commit Activity",requiresOrg: true },
  { href: "/dashboard/digest",        icon: FileText,       label: "Digest",         requiresOrg: true },
];

interface SidebarProps {
  org: string;
  provider?: "github" | "gitlab";
  hasOrg: boolean;
  orgs?: Org[];
  onOrgChange?: (org: string, provider: "github" | "gitlab") => void;
  onRefreshOrgs?: () => Promise<void>;
}

export function Sidebar({ org, provider = "github", hasOrg, orgs = [], onOrgChange, onRefreshOrgs }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Add Organization Modal State
  const [showAddOrgModal, setShowAddOrgModal] = useState(false);
  const [newOrgInput, setNewOrgInput] = useState("");
  const [newOrgProvider, setNewOrgProvider] = useState<"github" | "gitlab">("github");
  const [addingOrg, setAddingOrg] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleAddOrganizationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgInput.trim()) return;

    setAddingOrg(true);
    try {
      const created = await addOrg(newOrgInput.trim(), newOrgProvider);
      setShowAddOrgModal(false);
      setNewOrgInput("");
      if (onRefreshOrgs) await onRefreshOrgs();
      if (onOrgChange) onOrgChange(created.login, created.provider);
    } catch (err: any) {
      alert("Failed to add organization: " + (err?.response?.data?.detail || err.message));
    } finally {
      setAddingOrg(false);
    }
  };

  const handleDeleteOrg = async (login: string, prov: "github" | "gitlab") => {
    if (!confirm(`Are you sure you want to remove ${login}?`)) return;
    try {
      await deleteCustomOrg(login, prov);
      if (onRefreshOrgs) await onRefreshOrgs();
    } catch (err: any) {
      alert("Failed to remove organization: " + (err?.response?.data?.detail || err.message));
    }
  };

  return (
    <>
      <aside className="w-64 shrink-0 bg-slate-900 flex flex-col border-r border-slate-800 h-screen sticky top-0 overflow-y-auto">

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-800 shrink-0">
          <div className="bg-indigo-600 rounded-lg p-1.5 shrink-0">
            <GitBranch className="h-4 w-4 text-white" />
          </div>
          <span className="text-white font-bold text-base tracking-tight">GitAudit</span>
        </div>

        {/* Organization Section */}
        <div className="px-4 py-4 border-b border-slate-800 shrink-0 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Organization</span>
            <div className="flex items-center gap-1">
              {onRefreshOrgs && (
                <button
                  onClick={async () => {
                    setRefreshing(true);
                    await onRefreshOrgs();
                    setRefreshing(false);
                  }}
                  disabled={refreshing}
                  title="Check for newly approved organizations"
                  className="text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40 p-1 rounded hover:bg-slate-800"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                </button>
              )}
              <button
                onClick={() => setShowAddOrgModal(true)}
                title="Add multiple organizations"
                className="text-indigo-400 hover:text-indigo-300 transition-colors p-1 rounded hover:bg-slate-800 flex items-center gap-1 text-[11px] font-bold"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {orgs.length > 0 ? (
            <div className="space-y-1.5">
              <div className="relative">
                <select
                  value={`${org}:${provider}`}
                  onChange={(e) => {
                    const [login, prov] = e.target.value.split(":");
                    onOrgChange?.(login, prov as "github" | "gitlab");
                  }}
                  className="w-full appearance-none bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-100 text-xs font-semibold rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-colors"
                >
                  {orgs.map((o) => (
                    <option key={`${o.login}:${o.provider}`} value={`${o.login}:${o.provider}`}>
                      {o.login} {o.provider === "gitlab" ? "(GL)" : "(GH)"}
                    </option>
                  ))}
                </select>
                <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-slate-100 text-xs font-medium truncate">{org || "No org selected"}</p>
              <button
                onClick={() => setShowAddOrgModal(true)}
                className="text-[11px] text-indigo-400 font-bold hover:underline"
              >
                + Add Org
              </button>
            </div>
          )}

          {/* Quick Add Org Button */}
          <button
            onClick={() => setShowAddOrgModal(true)}
            className="w-full py-1.5 px-3 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500 text-slate-400 hover:text-indigo-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all bg-slate-800/40 hover:bg-indigo-950/30"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Organization
          </button>
        </div>

        {/* Navigation Bar */}
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

            const navHref = requiresOrg && org ? `${href}?org=${org}&provider=${provider}` : href;

            return (
              <Link
                key={href}
                href={navHref}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-600/10 text-indigo-400 font-semibold"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-indigo-400" : "text-slate-400")} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 shrink-0 space-y-2">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs text-slate-400 font-medium">Theme</span>
            <ThemeToggle />
          </div>

          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ADD ORGANIZATION MODAL */}
      {showAddOrgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setShowAddOrgModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                Add Organization / Account
              </h2>
              <button onClick={() => setShowAddOrgModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* GITHUB OAUTH AUTHORIZATION BUTTON & LINK */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-center">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                Authorize GitHub Organization Access
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Grant GitAudit permission to access your private or enterprise GitHub organizations via GitHub OAuth.
              </p>

              <button
                type="button"
                onClick={() => {
                  window.location.href = getGitHubOAuthUrl();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <GitBranch className="w-4 h-4 text-indigo-400" />
                <span>Authenticate & Authorize via GitHub OAuth</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <div className="pt-1">
                <a
                  href="https://github.com/settings/connections/applications"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-indigo-500 hover:underline inline-flex items-center gap-1"
                >
                  <span>Manage Granted Organizations on GitHub Settings</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* List of Custom Added Organizations */}
            {orgs.filter((o) => o.is_custom).length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
                  Added Organizations ({orgs.filter((o) => o.is_custom).length})
                </span>
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {orgs.filter((o) => o.is_custom).map((c) => (
                    <div key={c.login} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs">
                      <div className="flex items-center gap-2">
                        <img src={c.avatar_url || `https://github.com/${c.login}.png`} className="w-4 h-4 rounded-full" />
                        <span className="font-bold text-slate-900 dark:text-white">{c.login}</span>
                        <span className="text-[10px] text-slate-400">({c.provider})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteOrg(c.login, c.provider)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                        title="Remove custom organization"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddOrgModal(false)}
                className="px-5 py-2 text-xs font-bold bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout confirm modal */}
      {showLogoutConfirm &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
              <h3 className="text-lg font-bold text-white">Sign Out</h3>
              <p className="text-sm text-slate-400">Are you sure you want to sign out of GitAudit?</p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
