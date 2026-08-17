"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Kanban, Search, Plus, Edit3, Trash2, Eye, Download, FileText, CheckCircle2,
  AlertCircle, Cloud, ArrowUpDown, Filter, Sparkles, X, Upload, Code2, RefreshCw,
  GitPullRequest, GitCommit, MessageSquare, ExternalLink, User as UserIcon, Tag,
  Clock, CheckSquare, Square, Layers, MoreHorizontal, ChevronRight, UserPlus,
  GitBranch, FolderPlus, Settings, CheckCircle, BarChart3, ListTodo, Sliders, Check, Send
} from "lucide-react";

import {
  getRepoStats, getDocumentationRepos, getRepoProjects, createRepoProject,
  updateRepoProject, deleteRepoProject, getRepoProjectBoard, createProjectTask,
  updateProjectTask, deleteProjectTask, getDeveloperStats, getIssueTimelineDetails, addIssueComment, triggerSync
} from "@/lib/api";
import type {
  RepoStat, RepoProject, ProjectTask, RepoProjectBoard, ProjectColumnOption, DeveloperStat, IssueTimelineDetails
} from "@/types";
import { MarkdownViewer } from "@/components/documentation/markdown-viewer";
import { cn } from "@/lib/utils";

// Preset Selectable Labels with distinct color tokens
const PRESET_LABELS = [
  { name: "bug", style: "bg-rose-500/10 text-rose-600 border-rose-500/30 dark:bg-rose-950/50 dark:text-rose-400" },
  { name: "feature", style: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30 dark:bg-indigo-950/50 dark:text-indigo-400" },
  { name: "enhancement", style: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-400" },
  { name: "documentation", style: "bg-sky-500/10 text-sky-600 border-sky-500/30 dark:bg-sky-950/50 dark:text-sky-400" },
  { name: "refactor", style: "bg-purple-500/10 text-purple-600 border-purple-500/30 dark:bg-purple-950/50 dark:text-purple-400" },
  { name: "security", style: "bg-red-500/10 text-red-600 border-red-500/30 dark:bg-red-950/50 dark:text-red-400" },
  { name: "frontend", style: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-400" },
  { name: "backend", style: "bg-teal-500/10 text-teal-600 border-teal-500/30 dark:bg-teal-950/50 dark:text-teal-400" },
  { name: "high-priority", style: "bg-pink-500/10 text-pink-600 border-pink-500/30 dark:bg-pink-950/50 dark:text-pink-400" },
];

export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const org = searchParams.get("org") ?? "";

  // Organization Repositories & Synced Developers
  const [repos, setRepos] = useState<RepoStat[]>([]);
  const [selectedRepoName, setSelectedRepoName] = useState<string>("");
  const [developers, setDevelopers] = useState<DeveloperStat[]>([]);

  // Repository Projects State
  const [repoProjects, setRepoProjects] = useState<RepoProject[]>([]);
  const [selectedRepoProjectId, setSelectedRepoProjectId] = useState<number | null>(null);
  const [repoBoard, setRepoBoard] = useState<RepoProjectBoard | null>(null);
  const [loadingRepoProjects, setLoadingRepoProjects] = useState(false);
  const [loadingRepoBoard, setLoadingRepoBoard] = useState(false);

  // Modals for Repo Projects
  const [showCreateRepoProjectModal, setShowCreateRepoProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newKeyPrefix, setNewKeyPrefix] = useState("");
  const [creatingRepoProject, setCreatingRepoProject] = useState(false);

  // Custom Columns Manager Modal
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [editProjName, setEditProjName] = useState("");
  const [editProjDesc, setEditProjDesc] = useState("");
  const [editKeyPrefix, setEditKeyPrefix] = useState("");
  const [editColumns, setEditColumns] = useState<ProjectColumnOption[]>([]);
  const [newColName, setNewColName] = useState("");

  // Create Task Modal State
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");
  const [taskStoryPoints, setTaskStoryPoints] = useState(1);

  // Synced Assignees & Selectable Labels State
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [customLabelInput, setCustomLabelInput] = useState("");
  const [customAssigneeInput, setCustomAssigneeInput] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);

  // Selected Task Drawer & Linked Timeline Details
  const [activeTask, setActiveTask] = useState<ProjectTask | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState("");
  const [editingTaskDesc, setEditingTaskDesc] = useState("");
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [taskDetails, setTaskDetails] = useState<IssueTimelineDetails | null>(null);
  const [loadingTaskDetails, setLoadingTaskDetails] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Drag and Drop State
  const [draggedCardId, setDraggedCardId] = useState<number | null>(null);
  const [dragOverColName, setDragOverColName] = useState<string | null>(null);

  // Manual Refresh for PRs, Issues & Board
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      if (org) {
        await triggerSync(org);
      }
      if (selectedRepoName) {
        await fetchRepoProjects(selectedRepoName);
      }
      if (selectedRepoProjectId) {
        await fetchRepoBoard(selectedRepoProjectId);
      }
      if (activeTask && activeTask.issue) {
        const details = await getIssueTimelineDetails(
          activeTask.issue.owner,
          activeTask.issue.repo_name,
          activeTask.issue.number
        );
        setTaskDetails(details);
      }
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load Org Repos & Developers
  useEffect(() => {
    if (!org) return;

    Promise.all([
      getRepoStats(org).catch(() => []),
      getDocumentationRepos(org).catch(() => []),
    ]).then(([repoStats, docRepos]) => {
      const map = new Map<string, RepoStat>();
      for (const r of repoStats) {
        map.set(r.name, r);
      }
      for (const dr of docRepos) {
        if (!map.has(dr.name)) {
          map.set(dr.name, {
            repo: dr.full_name,
            name: dr.name,
            total_prs: 0,
            merged_prs: 0,
            open_prs: 0,
            merge_rate: 0,
            avg_merge_hours: null,
            avg_review_hours: null,
            contributors: 0,
          });
        }
      }
      const combined = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
      setRepos(combined);
      if (combined.length > 0 && !selectedRepoName) {
        setSelectedRepoName(combined[0].name);
      }
    });

    getDeveloperStats(org)
      .then((devs) => setDevelopers(devs))
      .catch(() => {});
  }, [org]);

  // Load Built-in Projects for Selected Repo
  const fetchRepoProjects = async (repoName: string) => {
    if (!org || !repoName) return;
    setLoadingRepoProjects(true);
    try {
      const data = await getRepoProjects(org, repoName);
      setRepoProjects(data);
      if (data.length > 0) {
        setSelectedRepoProjectId(data[0].id);
      } else {
        setSelectedRepoProjectId(null);
        setRepoBoard(null);
      }
    } catch {
      setRepoProjects([]);
    } finally {
      setLoadingRepoProjects(false);
    }
  };

  useEffect(() => {
    if (selectedRepoName) {
      fetchRepoProjects(selectedRepoName);
    }
  }, [org, selectedRepoName]);

  // Load Board for Selected Repo Project
  const fetchRepoBoard = async (projectId: number) => {
    setLoadingRepoBoard(true);
    try {
      const data = await getRepoProjectBoard(projectId);
      setRepoBoard(data);
    } catch {
      setRepoBoard(null);
    } finally {
      setLoadingRepoBoard(false);
    }
  };

  useEffect(() => {
    if (selectedRepoProjectId) {
      fetchRepoBoard(selectedRepoProjectId);
    }
  }, [selectedRepoProjectId]);

  // Fetch Linked PRs and Timeline details when activeTask is opened
  useEffect(() => {
    if (activeTask && activeTask.issue) {
      setLoadingTaskDetails(true);
      getIssueTimelineDetails(activeTask.issue.owner, activeTask.issue.repo_name, activeTask.issue.number)
        .then((data) => setTaskDetails(data))
        .catch(() => setTaskDetails(null))
        .finally(() => setLoadingTaskDetails(false));
    } else {
      setTaskDetails(null);
    }
  }, [activeTask]);

  // Toggle Label Selection
  const handleToggleLabel = (labelName: string) => {
    if (selectedLabels.includes(labelName)) {
      setSelectedLabels(selectedLabels.filter((l) => l !== labelName));
    } else {
      setSelectedLabels([...selectedLabels, labelName]);
    }
  };

  const handleAddCustomLabel = () => {
    if (!customLabelInput.trim()) return;
    const trimmed = customLabelInput.trim().toLowerCase();
    if (!selectedLabels.includes(trimmed)) {
      setSelectedLabels([...selectedLabels, trimmed]);
    }
    setCustomLabelInput("");
  };

  // Toggle Assignee Selection
  const handleToggleAssignee = (login: string) => {
    if (selectedAssignees.includes(login)) {
      setSelectedAssignees(selectedAssignees.filter((a) => a !== login));
    } else {
      setSelectedAssignees([...selectedAssignees, login]);
    }
  };

  const handleAddCustomAssignee = () => {
    if (!customAssigneeInput.trim()) return;
    const trimmed = customAssigneeInput.trim().replace(/^@/, "");
    if (!selectedAssignees.includes(trimmed)) {
      setSelectedAssignees([...selectedAssignees, trimmed]);
    }
    setCustomAssigneeInput("");
  };

  // Handle Create Repo Project
  const handleCreateRepoProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org || !selectedRepoName || !newProjectName.trim()) return;

    setCreatingRepoProject(true);
    try {
      const created = await createRepoProject(org, selectedRepoName, {
        name: newProjectName,
        description: newProjectDesc,
        key_prefix: newKeyPrefix.trim().toUpperCase() || undefined,
      });
      setShowCreateRepoProjectModal(false);
      setNewProjectName("");
      setNewProjectDesc("");
      setNewKeyPrefix("");
      await fetchRepoProjects(selectedRepoName);
      setSelectedRepoProjectId(created.id);
    } catch (err: any) {
      alert("Failed to create project: " + (err?.response?.data?.detail || err.message));
    } finally {
      setCreatingRepoProject(false);
    }
  };

  // Handle Open Edit Project Modal
  const handleOpenEditProject = () => {
    if (!repoBoard) return;
    setEditProjName(repoBoard.project.name);
    setEditProjDesc(repoBoard.project.description || "");
    setEditKeyPrefix(repoBoard.project.key_prefix || "");
    setEditColumns(repoBoard.project.columns);
    setShowEditProjectModal(true);
  };

  const handleAddColumn = () => {
    if (!newColName.trim()) return;
    const colId = newColName.toLowerCase().replace(/\s+/g, "_");
    setEditColumns([...editColumns, { id: colId, name: newColName.trim() }]);
    setNewColName("");
  };

  const handleRemoveColumn = (colId: string) => {
    if (editColumns.length <= 1) {
      alert("A project must have at least 1 column.");
      return;
    }
    setEditColumns(editColumns.filter((c) => c.id !== colId));
  };

  const handleSaveProjectSettings = async () => {
    if (!selectedRepoProjectId) return;
    try {
      await updateRepoProject(selectedRepoProjectId, {
        name: editProjName,
        description: editProjDesc,
        key_prefix: editKeyPrefix.trim().toUpperCase(),
        columns: editColumns,
      });
      setShowEditProjectModal(false);
      await fetchRepoProjects(selectedRepoName);
      await fetchRepoBoard(selectedRepoProjectId);
    } catch (err: any) {
      alert("Failed to update project settings: " + (err?.response?.data?.detail || err.message));
    }
  };

  const handleDeleteRepoProject = async () => {
    if (!selectedRepoProjectId || !confirm("Are you sure you want to delete this project? All tasks inside will be deleted.")) return;
    try {
      await deleteRepoProject(selectedRepoProjectId);
      setShowEditProjectModal(false);
      await fetchRepoProjects(selectedRepoName);
    } catch (err: any) {
      alert("Failed to delete project: " + (err?.response?.data?.detail || err.message));
    }
  };

  // Handle Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepoProjectId || !taskTitle.trim()) return;

    setCreatingTask(true);
    try {
      const firstColName = repoBoard?.project.columns[0]?.name || "Todo";

      await createProjectTask(selectedRepoProjectId, {
        title: taskTitle,
        description: taskDesc,
        status: firstColName,
        priority: taskPriority,
        story_points: taskStoryPoints,
        assignees: selectedAssignees,
        labels: selectedLabels,
      });

      setShowCreateTaskModal(false);
      setTaskTitle("");
      setTaskDesc("");
      setSelectedAssignees([]);
      setSelectedLabels([]);
      setTaskStoryPoints(1);
      await fetchRepoBoard(selectedRepoProjectId);
    } catch (err: any) {
      alert("Failed to create task: " + (err?.response?.data?.detail || err.message));
    } finally {
      setCreatingTask(false);
    }
  };

  // Handle Save Edited Task
  const handleSaveEditedTask = async () => {
    if (!activeTask) return;
    try {
      const updated = await updateProjectTask(activeTask.id, {
        title: editingTaskTitle,
        description: editingTaskDesc,
        assignees: selectedAssignees,
        labels: selectedLabels,
      });
      setActiveTask(updated);
      setIsEditingTask(false);
      if (selectedRepoProjectId) fetchRepoBoard(selectedRepoProjectId);
    } catch (err: any) {
      alert("Failed to update task: " + (err?.response?.data?.detail || err.message));
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteProjectTask(taskId);
      setActiveTask(null);
      if (selectedRepoProjectId) fetchRepoBoard(selectedRepoProjectId);
    } catch (err: any) {
      alert("Failed to delete task: " + (err?.response?.data?.detail || err.message));
    }
  };

  // Handle Post Comment
  const handlePostComment = async () => {
    if (!activeTask || !activeTask.issue || !newCommentText.trim()) return;
    setPostingComment(true);
    try {
      await addIssueComment(
        activeTask.issue.owner,
        activeTask.issue.repo_name,
        activeTask.issue.number,
        newCommentText
      );
      setNewCommentText("");
      const details = await getIssueTimelineDetails(
        activeTask.issue.owner,
        activeTask.issue.repo_name,
        activeTask.issue.number
      );
      setTaskDetails(details);
    } catch (err: any) {
      alert("Failed to post comment: " + (err?.response?.data?.detail || err.message));
    } finally {
      setPostingComment(false);
    }
  };

  // Native Drag and Drop for Tasks
  const handleDropTaskCard = async (taskId: number, targetColumnName: string) => {
    if (!repoBoard) return;
    const task = repoBoard.tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetColumnName) return;

    const updatedTasks = repoBoard.tasks.map((t) => {
      if (t.id === taskId) {
        return { ...t, status: targetColumnName };
      }
      return t;
    });

    setRepoBoard({ ...repoBoard, tasks: updatedTasks });
    setDraggedCardId(null);

    try {
      await updateProjectTask(taskId, { status: targetColumnName });
    } catch {
      fetchRepoBoard(repoBoard.project.id);
    }
  };

  // Metrics for active project
  const projectMetrics = useMemo(() => {
    if (!repoBoard) return { total: 0, completed: 0, percent: 0, points: 0 };
    const tasks = repoBoard.tasks;
    const total = tasks.length;
    const completedCols = ["done", "completed", "closed", "finished"];
    const completed = tasks.filter((t) => completedCols.includes(t.status.toLowerCase())).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const points = tasks.reduce((acc, t) => acc + (t.story_points || 1), 0);
    return { total, completed, percent, points };
  }, [repoBoard]);

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6 min-h-screen flex flex-col">
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Repository Projects & Management
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Kanban className="w-3.5 h-3.5" />
              Repository Engine
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create and manage multiple projects, roadmaps, and Kanban boards for each repository in <strong className="text-slate-700 dark:text-slate-200">{org}</strong>.
          </p>
        </div>
      </div>

      {/* Repository Selector & Projects Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          {/* Repository Selector Dropdown */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Target Repository</span>
              <select
                value={selectedRepoName}
                onChange={(e) => setSelectedRepoName(e.target.value)}
                className="block text-base font-bold bg-transparent text-slate-900 dark:text-white focus:outline-none cursor-pointer"
              >
                {repos.map((r) => (
                  <option key={r.name} value={r.name} className="dark:bg-slate-900">
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
              title="Fetch and sync latest GitHub Issues & PRs"
            >
              <RefreshCw className={cn("w-4 h-4 text-indigo-600 dark:text-indigo-400", isRefreshing && "animate-spin")} />
              <span>{isRefreshing ? "Fetching PRs & Issues..." : "Fetch PRs & Issues"}</span>
            </button>

            {repoBoard && (
              <button
                onClick={handleOpenEditProject}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Settings className="w-4 h-4" />
                Project Settings
              </button>
            )}

            <button
              onClick={() => setShowCreateRepoProjectModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all hover:scale-[1.02]"
            >
              <FolderPlus className="w-4 h-4" />
              + New Project for {selectedRepoName || "Repo"}
            </button>
          </div>
        </div>

        {/* Projects Pills / Tabs for Selected Repository */}
        <div className="flex items-center justify-between gap-4 overflow-x-auto pt-1">
          {loadingRepoProjects ? (
            <div className="text-xs text-slate-400 py-1">Loading repo projects...</div>
          ) : repoProjects.length === 0 ? (
            <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold py-1">
              No projects created for <strong>{selectedRepoName}</strong> yet. Click <strong>+ New Project</strong> to start!
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-semibold text-slate-400 mr-1">Projects:</span>
              {repoProjects.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => setSelectedRepoProjectId(proj.id)}
                  className={cn(
                    "px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all shrink-0 flex items-center gap-2",
                    selectedRepoProjectId === proj.id
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                  )}
                >
                  <span>{proj.name}</span>
                  <span className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px]",
                    selectedRepoProjectId === proj.id ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600"
                  )}>
                    {proj.tasks_count}
                  </span>
                </button>
              ))}
            </div>
          )}

          {repoBoard && (
            <button
              onClick={() => {
                setSelectedAssignees([]);
                setSelectedLabels([]);
                setShowCreateTaskModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Task
            </button>
          )}
        </div>
      </div>

      {/* Active Project Metrics Header */}
      {repoBoard && (
        <div className="bg-gradient-to-r from-indigo-900/90 via-slate-900 to-indigo-950 p-6 rounded-3xl text-white shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                {repoBoard.project.name}
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-indigo-200">
                  {selectedRepoName}
                </span>
              </h2>
              <p className="text-xs text-indigo-200 mt-1 max-w-2xl">
                {repoBoard.project.description || "No project description set. Use Project Settings to update."}
              </p>
            </div>

            <div className="flex items-center gap-6 bg-white/10 p-3 rounded-2xl backdrop-blur-sm shrink-0">
              <div className="text-center">
                <span className="text-[10px] uppercase tracking-wider text-indigo-200 block font-semibold">Progress</span>
                <span className="text-lg font-black text-emerald-400">{projectMetrics.percent}%</span>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center">
                <span className="text-[10px] uppercase tracking-wider text-indigo-200 block font-semibold">Completed</span>
                <span className="text-lg font-black">{projectMetrics.completed}/{projectMetrics.total}</span>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center">
                <span className="text-[10px] uppercase tracking-wider text-indigo-200 block font-semibold">Story Points</span>
                <span className="text-lg font-black text-indigo-300">{projectMetrics.points} pts</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-400 h-full transition-all duration-500"
              style={{ width: `${projectMetrics.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Kanban Board View */}
      {loadingRepoBoard ? (
        <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading project board tasks...</p>
        </div>
      ) : !repoBoard ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <FolderPlus className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Project Selected</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Select or create a project for <strong>{selectedRepoName}</strong> to view its Kanban board and tasks.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 items-start overflow-x-auto pb-6">
          {repoBoard.project.columns.map((col) => {
            const colTasks = repoBoard.tasks.filter(
              (t) => t.status.toLowerCase() === col.name.toLowerCase() || t.status === col.id
            );
            const isColOver = dragOverColName === col.name;

            return (
              <div
                key={col.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverColName(col.name);
                }}
                onDragLeave={() => setDragOverColName(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverColName(null);
                  if (draggedCardId) handleDropTaskCard(draggedCardId, col.name);
                }}
                className={cn(
                  "bg-slate-100/70 dark:bg-slate-900/60 rounded-3xl p-4 border transition-all flex flex-col max-h-[80vh] min-h-[500px]",
                  isColOver
                    ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20"
                    : "border-slate-200/80 dark:border-slate-800/80"
                )}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      {col.name}
                    </h3>
                    <span className="px-2 py-0.5 text-xs font-extrabold rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {colTasks.length}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedAssignees([]);
                      setSelectedLabels([]);
                      setShowCreateTaskModal(true);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60"
                    title="Add Task to Column"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Column Task Cards */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 rounded-2xl p-1">
                  {colTasks.map((task) => {
                    const isDraggingThis = draggedCardId === task.id;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggedCardId(task.id);
                          e.dataTransfer.setData("text/plain", task.id.toString());
                        }}
                        onClick={() => {
                          setActiveTask(task);
                          setEditingTaskTitle(task.title);
                          setEditingTaskDesc(task.description || "");
                          setSelectedAssignees(task.assignees.map((a) => a.login));
                          setSelectedLabels(task.labels.map((l) => l.name));
                          setIsEditingTask(false);
                        }}
                        className={cn(
                          "bg-white dark:bg-slate-900 p-4 rounded-2xl border transition-all cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md group relative space-y-2.5 overflow-hidden w-full",
                          isDraggingThis
                            ? "opacity-50 border-dashed border-indigo-500 scale-95"
                            : "border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-400 dark:hover:border-indigo-600"
                        )}
                      >
                        {/* Card Header: Ticket Key, Priority & Story Points */}
                        <div className="flex flex-wrap items-center justify-between text-[11px] gap-1.5 w-full">
                          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            {task.ticket_key && (
                              <span className="font-mono font-extrabold text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 tracking-wider shrink-0">
                                {task.ticket_key}
                              </span>
                            )}
                            <span className={cn(
                              "px-2 py-0.5 rounded-md font-extrabold text-[10px] uppercase shrink-0",
                              task.priority === "High" || task.priority === "Critical"
                                ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                : task.priority === "Medium"
                                ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            )}>
                              {task.priority}
                            </span>
                          </div>

                          <span className="font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[10px] shrink-0">
                            {task.story_points} pts
                          </span>
                        </div>

                        {/* Task Title */}
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-relaxed break-words">
                          {task.title}
                        </h4>

                        {/* Labels */}
                        {task.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 w-full">
                            {task.labels.map((l) => (
                              <span key={l.name} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 break-all">
                                {l.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Footer with Linked Issue & PR Badge */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 w-full">
                          <div className="flex items-center gap-1 min-w-0 max-w-[60%]">
                            {task.assignees.length > 0 ? (
                              task.assignees.map((a) => (
                                <span key={a.login} className="font-semibold text-slate-700 dark:text-slate-300 truncate text-[11px]" title={`@${a.login}`}>
                                  @{a.login}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] italic">Unassigned</span>
                            )}
                          </div>

                          {task.issue && (
                            <div className="flex items-center gap-1 shrink-0 ml-auto">
                              <span className="text-[10px] font-mono font-bold text-indigo-500">
                                #{task.issue.number}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-0.5">
                                <GitPullRequest className="w-2.5 h-2.5" />
                                PR
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE REPO PROJECT MODAL */}
      {showCreateRepoProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setShowCreateRepoProjectModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-600" />
                New Project for {selectedRepoName}
              </h2>
              <button onClick={() => setShowCreateRepoProjectModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRepoProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Project Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Sprint 1, Q3 Security Refactor, UI Redesign"
                  required
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Description (Optional)</label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Describe goal or scope for this repository project..."
                  rows={3}
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Ticket Key Prefix / Pattern (Optional)</label>
                <input
                  type="text"
                  value={newKeyPrefix}
                  onChange={(e) => setNewKeyPrefix(e.target.value.toUpperCase())}
                  placeholder="e.g. SSA, TEP, PROJ, DEV, CORE"
                  maxLength={10}
                  className="w-full px-3.5 py-2 text-sm font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl uppercase"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Leave blank to auto-generate from repository/project name.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateRepoProjectModal(false)} className="px-4 py-2 text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={creatingRepoProject} className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl">
                  {creatingRepoProject ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROJECT SETTINGS & CUSTOM COLUMNS MODAL */}
      {showEditProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setShowEditProjectModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                Project Settings & Columns
              </h2>
              <button onClick={() => setShowEditProjectModal(false)} className="p-1.5 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Project Name</label>
                <input
                  type="text"
                  value={editProjName}
                  onChange={(e) => setEditProjName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Description</label>
                <textarea
                  value={editProjDesc}
                  onChange={(e) => setEditProjDesc(e.target.value)}
                  rows={2}
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Ticket Key Prefix / Pattern</label>
                <input
                  type="text"
                  value={editKeyPrefix}
                  onChange={(e) => setEditKeyPrefix(e.target.value.toUpperCase())}
                  placeholder="e.g. SSA, TEP, PROJ, DEV, CORE"
                  maxLength={10}
                  className="w-full px-3.5 py-2 text-sm font-mono font-bold bg-slate-50 dark:bg-slate-800 border rounded-xl uppercase"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Tasks in this project will be formatted as <strong className="text-indigo-500 font-mono">{editKeyPrefix || "PROJ"}-I100</strong>, <strong className="text-indigo-500 font-mono">{editKeyPrefix || "PROJ"}-I101</strong>.
                </p>
              </div>

              {/* Columns Manager */}
              <div>
                <label className="block text-xs font-semibold mb-2">Kanban Columns</label>
                <div className="space-y-2 mb-3">
                  {editColumns.map((col) => (
                    <div key={col.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border text-xs">
                      <span className="font-bold">{col.name}</span>
                      <button onClick={() => handleRemoveColumn(col.id)} className="text-rose-500 hover:text-rose-700">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    placeholder="New Column Name (e.g. QA Testing)"
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                  <button onClick={handleAddColumn} className="px-3 py-1.5 text-xs font-bold bg-slate-800 text-white rounded-xl">
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button onClick={handleDeleteRepoProject} className="text-xs font-bold text-rose-600 hover:underline">
                Delete Project
              </button>

              <div className="flex items-center gap-2">
                <button onClick={() => setShowEditProjectModal(false)} className="px-4 py-2 text-xs font-semibold">
                  Cancel
                </button>
                <button onClick={handleSaveProjectSettings} className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setShowCreateTaskModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Add Task to {repoBoard?.project.name}
              </h2>
              <button onClick={() => setShowCreateTaskModal(false)} className="p-1.5 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Task Title</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Implement OAuth JWT refresh rotation"
                  required
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Description (Markdown)</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Add acceptance criteria or technical details..."
                  rows={3}
                  className="w-full p-3 text-xs bg-slate-950 text-white rounded-xl border border-slate-800 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Story Points</label>
                  <input
                    type="number"
                    value={taskStoryPoints}
                    onChange={(e) => setTaskStoryPoints(Number(e.target.value))}
                    min={1}
                    max={21}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>
              </div>

              {/* SELECT ASSIGNEES FROM SYNCED GITHUB DEVELOPERS */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Assignees (Synced from GitHub)
                </label>
                {developers.length > 0 ? (
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    {developers.map((dev) => {
                      const isSelected = selectedAssignees.includes(dev.login);
                      return (
                        <button
                          key={dev.login}
                          type="button"
                          onClick={() => handleToggleAssignee(dev.login)}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-all",
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                          )}
                        >
                          <img
                            src={dev.avatar_url || `https://github.com/${dev.login}.png`}
                            alt={dev.login}
                            className="w-4 h-4 rounded-full"
                          />
                          <span>@{dev.login}</span>
                          {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No developers synced yet from GitHub.</p>
                )}

                {/* Custom Assignee Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customAssigneeInput}
                    onChange={(e) => setCustomAssigneeInput(e.target.value)}
                    placeholder="Add extra GitHub username (e.g. octocat)"
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomAssignee}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-800 text-white rounded-xl"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* SELECTABLE LABELS BUTTONS */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Labels
                </label>
                <div className="flex flex-wrap gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  {PRESET_LABELS.map((lbl) => {
                    const isSelected = selectedLabels.includes(lbl.name);
                    return (
                      <button
                        key={lbl.name}
                        type="button"
                        onClick={() => handleToggleLabel(lbl.name)}
                        className={cn(
                          "px-3 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5",
                          lbl.style,
                          isSelected ? "ring-2 ring-indigo-500 scale-105 shadow-sm" : "opacity-70 hover:opacity-100"
                        )}
                      >
                        <span>{lbl.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Label Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customLabelInput}
                    onChange={(e) => setCustomLabelInput(e.target.value)}
                    placeholder="Add custom label (e.g. database)"
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomLabel}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-800 text-white rounded-xl"
                  >
                    Add Label
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateTaskModal(false)} className="px-4 py-2 text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={creatingTask} className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl">
                  {creatingTask ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TASK DETAIL SLIDE-OVER DRAWER WITH LINKED PULL REQUESTS */}
      {activeTask && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setActiveTask(null)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-xl h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col p-6 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-extrabold uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-md border border-indigo-500/20 inline-block mb-1">
                  {activeTask.ticket_key || `Task #${activeTask.id}`}
                </span>
                {isEditingTask ? (
                  <input
                    type="text"
                    value={editingTaskTitle}
                    onChange={(e) => setEditingTaskTitle(e.target.value)}
                    className="w-full text-base font-bold bg-slate-50 dark:bg-slate-800 border p-2 rounded-lg"
                  />
                ) : (
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{activeTask.title}</h2>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isEditingTask ? (
                  <button onClick={() => setIsEditingTask(true)} className="text-xs text-indigo-600 font-bold hover:underline">
                    Edit
                  </button>
                ) : (
                  <button onClick={handleSaveEditedTask} className="text-xs bg-indigo-600 text-white font-bold px-3 py-1 rounded-lg">
                    Save
                  </button>
                )}
                <button onClick={() => setActiveTask(null)} className="p-1.5 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Task Meta Grid */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Status Column</span>
                <span className="font-bold text-indigo-600">{activeTask.status}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Priority</span>
                <span className="font-bold">{activeTask.priority}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Story Points</span>
                <span className="font-bold">{activeTask.story_points} pts</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Created</span>
                <span className="font-medium">{new Date(activeTask.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* ASSOCIATED PULL REQUESTS SECTION */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <GitPullRequest className="w-4 h-4 text-purple-500" />
                  Associated Pull Requests
                  {taskDetails?.linked_prs && taskDetails.linked_prs.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold text-[10px]">
                      {taskDetails.linked_prs.length}
                    </span>
                  )}
                </span>

                <button
                  onClick={handleRefreshAll}
                  disabled={isRefreshing || loadingTaskDetails}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-500/20 hover:bg-purple-100 transition-colors disabled:opacity-50"
                  title="Refresh pull request timeline from GitHub"
                >
                  <RefreshCw className={cn("w-3 h-3", (isRefreshing || loadingTaskDetails) && "animate-spin")} />
                  <span>Refresh PRs</span>
                </button>
              </div>

              {loadingTaskDetails ? (
                <div className="p-4 text-center text-xs text-slate-400">Fetching linked PRs...</div>
              ) : taskDetails && taskDetails.linked_prs.length > 0 ? (
                <div className="space-y-2">
                  {taskDetails.linked_prs.map((pr) => (
                    <div key={pr.url} className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                          <GitPullRequest className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">{pr.title}</span>
                            <span className="font-mono text-[10px] font-extrabold text-indigo-500">#{pr.number}</span>
                          </div>
                          <span className={cn(
                            "inline-block text-[9px] font-black uppercase px-2 py-0.2 rounded-full mt-1",
                            pr.state.toLowerCase() === "merged"
                              ? "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                              : pr.state.toLowerCase() === "open"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                          )}>
                            {pr.state}
                          </span>
                        </div>
                      </div>

                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                        title="Open PR on GitHub"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 italic text-center">
                  {activeTask?.issue ? "No pull requests cross-referenced with this issue." : "Link this task to a GitHub Issue to track associated PRs."}
                </div>
              )}
            </div>

            {/* Assignees Selector in Drawer */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assignees</span>
              <div className="flex flex-wrap gap-2 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border">
                {developers.map((dev) => {
                  const isSelected = selectedAssignees.includes(dev.login);
                  return (
                    <button
                      key={dev.login}
                      type="button"
                      onClick={() => handleToggleAssignee(dev.login)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-all",
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                      )}
                    >
                      <img src={dev.avatar_url || `https://github.com/${dev.login}.png`} alt={dev.login} className="w-4 h-4 rounded-full" />
                      <span>@{dev.login}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Labels Selector in Drawer */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Labels</span>
              <div className="flex flex-wrap gap-2 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border">
                {PRESET_LABELS.map((lbl) => {
                  const isSelected = selectedLabels.includes(lbl.name);
                  return (
                    <button
                      key={lbl.name}
                      type="button"
                      onClick={() => handleToggleLabel(lbl.name)}
                      className={cn(
                        "px-3 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1",
                        lbl.style,
                        isSelected ? "ring-2 ring-indigo-500 scale-105" : "opacity-60"
                      )}
                    >
                      <span>{lbl.name}</span>
                      {isSelected && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Task Description</span>
              {isEditingTask ? (
                <textarea
                  value={editingTaskDesc}
                  onChange={(e) => setEditingTaskDesc(e.target.value)}
                  rows={6}
                  className="w-full p-3 text-xs bg-slate-950 text-white rounded-xl border border-slate-800 font-mono"
                />
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border">
                  {activeTask.description ? (
                    <MarkdownViewer content={activeTask.description} />
                  ) : (
                    <span className="text-xs text-slate-400 italic">No description set.</span>
                  )}
                </div>
              )}
            </div>

            {/* ISSUE COMMENTS FEED */}
            {activeTask.issue && (
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-indigo-500" />
                  GitHub Comments ({taskDetails?.comments?.length || 0})
                </span>

                {taskDetails?.comments && taskDetails.comments.length > 0 && (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {taskDetails.comments.map((comment) => (
                      <div key={comment.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <img src={comment.user.avatar_url || `https://github.com/${comment.user.login}.png`} className="w-4 h-4 rounded-full" />
                            <span className="font-bold text-slate-900 dark:text-white">@{comment.user.login}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{comment.body}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Comment Box */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Leave a comment on GitHub issue..."
                    className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                  <button
                    onClick={handlePostComment}
                    disabled={postingComment || !newCommentText.trim()}
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50"
                    title="Post Comment"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <button onClick={() => handleDeleteTask(activeTask.id)} className="text-xs font-bold text-rose-600 hover:underline">
                Delete Task
              </button>
              <button onClick={() => setActiveTask(null)} className="px-4 py-2 text-xs font-bold bg-slate-800 text-white rounded-xl">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
