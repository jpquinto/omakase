"use client";

// ---------------------------------------------------------------------------
// Linear Workspace Browser Component
//
// Full-screen drawer that slides in from the right for browsing and importing
// Linear issues into an Omakase project. Users can search, filter by status
// and Linear project, multi-select issues, and bulk-import them as features.
//
// Follows the Omakase liquid glass design system: glass surfaces, oma-*
// color tokens, Instrument Serif headings, Outfit body text.
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  X,
  ChevronDown,
  Loader2,
  ExternalLink,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { toast } from "@/components/toast-provider";
import type { LinearIssue, LinearProject } from "@omakase/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LinearWorkspaceBrowserProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  /** Called after a successful import so the parent can refresh features. */
  onImportComplete: () => void;
}

/** Shape returned by the /api/linear/issues endpoint. */
interface IssuesResponse {
  issues: LinearIssue[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}

/** Common Linear workflow state categories for the status filter dropdown. */
interface StatusOption {
  id: string;
  label: string;
}

const STATUS_FILTERS: StatusOption[] = [
  { id: "", label: "All Statuses" },
  { id: "backlog", label: "Backlog" },
  { id: "unstarted", label: "Todo" },
  { id: "started", label: "In Progress" },
  { id: "completed", label: "Done" },
  { id: "cancelled", label: "Cancelled" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Maps Linear priority (0 = no priority, 1 = urgent, 2 = high, 3 = medium,
 * 4 = low) to Omakase priority values. Linear's 0 (none) maps to 3 (medium)
 * as a sensible default.
 */
function mapLinearPriority(linearPriority: number): number {
  switch (linearPriority) {
    case 0:
      return 3;
    case 1:
      return 1;
    case 2:
      return 2;
    case 3:
      return 3;
    case 4:
      return 4;
    default:
      return 3;
  }
}

/** Returns a color class for the Linear priority dot indicator. */
function priorityDotColor(priority: number): string {
  switch (priority) {
    case 1:
      return "bg-oma-fail";
    case 2:
      return "bg-oma-secondary";
    case 3:
      return "bg-oma-gold";
    case 4:
      return "bg-oma-text-subtle";
    default:
      return "bg-oma-text-faint";
  }
}

/** Returns a human-readable label for a Linear state type. */
function stateTypeColor(type: string): string {
  switch (type) {
    case "started":
      return "text-oma-progress";
    case "completed":
      return "text-oma-done";
    case "cancelled":
      return "text-oma-fail";
    case "backlog":
      return "text-oma-text-faint";
    default:
      return "text-oma-text-subtle";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LinearWorkspaceBrowser({
  projectId,
  open,
  onClose,
  onImportComplete,
}: LinearWorkspaceBrowserProps) {
  // -- Filter state --
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [linearProjectFilter, setLinearProjectFilter] = useState("");

  // -- Data state --
  const [issues, setIssues] = useState<LinearIssue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // -- Linear projects for the filter dropdown --
  const [linearProjects, setLinearProjects] = useState<LinearProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // -- Selection state --
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // -- Import state --
  const [isImporting, setIsImporting] = useState(false);

  // -- Refs --
  const sentinelRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // -- Dropdowns --
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  // -----------------------------------------------------------------------
  // Fetch Linear projects for the filter dropdown (once when drawer opens)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setProjectsLoading(true);

    fetch(`/api/linear/projects?projectId=${projectId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch projects: ${res.status}`);
        return res.json();
      })
      .then((data: LinearProject[]) => {
        if (!cancelled) setLinearProjects(data);
      })
      .catch((err) => {
        console.error("[LinearWorkspaceBrowser] Failed to load projects:", err);
      })
      .finally(() => {
        if (!cancelled) setProjectsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  // -----------------------------------------------------------------------
  // Fetch issues (initial load + filter changes)
  // -----------------------------------------------------------------------
  const fetchIssues = useCallback(
    async (cursor?: string) => {
      const isNextPage = !!cursor;
      if (isNextPage) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setFetchError(null);
      }

      const params = new URLSearchParams({ projectId });
      if (searchQuery.trim()) params.set("query", searchQuery.trim());
      if (statusFilter) params.set("statusId", statusFilter);
      if (linearProjectFilter) params.set("linearProjectId", linearProjectFilter);
      if (cursor) params.set("after", cursor);
      params.set("first", "50");

      try {
        const res = await fetch(`/api/linear/issues?${params.toString()}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error ??
              `Request failed with status ${res.status}`,
          );
        }

        const data: IssuesResponse = await res.json();

        if (isNextPage) {
          setIssues((prev) => [...prev, ...data.issues]);
        } else {
          setIssues(data.issues);
        }

        setHasNextPage(data.pageInfo.hasNextPage);
        setEndCursor(data.pageInfo.endCursor);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setFetchError(message);
        console.error("[LinearWorkspaceBrowser] Fetch error:", message);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [projectId, searchQuery, statusFilter, linearProjectFilter],
  );

  // Debounced fetch when filters change
  useEffect(() => {
    if (!open) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      // Reset pagination when filters change
      setEndCursor(null);
      setSelectedIds(new Set());
      void fetchIssues();
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, fetchIssues]);

  // -----------------------------------------------------------------------
  // Infinite scroll via IntersectionObserver
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!open || !hasNextPage || isLoadingMore) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && endCursor) {
          void fetchIssues(endCursor);
        }
      },
      { root: scrollContainerRef.current, threshold: 0.1 },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [open, hasNextPage, isLoadingMore, endCursor, fetchIssues]);

  // -----------------------------------------------------------------------
  // Close dropdowns when clicking outside
  // -----------------------------------------------------------------------
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(e.target as Node)
      ) {
        setStatusDropdownOpen(false);
      }
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(e.target as Node)
      ) {
        setProjectDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // -----------------------------------------------------------------------
  // Close drawer on Escape key
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // -----------------------------------------------------------------------
  // Reset state when drawer closes
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setStatusFilter("");
      setLinearProjectFilter("");
      setIssues([]);
      setSelectedIds(new Set());
      setEndCursor(null);
      setHasNextPage(false);
      setFetchError(null);
    }
  }, [open]);

  // -----------------------------------------------------------------------
  // Selection handlers
  // -----------------------------------------------------------------------

  const toggleSelection = useCallback((issueId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(issueId)) {
        next.delete(issueId);
      } else {
        next.add(issueId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const allIds = issues.map((i) => i.id);
    const allSelected = allIds.every((id) => selectedIds.has(id));

    if (allSelected) {
      // Deselect all
      setSelectedIds(new Set());
    } else {
      // Select all visible
      setSelectedIds(new Set(allIds));
    }
  }, [issues, selectedIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const allVisibleSelected =
    issues.length > 0 && issues.every((i) => selectedIds.has(i.id));

  // -----------------------------------------------------------------------
  // Import handler
  // -----------------------------------------------------------------------

  const handleImport = useCallback(async () => {
    const selected = issues.filter((i) => selectedIds.has(i.id));
    if (selected.length === 0) return;

    setIsImporting(true);

    try {
      const features = selected.map((issue) => ({
        name: issue.title,
        description: issue.description,
        priority: mapLinearPriority(issue.priority),
        linearIssueId: issue.identifier,
        linearIssueUrl: issue.url,
      }));

      const result = await apiFetch<{ created: number; skipped: number }>(
        `/api/projects/${projectId}/features/bulk`,
        {
          method: "POST",
          body: JSON.stringify({ features }),
        },
      );

      const parts: string[] = [];
      if (result.created > 0) {
        parts.push(`Imported ${result.created} feature${result.created !== 1 ? "s" : ""}`);
      }
      if (result.skipped > 0) {
        parts.push(`${result.skipped} skipped (already exist)`);
      }

      toast.success(parts.join(". ") + ".");
      onImportComplete();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Import failed: ${message}`);
    } finally {
      setIsImporting(false);
    }
  }, [issues, selectedIds, projectId, onImportComplete, onClose]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (!open) return null;

  const selectedCount = selectedIds.size;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col",
          "bg-oma-bg-elevated shadow-oma-lg",
          "animate-oma-slide-in-right",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Browse Linear issues"
      >
        {/* ----------------------------------------------------------------
            Header
            ---------------------------------------------------------------- */}
        <div className="flex items-center justify-between border-b border-oma-glass-border px-6 py-4">
          <h2 className="font-serif text-lg font-semibold text-oma-text">
            Browse Linear
          </h2>
          <button
            onClick={onClose}
            className="glass-sm flex h-8 w-8 items-center justify-center rounded-oma text-oma-text-muted transition-colors hover:text-oma-text"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ----------------------------------------------------------------
            Filters row
            ---------------------------------------------------------------- */}
        <div className="flex flex-wrap items-center gap-3 border-b border-oma-glass-border px-6 py-3">
          {/* Search input */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-oma-text-faint" />
            <input
              type="text"
              placeholder="Search issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "glass-sm w-full rounded-oma border border-oma-glass-border bg-transparent py-2 pl-9 pr-3 text-sm text-oma-text outline-none transition-colors",
                "placeholder:text-oma-text-faint",
                "focus:border-oma-primary focus:ring-1 focus:ring-oma-primary/30",
              )}
            />
          </div>

          {/* Status filter dropdown */}
          <div className="relative" ref={statusDropdownRef}>
            <button
              onClick={() => {
                setStatusDropdownOpen((prev) => !prev);
                setProjectDropdownOpen(false);
              }}
              className={cn(
                "glass-sm flex items-center gap-2 rounded-oma border border-oma-glass-border px-3 py-2 text-sm transition-colors",
                statusFilter ? "text-oma-text" : "text-oma-text-muted",
                "hover:border-oma-glass-border-bright",
              )}
            >
              <span className="truncate max-w-[120px]">
                {STATUS_FILTERS.find((s) => s.id === statusFilter)?.label ?? "All Statuses"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            </button>

            {statusDropdownOpen && (
              <div className="absolute left-0 top-full z-10 mt-1 w-48 overflow-hidden rounded-oma border border-oma-glass-border bg-oma-bg-elevated shadow-oma">
                {STATUS_FILTERS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setStatusFilter(option.id);
                      setStatusDropdownOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center px-3 py-2 text-left text-sm transition-colors",
                      option.id === statusFilter
                        ? "bg-oma-primary/10 text-oma-primary"
                        : "text-oma-text-muted hover:bg-oma-bg-surface hover:text-oma-text",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Linear project filter dropdown */}
          <div className="relative" ref={projectDropdownRef}>
            <button
              onClick={() => {
                setProjectDropdownOpen((prev) => !prev);
                setStatusDropdownOpen(false);
              }}
              disabled={projectsLoading}
              className={cn(
                "glass-sm flex items-center gap-2 rounded-oma border border-oma-glass-border px-3 py-2 text-sm transition-colors",
                linearProjectFilter ? "text-oma-text" : "text-oma-text-muted",
                "hover:border-oma-glass-border-bright",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              <span className="truncate max-w-[120px]">
                {linearProjectFilter
                  ? linearProjects.find((p) => p.id === linearProjectFilter)?.name ?? "Project"
                  : "All Projects"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            </button>

            {projectDropdownOpen && (
              <div className="absolute left-0 top-full z-10 mt-1 w-56 overflow-hidden rounded-oma border border-oma-glass-border bg-oma-bg-elevated shadow-oma">
                {/* "All Projects" option */}
                <button
                  onClick={() => {
                    setLinearProjectFilter("");
                    setProjectDropdownOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center px-3 py-2 text-left text-sm transition-colors",
                    !linearProjectFilter
                      ? "bg-oma-primary/10 text-oma-primary"
                      : "text-oma-text-muted hover:bg-oma-bg-surface hover:text-oma-text",
                  )}
                >
                  All Projects
                </button>

                {linearProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      setLinearProjectFilter(project.id);
                      setProjectDropdownOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center px-3 py-2 text-left text-sm transition-colors",
                      project.id === linearProjectFilter
                        ? "bg-oma-primary/10 text-oma-primary"
                        : "text-oma-text-muted hover:bg-oma-bg-surface hover:text-oma-text",
                    )}
                  >
                    <span className="truncate">{project.name}</span>
                  </button>
                ))}

                {linearProjects.length === 0 && !projectsLoading && (
                  <div className="px-3 py-2 text-xs text-oma-text-faint">
                    No projects found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ----------------------------------------------------------------
            Select All row
            ---------------------------------------------------------------- */}
        {!isLoading && issues.length > 0 && (
          <div className="flex items-center justify-between border-b border-oma-glass-border px-6 py-2">
            <button
              onClick={selectAll}
              className="text-xs font-medium text-oma-text-muted transition-colors hover:text-oma-primary"
            >
              {allVisibleSelected ? "Deselect All" : "Select All"}
            </button>
            <span className="text-xs text-oma-text-faint">
              {issues.length} issue{issues.length !== 1 ? "s" : ""} shown
            </span>
          </div>
        )}

        {/* ----------------------------------------------------------------
            Issue list (scrollable)
            ---------------------------------------------------------------- */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto"
        >
          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-1 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-oma px-3 py-3"
                >
                  <div className="h-4 w-4 animate-pulse rounded bg-oma-bg-surface" />
                  <div className="h-3.5 w-16 animate-pulse rounded bg-oma-bg-surface" />
                  <div className="h-3.5 flex-1 animate-pulse rounded bg-oma-bg-surface" />
                  <div className="h-3 w-20 animate-pulse rounded bg-oma-bg-surface" />
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {!isLoading && fetchError && (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16">
              <div className="rounded-oma border border-oma-fail/30 bg-oma-fail/10 px-4 py-3 text-sm text-oma-fail">
                {fetchError}
              </div>
              <button
                onClick={() => void fetchIssues()}
                className="text-xs font-medium text-oma-primary transition-colors hover:text-oma-primary-dim"
              >
                Try again
              </button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !fetchError && issues.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16">
              <Inbox className="h-10 w-10 text-oma-text-faint" />
              <p className="text-sm font-medium text-oma-text-muted">
                No issues found
              </p>
              <p className="text-xs text-oma-text-subtle">
                Try adjusting your search or filters
              </p>
            </div>
          )}

          {/* Issue rows */}
          {!isLoading && !fetchError && issues.length > 0 && (
            <div className="divide-y divide-oma-glass-border">
              {issues.map((issue) => {
                const isSelected = selectedIds.has(issue.id);

                return (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => toggleSelection(issue.id)}
                    className={cn(
                      "flex w-full items-start gap-3 px-6 py-3 text-left transition-colors",
                      isSelected
                        ? "bg-oma-primary/5"
                        : "hover:bg-oma-bg-surface/50",
                    )}
                  >
                    {/* Checkbox */}
                    <div
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        isSelected
                          ? "border-oma-primary bg-oma-primary"
                          : "border-oma-glass-border-bright bg-transparent",
                      )}
                    >
                      {isSelected && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          fill="none"
                          className="text-white"
                        >
                          <path
                            d="M2 5L4 7L8 3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>

                    {/* Issue content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {/* Identifier */}
                        <span className="shrink-0 font-mono text-xs font-medium text-oma-text-subtle">
                          {issue.identifier}
                        </span>

                        {/* Priority dot */}
                        <span
                          className={cn(
                            "inline-block h-2 w-2 shrink-0 rounded-full",
                            priorityDotColor(issue.priority),
                          )}
                          title={`Priority ${issue.priority}`}
                        />

                        {/* Title */}
                        <span className="truncate text-sm text-oma-text">
                          {issue.title}
                        </span>
                      </div>

                      {/* Meta row: status + labels */}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {/* Status */}
                        <span
                          className={cn(
                            "inline-block text-[10px] font-medium",
                            stateTypeColor(issue.state.type),
                          )}
                        >
                          {issue.state.name}
                        </span>

                        {/* Labels */}
                        {issue.labels.nodes.map((label) => (
                          <span
                            key={label.id}
                            className="inline-block rounded-oma-full bg-oma-bg-surface px-1.5 py-0.5 text-[10px] font-medium text-oma-text-muted"
                          >
                            {label.name}
                          </span>
                        ))}

                        {/* Project name */}
                        {issue.project && (
                          <span className="inline-block text-[10px] text-oma-text-faint">
                            {issue.project.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* External link icon */}
                    <a
                      href={issue.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 shrink-0 text-oma-text-faint transition-colors hover:text-oma-primary"
                      title="Open in Linear"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </button>
                );
              })}

              {/* Infinite scroll sentinel */}
              {hasNextPage && (
                <div
                  ref={sentinelRef}
                  className="flex items-center justify-center py-4"
                >
                  {isLoadingMore && (
                    <Loader2 className="h-5 w-5 animate-spin text-oma-text-faint" />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------
            Floating action bar (visible when items are selected)
            ---------------------------------------------------------------- */}
        {selectedCount > 0 && (
          <div className="border-t border-oma-glass-border bg-oma-bg-elevated px-6 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-oma-text">
                {selectedCount} issue{selectedCount !== 1 ? "s" : ""} selected
              </span>

              <div className="flex items-center gap-3">
                <button
                  onClick={clearSelection}
                  className="text-xs font-medium text-oma-text-muted transition-colors hover:text-oma-text"
                >
                  Clear Selection
                </button>

                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className={cn(
                    "flex items-center gap-2 rounded-oma bg-oma-primary px-4 py-2 text-sm font-medium text-white transition-all duration-200",
                    "hover:bg-oma-primary-dim hover:shadow-oma-glow-primary",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  {isImporting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Import Selected
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
