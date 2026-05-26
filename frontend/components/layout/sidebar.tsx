"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, GitPullRequest, Users, GitBranch,
  Star, Home, Settings, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard",              icon: Home,          label: "Overview" },
  { href: "/dashboard/repositories", icon: GitBranch,     label: "Repositories" },
  { href: "/dashboard/developers",   icon: Users,         label: "Developers" },
  { href: "/dashboard/reviews",      icon: Star,          label: "Reviews" },
  { href: "/dashboard/pr-insights",  icon: GitPullRequest, label: "PR Insights" },
];

interface SidebarProps {
  org: string;
}

export function Sidebar({ org }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

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

      {org && (
        <div className="px-5 py-3 border-b border-slate-800">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Organization</p>
          <p className="text-slate-300 font-medium text-sm truncate">{org}</p>
        </div>
      )}

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={`${href}?org=${org}`}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === href
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-slate-800 space-y-1">
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
