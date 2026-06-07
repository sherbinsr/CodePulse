"use client";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { gitlabCallback } from "@/lib/api";
import { setToken, setUser } from "@/lib/auth";
import { toast } from "sonner";

const processedCodes = new Set<string>();

function GitLabCallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      toast.error("GitLab authorization was denied.");
      router.push("/");
      return;
    }

    if (!code) {
      toast.error("No authorization code received.");
      router.push("/");
      return;
    }

    if (processedCodes.has(code)) return;
    processedCodes.add(code);

    gitlabCallback(code)
      .then(({ access_token, user }) => {
        setToken(access_token);
        setUser(user);
        toast.success(`Welcome, ${user.name || user.login}!`);
        router.push("/dashboard");
      })
      .catch((err) => {
        processedCodes.delete(code);
        const msg = err?.response?.data?.detail ?? "GitLab authentication failed. Please try again.";
        toast.error(msg);
        router.push("/");
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-400 mx-auto mb-4" />
        <p className="text-slate-400">Authenticating with GitLab…</p>
      </div>
    </div>
  );
}

export default function GitLabCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-400" />
        </div>
      }
    >
      <GitLabCallbackHandler />
    </Suspense>
  );
}
