"use client";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { googleCallback } from "@/lib/api";
import { setToken, setUser } from "@/lib/auth";
import { toast } from "sonner";

const processedCodes = new Set<string>();

function GoogleCallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      toast.error("Google authorization was denied.");
      router.push("/");
      return;
    }

    if (!code) {
      toast.error("No authorization code received from Google.");
      router.push("/");
      return;
    }

    if (processedCodes.has(code)) return;
    processedCodes.add(code);

    googleCallback(code)
      .then(({ access_token, user }) => {
        setToken(access_token);
        setUser(user);
        toast.success(`Welcome, ${user.name || user.login}!`);
        window.location.href = "/dashboard";
      })
      .catch((err) => {
        processedCodes.delete(code);
        const msg = typeof err?.response?.data === "string"
          ? err.response.data
          : (err?.response?.data?.detail ?? "Google authentication failed. Please try again.");
        toast.error(msg);
        router.push("/");
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400 mx-auto" />
        <p className="text-slate-400 text-sm font-medium">Authenticating with Google…</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400" />
      </div>
    }>
      <GoogleCallbackHandler />
    </Suspense>
  );
}
