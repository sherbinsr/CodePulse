"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { getToken, getUser, logout } from "@/lib/auth";
import { listOrgs } from "@/lib/api";
import type { Org, User } from "@/types";
import { Suspense } from "react";

function DashboardInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [org, setOrg] = useState(params.get("org") ?? "");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/"); return; }

    const u = getUser();
    setUser(u);

    listOrgs()
      .then((data) => {
        setOrgs(data);
        if (!org && data.length > 0) setOrg(data[0].login);
        setLoading(false);
      })
      .catch(() => {
        logout();
        router.push("/");
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar org={org} />
      <div className="flex-1 flex flex-col">
        {/* Org selector bar */}
        {orgs.length > 1 && (
          <div className="flex items-center gap-2 bg-slate-800 px-6 py-2">
            <span className="text-slate-400 text-xs">Organization:</span>
            <select
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              className="bg-slate-700 text-white text-sm rounded px-2 py-1 border border-slate-600"
            >
              {orgs.map((o) => (
                <option key={o.login} value={o.login}>{o.login}</option>
              ))}
            </select>
          </div>
        )}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    }>
      <DashboardInner>{children}</DashboardInner>
    </Suspense>
  );
}
