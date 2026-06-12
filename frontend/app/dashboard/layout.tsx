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
  const urlProvider = (params.get("provider") ?? "github") as "github" | "gitlab";
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [org, setOrg] = useState(urlOrg);
  const [provider, setProvider] = useState<"github" | "gitlab">(urlProvider);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    const currentOrg = params.get("org");
    const currentProvider = params.get("provider") ?? "github";
    if (currentOrg !== org || currentProvider !== provider) {
      router.replace(`${pathname}?org=${org}&provider=${provider}`);
    }
  }, [org, provider]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/"); return; }

    listOrgs()
      .then((data) => {
        setOrgs(data);
        if (urlOrg) {
          setOrg(urlOrg);
          setProvider(urlProvider);
        } else if (data.length > 0) {
          setOrg(data[0].login);
          setProvider(data[0].provider as "github" | "gitlab");
        }
        setLoading(false);
      })
      .catch(() => {
        logout();
        router.push("/");
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (urlOrg && (urlOrg !== org || urlProvider !== provider)) {
      setOrg(urlOrg);
      setProvider(urlProvider);
      listOrgs().then(setOrgs).catch(() => {});
    }
  }, [urlOrg, urlProvider]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOrgChange = (newOrg: string, newProvider: "github" | "gitlab" = "github") => {
    setOrg(newOrg);
    setProvider(newProvider);
    router.replace(`${pathname}?org=${newOrg}&provider=${newProvider}`);
    triggerSync(newOrg, newProvider).catch(() => {});
  };

  const handleRefreshOrgs = async () => {
    try {
      const data = await listOrgs();
      setOrgs(data);
      if (!org && data.length > 0) {
        handleOrgChange(data[0].login, data[0].provider as "github" | "gitlab");
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const hasOrg = orgs.length > 0 && !!org;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar
        org={org}
        provider={provider}
        hasOrg={hasOrg}
        orgs={orgs}
        onOrgChange={handleOrgChange}
        onRefreshOrgs={handleRefreshOrgs}
      />
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
