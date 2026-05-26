"use client";
import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { githubCallback } from "@/lib/api";
import { setToken, setUser } from "@/lib/auth";
import { toast } from "sonner";
import { Suspense } from "react";

function CallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      toast.error("GitHub authorization was denied.");
      router.push("/");
      return;
    }
    if (!code) {
      toast.error("No authorization code received.");
      router.push("/");
      return;
    }

    githubCallback(code)
      .then(({ access_token, user }) => {
        setToken(access_token);
        setUser(user);
        toast.success(`Welcome, ${user.name || user.login}!`);
        router.push("/dashboard");
      })
      .catch(() => {
        toast.error("Authentication failed. Please try again.");
        router.push("/");
      });
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400 mx-auto mb-4" />
        <p className="text-slate-400">Authenticating with GitHub…</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
