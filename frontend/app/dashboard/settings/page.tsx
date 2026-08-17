"use client";

import { useEffect, useState } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { getUserSettings, updateUserSettings, verifyOpenAIKey } from "@/lib/api";
import { getUser } from "@/lib/auth";
import type { User, UserSettings } from "@/types";
import {
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ExternalLink,
  Cpu,
  Trash2,
  Save,
  Check,
  RefreshCw,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

function SettingsContent() {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; message: string } | null>(null);

  useEffect(() => {
    setUser(getUser());
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getUserSettings();
      setSettings(data);
      setSelectedModel(data.openai_model || "gpt-4o-mini");
      if (data.has_openai_key && data.openai_key_masked) {
        setApiKeyInput("");
      }
    } catch {
      toast.error("Failed to load user settings");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const keyToTest = apiKeyInput.trim();
    if (!keyToTest) {
      toast.warning("Please enter an OpenAI API key to verify.");
      return;
    }

    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await verifyOpenAIKey(keyToTest);
      setVerifyResult(res);
      if (res.valid) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Verification failed";
      setVerifyResult({ valid: false, message: msg });
      toast.error(msg);
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: { openai_api_key?: string | null; openai_model?: string } = {
        openai_model: selectedModel,
      };

      if (apiKeyInput.trim()) {
        payload.openai_api_key = apiKeyInput.trim();
      }

      const updated = await updateUserSettings(payload);
      setSettings(updated);
      setApiKeyInput("");
      setVerifyResult(null);
      toast.success("Settings saved successfully!");
    } catch (err: any) {
      toast.error("Failed to save settings: " + (err?.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveKey = async () => {
    if (!confirm("Are you sure you want to remove your saved OpenAI API key?")) return;
    setSaving(true);
    try {
      const updated = await updateUserSettings({ openai_api_key: "", openai_model: selectedModel });
      setSettings(updated);
      setApiKeyInput("");
      setVerifyResult(null);
      toast.info("OpenAI API key removed.");
    } catch {
      toast.error("Failed to remove key");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <Header title="Settings" org="" user={user} />

      <div className="flex-1 p-6 md:p-8 overflow-auto max-w-4xl space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Account &amp; AI Integration Settings
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure your personal OpenAI API credentials to power AI vulnerability assessments, repository health checks, and automated digests.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* OpenAI API Key Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      OpenAI API Key
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Used for scanning repository code, analyzing dependencies, and generating vulnerability scores.
                    </p>
                  </div>
                </div>

                {/* Status Indicator */}
                {settings?.has_openai_key ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Not Configured
                  </span>
                )}
              </div>

              {/* Masked Key Display if configured */}
              {settings?.has_openai_key && settings.openai_key_masked && !apiKeyInput && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-mono text-slate-700 dark:text-slate-300 font-semibold">
                      Current Key: {settings.openai_key_masked}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveKey}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-semibold px-2.5 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>
              )}

              {/* API Key Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  {settings?.has_openai_key ? "Update API Key (Optional)" : "Enter OpenAI API Key"}
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKeyInput}
                    onChange={(e) => {
                      setApiKeyInput(e.target.value);
                      setVerifyResult(null);
                    }}
                    placeholder={settings?.has_openai_key ? "Leave blank to keep existing key, or paste new sk-..." : "sk-..."}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pr-24 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title={showKey ? "Hide key" : "Show key"}
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {apiKeyInput.trim() && (
                      <button
                        type="button"
                        onClick={handleVerify}
                        disabled={verifying}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        {verifying ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Verify"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Verification Result Banner */}
              {verifyResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                    verifyResult.valid
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                      : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
                  }`}
                >
                  {verifyResult.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{verifyResult.message}</span>
                </div>
              )}

              {/* Model Selection */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  AI Model for Vulnerability Audits
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: "gpt-4o-mini",
                      name: "GPT-4o Mini",
                      desc: "Fast, cost-effective, high accuracy (Recommended)",
                    },
                    {
                      id: "gpt-4o",
                      name: "GPT-4o",
                      desc: "Deepest reasoning for complex multi-repo architectures",
                    },
                    {
                      id: "gpt-3.5-turbo",
                      name: "GPT-3.5 Turbo",
                      desc: "Standard legacy model for basic audits",
                    },
                  ].map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setSelectedModel(m.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        selectedModel === m.id
                          ? "bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/20"
                          : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          {m.name}
                        </span>
                        {selectedModel === m.id && (
                          <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 font-bold" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {m.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Information & Privacy Callout */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-indigo-950 dark:text-indigo-200">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>How GitAudit Uses Your OpenAI Key</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  Your API key is securely stored with encryption and used exclusively to perform repository vulnerability assessments, dependency audits, configuration reviews, and security health scoring on demand.
                </p>
                <div className="pt-1">
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-bold text-[11px]"
                  >
                    <span>Get an OpenAI API Key from OpenAI Platform</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Link
                  href="/dashboard/security"
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Go to Security Audits →</span>
                </Link>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm shadow-indigo-600/20 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Settings</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
