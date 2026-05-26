"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { getToken, logout } from "@/lib/auth";
import { listOrgs, triggerSync } from "@/lib/api";
import type { Org } from "@/types";
import { Suspense } from "react";

function DashboardInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlOrg = params.get("org") ?? "";
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [org, setOrg] = useState(urlOrg);
  const [loading, setLoading] = useState(true);

  // Sync org into URL whenever it changes
  useEffect(() => {
    if (!org) return;
    const current = params.get("org");
    if (current !== org) {
      router.replace(`${pathname}?org=${org}`);
    }
  }, [org]);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/"); return; }

    listOrgs()
      .then((data) => {
        setOrgs(data);
        if (urlOrg) {
          setOrg(urlOrg);
        } else if (data.length > 0) {
          setOrg(data[0].login);
        }
        setLoading(false);
      })
      .catch(() => {
        logout();
        router.push("/");
      });
  }, []);

  // Re-sync org state when URL changes (e.g. after "Check again" refreshes the org list)
  useEffect(() => {
    if (urlOrg && urlOrg !== org) {
      setOrg(urlOrg);
      listOrgs().then(setOrgs).catch(() => {});
    }
  }, [urlOrg]);

  const handleOrgChange = (newOrg: string) => {
    setOrg(newOrg);
    router.replace(`${pathname}?org=${newOrg}`);
    triggerSync(newOrg).catch(() => {}); // fire-and-forget; backend deduplicates if already running
  };

  const handleRefreshOrgs = async () => {
    try {
      const data = await listOrgs();
      setOrgs(data);
      // If a new org appeared and nothing is selected yet, auto-select it
      if (!org && data.length > 0) {
        handleOrgChange(data[0].login);
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const hasOrg = orgs.length > 0 && !!org;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar org={org} hasOrg={hasOrg} orgs={orgs} onOrgChange={handleOrgChange} onRefreshOrgs={handleRefreshOrgs} />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1">{children}</main>
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
