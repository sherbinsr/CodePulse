"use client";

import { useState, useEffect } from "react";
import { X, Copy, Check, Download, Sparkles, BookOpen, Layers, Key, RefreshCw } from "lucide-react";
import type { DocGenResponse } from "@/types";

interface DocGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  data: DocGenResponse | null;
  selectedRepoCount: number;
  onRegenerate?: (apiKey: string) => void;
}

export function DocGeneratorModal({
  isOpen,
  onClose,
  loading,
  error,
  data,
  selectedRepoCount,
  onRegenerate,
}: DocGeneratorModalProps) {
  const [activeTab, setActiveTab] = useState<number>(-1); // -1 = combined, 0..N = repo index
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("openai_api_key") || "";
    setApiKey(saved);
  }, []);

  if (!isOpen) return null;

  const currentMarkdown =
    data && (activeTab === -1 ? data.combined_markdown : data.docs[activeTab]?.markdown || "");

  const handleCopy = async () => {
    if (!currentMarkdown) return;
    try {
      await navigator.clipboard.writeText(currentMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = () => {
    if (!currentMarkdown || !data) return;
    const filename =
      activeTab === -1
        ? `${data.org}-documentation-suite.md`
        : `${data.docs[activeTab]?.repo_name || "repo"}-documentation.md`;

    const blob = new Blob([currentMarkdown], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleKeySaveAndRegenerate = () => {
    if (apiKey) {
      localStorage.setItem("openai_api_key", apiKey);
    } else {
      localStorage.removeItem("openai_api_key");
    }
    onRegenerate?.(apiKey);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden z-10">
        {/* Header */}
        <div className="flex flex-col border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Automated Documentation Generator
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedRepoCount > 0
                    ? `Generated for ${selectedRepoCount} selected ${selectedRepoCount === 1 ? "repository" : "repositories"}`
                    : "Generated for all organization repositories"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                title="Configure OpenAI API Key"
              >
                <Key className="h-3.5 w-3.5 text-indigo-500" />
                {apiKey ? "OpenAI Configured" : "Add OpenAI Key"}
              </button>

              {data && (
                <>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy Markdown"}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download .md
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* OpenAI API Key Drawer */}
          {showKeyInput && (
            <div className="px-6 py-3 bg-indigo-50/50 dark:bg-indigo-950/30 border-t border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center gap-2 flex-1 w-full">
                <Key className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <input
                  type="password"
                  placeholder="Enter OpenAI API Key (sk-...)"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                />
              </div>
              <button
                onClick={handleKeySaveAndRegenerate}
                className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 w-full sm:w-auto"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Generate with OpenAI
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="relative mb-4">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-indigo-600 animate-pulse" />
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
                Analyzing Codebase &amp; Synthesizing Documentation...
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                {apiKey
                  ? "Querying OpenAI API to generate AI-narrated technical architecture and documentation..."
                  : "Aggregating architecture details, engineering metrics, pull request history, and team contribution patterns."}
              </p>
            </div>
          )}

          {error && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-xl p-6 text-center max-w-md">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Documentation Generation Failed</p>
                <p className="text-xs text-red-600 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Sidebar Tabs */}
              <div className="w-64 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3 overflow-y-auto shrink-0 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  Documentation Views
                </p>
                <button
                  onClick={() => setActiveTab(-1)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-left ${
                    activeTab === -1
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                  }`}
                >
                  <Layers className="h-4 w-4 shrink-0" />
                  <span className="truncate">Combined Suite</span>
                </button>

                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-3 pb-1">
                  Individual Repos ({data.docs.length})
                </p>
                {data.docs.map((doc, idx) => (
                  <button
                    key={doc.repo_name}
                    onClick={() => setActiveTab(idx)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                      activeTab === idx
                        ? "bg-indigo-600 text-white shadow-sm font-semibold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                    }`}
                  >
                    <BookOpen className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{doc.repo_name}</span>
                  </button>
                ))}
              </div>

              {/* Markdown Display */}
              <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-slate-950 font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                <pre className="whitespace-pre-wrap break-words font-sans text-sm selection:bg-indigo-100 dark:selection:bg-indigo-900">
                  {currentMarkdown}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
