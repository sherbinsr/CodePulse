"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  BookOpen, Search, Plus, Edit3, Trash2, Eye, Download, FileText, CheckCircle2,
  AlertCircle, Cloud, ArrowUpDown, Filter, Sparkles, X, Upload, Code2, RefreshCw, FileCode, Layers
} from "lucide-react";
import { getDocumentationRepos, getDocumentationContent, createDocumentation, uploadDocumentationFile, updateDocumentation, deleteDocumentation } from "@/lib/api";
import type { RepositoryWithDocs, Documentation } from "@/types";
import { cn } from "@/lib/utils";
import { MarkdownViewer } from "@/components/documentation/markdown-viewer";


// Templates for quick doc generation
const DOC_TEMPLATES = [
  {
    name: "Standard README",
    fileName: "README.md",
    content: `# Repository Documentation

## Overview
This repository provides core engineering services and APIs for the project.

## Quick Start
\`\`\`bash
# Install dependencies
npm install

# Run dev server
npm run dev
\`\`\`

## Architecture & Features
- **Frontend**: Next.js & React
- **Backend**: FastAPI & PostgreSQL
- **Storage**: AWS S3 Bucket
`,
  },
  {
    name: "Architecture Overview",
    fileName: "ARCHITECTURE.md",
    content: `# System Architecture & Design

## Overview
Detailed breakdown of system modules, dataflow pipelines, and integration points.

## Components
1. **API Router Layer**: Handles authentication, CORS, rate limits.
2. **Business Services**: Processes repository analytics and S3 file operations.
3. **Database & S3**: Persistent storage for metrics and technical specifications.

## Data Flow
\`\`\`
User Client ---> FastAPI backend ---> S3 Storage Bucket (Docs)
\`\`\`
`,
  },
  {
    name: "API Specification",
    fileName: "API.md",
    content: `# API Endpoint Documentation

## Endpoints

### 1. List Repositories with Docs
\`GET /api/documentations?org={org}\`

### 2. Upload Documentation to S3
\`POST /api/documentations/repo/{repo_id}\`

### 3. Update Existing Doc
\`PUT /api/documentations/{doc_id}\`
`,
  },
];

export default function DocumentationsPage() {
  const searchParams = useSearchParams();
  const org = searchParams.get("org") ?? "";
  const provider = (searchParams.get("provider") ?? "github") as "github" | "gitlab";

  const [repos, setRepos] = useState<RepositoryWithDocs[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "documented" | "missing">("all");
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "status" | "stars">("status");

  // Modal states
  const [activeModalRepo, setActiveModalRepo] = useState<RepositoryWithDocs | null>(null);
  const [editDocTarget, setEditDocTarget] = useState<Documentation | null>(null);
  const [modalTab, setModalTab] = useState<"editor" | "upload">("editor");

  // Form states
  const [docFileName, setDocFileName] = useState("README.md");
  const [docContent, setDocContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // View modal state
  const [viewDoc, setViewDoc] = useState<{ doc: Documentation; content: string } | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewModalTab, setViewModalTab] = useState<"preview" | "raw">("preview");

  // Markdown Editor mode state
  const [editorViewMode, setEditorViewMode] = useState<"write" | "preview" | "split">("split");


  // Delete modal state
  const [deleteDocTarget, setDeleteDocTarget] = useState<Documentation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRepos = async () => {
    if (!org) return;
    try {
      setError(null);
      const data = await getDocumentationRepos(org, provider);
      setRepos(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load repository documentations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchRepos();
  }, [org, provider]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRepos();
  };

  // Open modal for creating new doc
  const handleOpenAddModal = (repo: RepositoryWithDocs) => {
    setActiveModalRepo(repo);
    setEditDocTarget(null);
    setDocFileName(`${repo.name.toUpperCase()}-README.md`);
    setDocContent(
      `# ${repo.name} Documentation\n\n## Description\n${repo.description || "Project documentation stored in S3."}\n\n## Getting Started\nInsert setup and technical guidelines here.\n`
    );
    setSelectedFile(null);
    setFormError(null);
    setModalTab("editor");
  };

  // Open modal for editing existing doc
  const handleOpenEditModal = async (repo: RepositoryWithDocs, doc: Documentation) => {
    setActiveModalRepo(repo);
    setEditDocTarget(doc);
    setDocFileName(doc.file_name);
    setFormError(null);
    setModalTab("editor");
    setSelectedFile(null);

    // Fetch full content if missing
    if (doc.content) {
      setDocContent(doc.content);
    } else {
      try {
        const fullContent = await getDocumentationContent(doc.id);
        setDocContent(fullContent);
      } catch {
        setDocContent("# Failed to load file content from S3.");
      }
    }
  };

  // Handle Save Doc (Editor or Upload)
  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalRepo) return;

    setSubmitting(true);
    setFormError(null);

    try {
      if (modalTab === "editor") {
        if (!docFileName.trim()) {
          throw new Error("File name is required");
        }
        if (!docContent.trim()) {
          throw new Error("Documentation content cannot be empty");
        }

        if (editDocTarget) {
          await updateDocumentation(editDocTarget.id, {
            file_name: docFileName,
            content: docContent,
          });
        } else {
          await createDocumentation(activeModalRepo.id, {
            file_name: docFileName,
            file_type: docFileName.endsWith(".md") ? "markdown" : "doc",
            content: docContent,
          });
        }
      } else {
        // Upload file mode
        if (!selectedFile) {
          throw new Error("Please choose a file to upload");
        }
        await uploadDocumentationFile(activeModalRepo.id, selectedFile);
      }

      setActiveModalRepo(null);
      await fetchRepos();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || err?.message || "Failed to save documentation to S3.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle View Doc
  const handleViewDoc = async (doc: Documentation) => {
    setViewLoading(true);
    try {
      const content = doc.content || (await getDocumentationContent(doc.id));
      setViewDoc({ doc, content });
    } catch {
      setViewDoc({ doc, content: "Error: Unable to fetch document from S3 bucket." });
    } finally {
      setViewLoading(false);
    }
  };

  // Handle Delete Doc
  const handleDeleteDocConfirm = async () => {
    if (!deleteDocTarget) return;
    setDeleting(true);
    try {
      await deleteDocumentation(deleteDocTarget.id);
      setDeleteDocTarget(null);
      await fetchRepos();
    } catch (err: any) {
      alert("Failed to delete documentation: " + (err?.response?.data?.detail || err.message));
    } finally {
      setDeleting(false);
    }
  };

  // Derived metrics
  const totalRepos = repos.length;
  const documentedRepos = repos.filter((r) => r.has_documentation).length;
  const missingRepos = totalRepos - documentedRepos;


  // Filtered & Sorted Repositories
  const filteredRepos = useMemo(() => {
    return repos
      .filter((repo) => {
        const matchesQuery =
          repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (repo.language && repo.language.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesQuery) return false;

        if (statusFilter === "documented") return repo.has_documentation;
        if (statusFilter === "missing") return !repo.has_documentation;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name_asc") return a.name.localeCompare(b.name);
        if (sortBy === "name_desc") return b.name.localeCompare(a.name);
        if (sortBy === "stars") return b.stars - a.stars;
        if (sortBy === "status") {
          if (a.has_documentation === b.has_documentation) {
            return a.name.localeCompare(b.name);
          }
          return a.has_documentation ? -1 : 1;
        }
        return 0;
      });
  }, [repos, searchQuery, statusFilter, sortBy]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Repository Documentation
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <FileText className="w-3.5 h-3.5" />
              Documentation Hub
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage, write, and store technical documentations & Markdown specs for <strong className="text-slate-700 dark:text-slate-200">{org}</strong> ({provider.toUpperCase()}).
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm"
        >
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          Refresh Repos
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Repositories</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{totalRepos}</span>
            <span className="text-xs text-slate-500">synced in {org}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Documented</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{documentedRepos}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              ({totalRepos > 0 ? Math.round((documentedRepos / totalRepos) * 100) : 0}%)
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Missing Docs</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">{missingRepos}</span>
            <span className="text-xs text-slate-500">needs docs</span>
          </div>
        </div>
      </div>



      {/* Control Bar: Search & Sort */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search repositories by name or language..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          />
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                statusFilter === "all"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              All ({repos.length})
            </button>
            <button
              onClick={() => setStatusFilter("documented")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                statusFilter === "documented"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Documented ({documentedRepos})
            </button>
            <button
              onClick={() => setStatusFilter("missing")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                statusFilter === "missing"
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Missing ({missingRepos})
            </button>
          </div>

          {/* Sort Selector */}
          <div className="relative">
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="status">Documentation Status</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
                <option value="stars">Stars Count</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Repository List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3" />
          <p className="text-sm text-slate-500">Loading repositories and documentation records...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-2xl text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">{error}</p>
          <button
            onClick={fetchRepos}
            className="mt-3 px-4 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry Loading
          </button>
        </div>
      ) : filteredRepos.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">No repositories found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {searchQuery || statusFilter !== "all"
              ? "No repositories match your current search or filter criteria. Try resetting filters."
              : "No repositories synced yet for this organization. Please sync organization repositories from the overview."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRepos.map((repo) => (
            <div
              key={repo.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm hover:border-indigo-500/40 dark:hover:border-indigo-500/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
              {/* Left Side: Repository Info */}
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                    <FileCode className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
                      {repo.name}
                      <span className="text-xs font-normal text-slate-400">({repo.owner})</span>
                    </h3>
                  </div>

                  {repo.language && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      {repo.language}
                    </span>
                  )}

                  <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                    repo.has_documentation
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  )}>
                    {repo.has_documentation ? "Documented" : "Missing Docs"}
                  </span>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                  {repo.description || "No description provided."}
                </p>

                {/* Docs Pill List */}
                {repo.documentations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs font-medium text-slate-400">Docs:</span>
                    {repo.documentations.map((doc) => (
                      <span
                        key={doc.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      >
                        <FileText className="w-3 h-3 text-indigo-500" />
                        {doc.file_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Side: Options & Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                {repo.has_documentation && repo.documentations.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {repo.documentations.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        {/* View Button */}
                        <button
                          onClick={() => handleViewDoc(doc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                          title="View Documentation"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEditModal(repo, doc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-200/70 dark:bg-slate-700/70 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                          title="Edit Documentation"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => setDeleteDocTarget(doc)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                          title="Delete Documentation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Add Additional Doc Button */}
                    <button
                      onClick={() => handleOpenAddModal(repo)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-dashed border-indigo-400 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Doc
                    </button>
                  </div>
                ) : (
                  /* No Doc yet -> Add Documentation Options */
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenAddModal(repo)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Plus className="w-4 h-4" />
                      Add Documentation
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT DOCUMENTATION MODAL */}
      {activeModalRepo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setActiveModalRepo(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-[98vw] h-[96vh] max-h-[96vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  {editDocTarget ? `Edit Documentation (${editDocTarget.file_name})` : `Add Documentation to ${activeModalRepo.name}`}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Content will be saved and synchronized directly.
                </p>
              </div>
              <button
                onClick={() => setActiveModalRepo(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveDoc} className="flex-1 flex flex-col overflow-hidden p-6 space-y-5">
              {/* Tab Selector: Editor vs Upload */}
              {!editDocTarget && (
                <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setModalTab("editor")}
                    className={cn(
                      "flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all",
                      modalTab === "editor"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400"
                    )}
                  >
                    <Code2 className="w-4 h-4" />
                    Write Markdown Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab("upload")}
                    className={cn(
                      "flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all",
                      modalTab === "upload"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400"
                    )}
                  >
                    <Upload className="w-4 h-4" />
                    Upload File (.md, .doc, .docx)
                  </button>
                </div>
              )}

              {formError && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-medium rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {modalTab === "editor" ? (
                <div className="flex-1 flex flex-col space-y-4 min-h-0">
                  {/* File Name & View Mode Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Documentation File Name (.md or .doc)
                      </label>
                      <input
                        type="text"
                        value={docFileName}
                        onChange={(e) => setDocFileName(e.target.value)}
                        placeholder="e.g. README.md, ARCHITECTURE.md, API.doc"
                        required
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Mode Switcher: Write / Preview / Split */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setEditorViewMode("write")}
                        className={cn(
                          "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                          editorViewMode === "write"
                            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        )}
                      >
                        Write
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorViewMode("preview")}
                        className={cn(
                          "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1",
                          editorViewMode === "preview"
                            ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        )}
                      >
                        <Eye className="w-3 h-3" />
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorViewMode("split")}
                        className={cn(
                          "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all hidden md:block",
                          editorViewMode === "split"
                            ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        )}
                      >
                        Split View
                      </button>
                    </div>
                  </div>

                  {/* Quick Templates */}
                  {!editDocTarget && (
                    <div>
                      <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        Quick Insert Templates:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {DOC_TEMPLATES.map((tmpl) => (
                          <button
                            key={tmpl.name}
                            type="button"
                            onClick={() => {
                              setDocFileName(tmpl.fileName);
                              setDocContent(tmpl.content);
                            }}
                            className="px-3 py-1 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
                          >
                            + {tmpl.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dynamic Editor Content (Write / Preview / Split) */}
                  <div className="flex-1 min-h-[300px] flex flex-col md:flex-row gap-4 overflow-hidden">
                    {/* Write Textarea */}
                    {(editorViewMode === "write" || editorViewMode === "split") && (
                      <div className="flex-1 flex flex-col min-h-0">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Markdown Editor
                        </label>
                        <textarea
                          value={docContent}
                          onChange={(e) => setDocContent(e.target.value)}
                          placeholder="# Write markdown documentation here..."
                          rows={12}
                          className="w-full flex-1 p-4 text-xs font-mono bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
                        />
                      </div>
                    )}

                    {/* Live Preview Panel */}
                    {(editorViewMode === "preview" || editorViewMode === "split") && (
                      <div className="flex-1 flex flex-col min-h-0 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                          <span className="flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-indigo-500" />
                            Live Markdown Preview
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">Real-time</span>
                        </div>
                        <div className="p-5 flex-1 overflow-y-auto min-h-0">
                          {docContent.trim() ? (
                            <MarkdownViewer content={docContent} />
                          ) : (
                            <div className="text-center py-12 text-slate-400 text-xs italic">
                              Start typing markdown on the left to see live preview...
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Upload File Tab */
                <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 p-8 text-center space-y-4">
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-950/60 rounded-full text-indigo-600 dark:text-indigo-400">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                      Choose Markdown or Document File
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Supports <code className="text-indigo-600 font-mono">.md</code>, <code className="text-indigo-600 font-mono">.doc</code>, <code className="text-indigo-600 font-mono">.docx</code>, <code className="text-indigo-600 font-mono">.pdf</code>, <code className="text-indigo-600 font-mono">.txt</code>
                    </p>
                  </div>

                  <input
                    type="file"
                    accept=".md,.doc,.docx,.pdf,.txt"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="block text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                  />

                  {selectedFile && (
                    <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-lg">
                      Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                    </div>
                  )}
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModalRepo(null)}
                  className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Save Documentation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DOCUMENTATION MODAL */}
      {viewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setViewDoc(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-[98vw] h-[96vh] max-h-[96vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white font-mono flex items-center gap-2">
                    {viewDoc.doc.file_name}
                    <span className="text-xs font-normal text-slate-400 font-sans">
                      ({viewDoc.doc.file_type})
                    </span>
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* View Mode Toggle: Preview vs Raw */}
                <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl mr-2">
                  <button
                    onClick={() => setViewModalTab("preview")}
                    className={cn(
                      "px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                      viewModalTab === "preview"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    )}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Rendered Preview
                  </button>
                  <button
                    onClick={() => setViewModalTab("raw")}
                    className={cn(
                      "px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                      viewModalTab === "raw"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    )}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    Raw Source
                  </button>
                </div>

                <button
                  onClick={() => {
                    const blob = new Blob([viewDoc.content], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = viewDoc.doc.file_name;
                    a.click();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button
                  onClick={() => setViewDoc(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body: Rendered Preview or Raw Source */}
            {viewModalTab === "preview" ? (
              <div className="p-8 flex-1 overflow-y-auto bg-white dark:bg-slate-950">
                <MarkdownViewer content={viewDoc.content} />
              </div>
            ) : (
              <div className="p-6 flex-1 overflow-y-auto bg-slate-950 font-mono text-xs text-slate-200 space-y-4">
                <pre className="whitespace-pre-wrap leading-relaxed">{viewDoc.content}</pre>
              </div>
            )}
          </div>
        </div>
      )}


      {/* DELETE CONFIRMATION MODAL */}
      {deleteDocTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setDeleteDocTarget(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-md text-center space-y-4">
            <div className="p-3 bg-red-50 dark:bg-red-950/50 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete Documentation?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to remove <strong className="font-mono">{deleteDocTarget.file_name}</strong>?
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteDocTarget(null)}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDocConfirm}
                disabled={deleting}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
