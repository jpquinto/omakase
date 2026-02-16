"use client";

// ---------------------------------------------------------------------------
// Tickets Table Component
//
// A sortable, filterable table of project features. Supports inline editing
// of name, priority, and status fields, search filtering, status filtering,
// new feature creation, and delete with confirmation.
//
// Uses the Omakase Liquid Glass design system throughout.
// ---------------------------------------------------------------------------

import { useCallback, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import type { Feature, FeatureStatus, AgentLiveStatusWorking, AgentName } from "@omakase/db";
import { cn } from "@/lib/utils";
import { useAssignFeature, useCreateFeature, useDeleteFeature, useSyncLinear, useUpdateFeature } from "@/hooks/use-api";
import { useAgentStatus } from "@/hooks/use-agent-status";
import { LinearTicketBadge } from "@/components/linear-ticket-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TicketsTableProps {
  projectId: string;
  features: Feature[];
  onRefetch: () => void;
  onSelectFeature: (feature: Feature) => void;
  onBrowseLinear: () => void;
  hasLinearConnection: boolean;
}

type SortField = "name" | "priority" | "status" | "createdAt";
type SortDirection = "asc" | "desc";

/** All possible feature status values with their display labels. */
const STATUS_OPTIONS: { value: FeatureStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "review_ready", label: "Review Ready" },
  { value: "passing", label: "Passing" },
  { value: "failing", label: "Failing" },
];

/** Editable status options (excludes the "all" filter value). */
const EDITABLE_STATUS_OPTIONS: { value: FeatureStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "review_ready", label: "Review Ready" },
  { value: "passing", label: "Passing" },
  { value: "failing", label: "Failing" },
];

const PRIORITY_OPTIONS = [1, 2, 3, 4, 5] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Maps a priority number to a short display label. */
function priorityLabel(priority: number): string {
  const labels: Record<number, string> = {
    1: "P1",
    2: "P2",
    3: "P3",
    4: "P4",
    5: "P5",
  };
  return labels[priority] ?? `P${priority}`;
}

/** Maps a priority number to Omakase color classes for the badge. */
function priorityColor(priority: number): string {
  const colors: Record<number, string> = {
    1: "bg-oma-fail/20 text-oma-fail",
    2: "bg-oma-secondary/20 text-oma-secondary",
    3: "bg-oma-progress/20 text-oma-progress",
    4: "bg-oma-bg-surface text-oma-text-muted",
    5: "bg-oma-bg-surface text-oma-text-faint",
  };
  return colors[priority] ?? "bg-oma-bg-surface text-oma-text-muted";
}

/** Maps a feature status to Omakase color classes for the badge. */
function statusColor(status: FeatureStatus): string {
  const colors: Record<FeatureStatus, string> = {
    pending: "bg-oma-pending/20 text-oma-pending",
    in_progress: "bg-oma-progress/20 text-oma-progress",
    review_ready: "bg-oma-review/20 text-oma-review",
    passing: "bg-oma-done/20 text-oma-done",
    failing: "bg-oma-fail/20 text-oma-fail",
  };
  return colors[status] ?? "bg-oma-bg-surface text-oma-text-muted";
}

/** Maps a feature status to its human-readable label. */
function statusLabel(status: FeatureStatus): string {
  const labels: Record<FeatureStatus, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    review_ready: "Review Ready",
    passing: "Passing",
    failing: "Failing",
  };
  return labels[status] ?? status;
}

/** Format an ISO date string into a compact readable form. */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

/** Agent definitions used in the assignment popover. */
const AGENT_DEFS = [
  { name: "miso" as AgentName, label: "Miso", mascot: "\uD83C\uDF5C", role: "Architect", color: "text-oma-gold", dotColor: "bg-oma-gold" },
  { name: "nori" as AgentName, label: "Nori", mascot: "\uD83C\uDF59", role: "Coder", color: "text-oma-indigo", dotColor: "bg-oma-indigo" },
  { name: "koji" as AgentName, label: "Koji", mascot: "\uD83C\uDF76", role: "Reviewer", color: "text-oma-secondary", dotColor: "bg-oma-secondary" },
  { name: "toro" as AgentName, label: "Toro", mascot: "\uD83C\uDF63", role: "Tester", color: "text-oma-jade", dotColor: "bg-oma-jade" },
] as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Column header button with sort indicator. */
function SortableHeader({
  label,
  field,
  currentField,
  currentDirection,
  onSort,
}: {
  label: string;
  field: SortField;
  currentField: SortField | null;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentField === field;

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors",
        isActive ? "text-oma-primary" : "text-oma-text-muted hover:text-oma-text",
      )}
    >
      {label}
      {isActive ? (
        currentDirection === "asc" ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        )
      ) : (
        <ArrowUpDown className="size-3 opacity-40" />
      )}
    </button>
  );
}

/** Inline name editor: shows an input on double-click, saves on Enter/blur. */
function InlineNameEditor({
  value,
  onSave,
}: {
  value: string;
  onSave: (newValue: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = useCallback(() => {
    setDraft(value);
    setIsEditing(true);
    // Focus on next tick after render
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [value]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    }
    setIsEditing(false);
  }, [draft, value, onSave]);

  const cancel = useCallback(() => {
    setDraft(value);
    setIsEditing(false);
  }, [value]);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-oma-sm border border-oma-glass-border-bright bg-oma-bg-surface px-2 py-1 text-sm text-oma-text outline-none focus:border-oma-primary"
      />
    );
  }

  return (
    <span
      onDoubleClick={(e) => {
        e.stopPropagation();
        startEditing();
      }}
      className="cursor-text text-sm font-medium text-oma-text"
      title="Double-click to edit"
    >
      {value}
    </span>
  );
}

/** Inline dropdown for priority selection. */
function InlinePrioritySelect({
  value,
  onSave,
}: {
  value: number;
  onSave: (newValue: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (isOpen) {
    return (
      <select
        value={value}
        onChange={(e) => {
          onSave(Number(e.target.value));
          setIsOpen(false);
        }}
        onBlur={() => setIsOpen(false)}
        onClick={(e) => e.stopPropagation()}
        autoFocus
        className="rounded-oma-sm border border-oma-glass-border-bright bg-oma-bg-surface px-1.5 py-0.5 text-xs text-oma-text outline-none focus:border-oma-primary"
      >
        {PRIORITY_OPTIONS.map((p) => (
          <option key={p} value={p}>
            {priorityLabel(p)}
          </option>
        ))}
      </select>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setIsOpen(true);
      }}
      className={cn(
        "inline-block rounded-oma-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80",
        priorityColor(value),
      )}
      title="Click to change priority"
    >
      {priorityLabel(value)}
    </button>
  );
}

/** Inline dropdown for status selection. */
function InlineStatusSelect({
  value,
  onSave,
}: {
  value: FeatureStatus;
  onSave: (newValue: FeatureStatus) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (isOpen) {
    return (
      <select
        value={value}
        onChange={(e) => {
          onSave(e.target.value as FeatureStatus);
          setIsOpen(false);
        }}
        onBlur={() => setIsOpen(false)}
        onClick={(e) => e.stopPropagation()}
        autoFocus
        className="rounded-oma-sm border border-oma-glass-border-bright bg-oma-bg-surface px-1.5 py-0.5 text-xs text-oma-text outline-none focus:border-oma-primary"
      >
        {EDITABLE_STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setIsOpen(true);
      }}
      className={cn(
        "inline-block rounded-oma-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80",
        statusColor(value),
      )}
      title="Click to change status"
    >
      {statusLabel(value)}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TicketsTable({
  projectId,
  features,
  onRefetch,
  onSelectFeature,
  onBrowseLinear,
  hasLinearConnection,
}: TicketsTableProps) {
  // --- Agent live status ---
  const { agents: agentStatuses } = useAgentStatus();

  // --- State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FeatureStatus | "all">("all");
  const [linearStateFilter, setLinearStateFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Feature | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncCooldown, setSyncCooldown] = useState(0);
  const [assigningFeatureId, setAssigningFeatureId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  // --- New feature form state ---
  const [newName, setNewName] = useState("");
  const [newPriority, setNewPriority] = useState(3);
  const [newCategory, setNewCategory] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // --- Mutation hooks ---
  const createFeature = useCreateFeature();
  const updateFeature = useUpdateFeature();
  const deleteFeature = useDeleteFeature();
  const syncLinear = useSyncLinear();
  const assignFeature = useAssignFeature();

  // --- Unique Linear state names for filter dropdown ---
  const linearStateOptions = useMemo(() => {
    const states = new Set<string>();
    for (const f of features) {
      if (f.linearStateName) states.add(f.linearStateName);
    }
    return Array.from(states).sort();
  }, [features]);

  // --- Sync cooldown timer ---
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startCooldown = useCallback(() => {
    setSyncCooldown(30);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setSyncCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // --- Sync handler ---
  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await syncLinear(projectId);
      onRefetch();
      startCooldown();
    } catch {
      // Error surfaced through the API client
    } finally {
      setIsSyncing(false);
    }
  }, [syncLinear, projectId, onRefetch, startCooldown]);

  // --- Agent assignment handler ---
  const handleAssign = useCallback(
    async (featureId: string, agentName: string) => {
      setAssignError(null);
      try {
        await assignFeature(featureId, agentName);
        setAssigningFeatureId(null);
        onRefetch();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Assignment failed";
        setAssignError(message);
        onRefetch();
      }
    },
    [assignFeature, onRefetch],
  );

  // --- Sorting handler ---
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        // Toggle direction if same field
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    },
    [sortField],
  );

  // --- Filtered and sorted features ---
  const displayedFeatures = useMemo(() => {
    let result = [...features];

    // Apply search filter (case-insensitive match on name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(query));
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((f) => f.status === statusFilter);
    }

    // Apply Linear state filter
    if (linearStateFilter !== "all") {
      result = result.filter((f) => f.linearStateName === linearStateFilter);
    }

    // Apply sorting
    if (sortField) {
      result.sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
          case "name":
            comparison = a.name.localeCompare(b.name);
            break;
          case "priority":
            comparison = a.priority - b.priority;
            break;
          case "status": {
            const statusOrder: Record<FeatureStatus, number> = {
              pending: 0,
              in_progress: 1,
              review_ready: 2,
              passing: 3,
              failing: 4,
            };
            comparison = (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0);
            break;
          }
          case "createdAt":
            comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [features, searchQuery, statusFilter, linearStateFilter, sortField, sortDirection]);

  // --- Inline update handler ---
  const handleInlineUpdate = useCallback(
    async (featureId: string, data: { name?: string; priority?: number; status?: string }) => {
      try {
        await updateFeature(featureId, data);
        onRefetch();
      } catch {
        // Silently fail -- the UI will reflect the old value on refetch
      }
    },
    [updateFeature, onRefetch],
  );

  // --- Create feature handler ---
  const handleCreate = useCallback(async () => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    setIsCreating(true);
    try {
      await createFeature(projectId, {
        name: trimmedName,
        priority: newPriority,
        category: newCategory.trim() || undefined,
      });
      // Reset form
      setNewName("");
      setNewPriority(3);
      setNewCategory("");
      setShowAddForm(false);
      onRefetch();
    } catch {
      // Error is surfaced through the API client
    } finally {
      setIsCreating(false);
    }
  }, [newName, newPriority, newCategory, createFeature, projectId, onRefetch]);

  // --- Delete feature handler ---
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteFeature(deleteTarget.id);
      setDeleteTarget(null);
      onRefetch();
    } catch {
      // Error is surfaced through the API client
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, deleteFeature, onRefetch]);

  return (
    <div className="flex flex-col gap-4">
      {/* ----------------------------------------------------------------- */}
      {/* Toolbar: Search, status filter, action buttons                    */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search input */}
        <div className="glass-sm relative flex-1 rounded-oma">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-oma-text-subtle" />
          <input
            type="text"
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-oma bg-transparent py-2 pl-9 pr-3 text-sm text-oma-text placeholder:text-oma-text-subtle outline-none"
          />
        </div>

        {/* Status filter */}
        <div className="glass-sm rounded-oma">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FeatureStatus | "all")}
            className="rounded-oma bg-transparent px-3 py-2 text-sm text-oma-text outline-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-oma-bg-elevated">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Linear state filter (only shown if any features have Linear metadata) */}
        {linearStateOptions.length > 0 && (
          <div className="glass-sm rounded-oma">
            <select
              value={linearStateFilter}
              onChange={(e) => setLinearStateFilter(e.target.value)}
              className="rounded-oma bg-transparent px-3 py-2 text-sm text-oma-text outline-none"
            >
              <option value="all" className="bg-oma-bg-elevated">All Linear States</option>
              {linearStateOptions.map((state) => (
                <option key={state} value={state} className="bg-oma-bg-elevated">
                  {state}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Add Feature button */}
        <Button
          size="sm"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="gap-1.5 rounded-oma"
        >
          {showAddForm ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
          {showAddForm ? "Cancel" : "Add Feature"}
        </Button>

        {/* Sync from Linear button (conditional) */}
        {hasLinearConnection && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleSync()}
            disabled={isSyncing || syncCooldown > 0}
            className="gap-1.5 rounded-oma"
          >
            <RefreshCw className={cn("size-3.5", isSyncing && "animate-spin")} />
            {isSyncing
              ? "Syncing..."
              : syncCooldown > 0
                ? `Sync (${syncCooldown}s)`
                : "Sync Linear"}
          </Button>
        )}

        {/* Browse Linear button (conditional) */}
        {hasLinearConnection && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBrowseLinear}
            className="gap-1.5 rounded-oma"
          >
            <ExternalLink className="size-3.5" />
            Browse Linear
          </Button>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Assignment error toast                                            */}
      {/* ----------------------------------------------------------------- */}
      {assignError && (
        <div className="glass flex items-center gap-3 rounded-oma border border-oma-fail/30 bg-oma-fail/10 px-4 py-2">
          <span className="flex-1 text-sm text-oma-fail">{assignError}</span>
          <button
            type="button"
            onClick={() => setAssignError(null)}
            className="shrink-0 rounded-oma-sm p-1 text-oma-fail/70 hover:text-oma-fail"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Mobile: Card view                                                 */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col gap-3 md:hidden">
        {displayedFeatures.map((feature) => (
          <div
            key={feature.id}
            onClick={() => onSelectFeature(feature)}
            className="glass rounded-oma cursor-pointer p-4 transition-colors hover:bg-white/[0.04] active:bg-white/[0.06]"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <span className="text-sm font-medium text-oma-text">{feature.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(feature);
                }}
                className="flex size-8 shrink-0 items-center justify-center rounded-oma-sm text-oma-text-subtle hover:bg-oma-fail/10 hover:text-oma-fail"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <InlinePrioritySelect
                value={feature.priority}
                onSave={(priority) => void handleInlineUpdate(feature.id, { priority })}
              />
              <InlineStatusSelect
                value={feature.status}
                onSave={(status) => void handleInlineUpdate(feature.id, { status })}
              />
              {feature.category && (
                <span className="inline-block rounded-oma-full bg-oma-primary/15 px-2 py-0.5 text-xs font-medium text-oma-primary">
                  {feature.category}
                </span>
              )}
            </div>
            {feature.linearIssueId && feature.linearIssueUrl && (
              <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                <LinearTicketBadge
                  linearIssueId={feature.linearIssueId}
                  linearIssueUrl={feature.linearIssueUrl}
                />
              </div>
            )}
          </div>
        ))}
        {displayedFeatures.length === 0 && (
          <div className="glass rounded-oma px-4 py-12 text-center">
            <p className="text-sm text-oma-text-muted">
              {features.length === 0
                ? "No features yet. Tap \"Add Feature\" to get started."
                : "No features match your search or filter."}
            </p>
          </div>
        )}
        <div className="px-1 py-1">
          <span className="text-xs text-oma-text-subtle">
            {displayedFeatures.length} of {features.length} feature{features.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Desktop: Table wrapper                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="glass rounded-oma-lg hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {/* Table header */}
            <thead>
              <tr className="border-b border-oma-glass-border">
                <th className="px-4 py-3 text-left">
                  <SortableHeader
                    label="Name"
                    field="name"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortableHeader
                    label="Priority"
                    field="priority"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortableHeader
                    label="Status"
                    field="status"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-oma-text-muted">
                    Category
                  </span>
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-oma-text-muted">
                    Linear
                  </span>
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-oma-text-muted">
                    Linear State
                  </span>
                </th>
                <th className="px-4 py-3 text-left">
                  <SortableHeader
                    label="Created"
                    field="createdAt"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-oma-text-muted">
                    Actions
                  </span>
                </th>
              </tr>
            </thead>

            <tbody>
              {/* --------------------------------------------------------- */}
              {/* Inline "Add Feature" form row                             */}
              {/* --------------------------------------------------------- */}
              {showAddForm && (
                <tr className="glass-sm border-b border-oma-glass-border bg-oma-primary/[0.03]">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      placeholder="Feature name (required)"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleCreate();
                        if (e.key === "Escape") setShowAddForm(false);
                      }}
                      autoFocus
                      className="w-full rounded-oma-sm border border-oma-glass-border-bright bg-oma-bg-surface px-2 py-1 text-sm text-oma-text placeholder:text-oma-text-subtle outline-none focus:border-oma-primary"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(Number(e.target.value))}
                      className="rounded-oma-sm border border-oma-glass-border-bright bg-oma-bg-surface px-1.5 py-1 text-xs text-oma-text outline-none focus:border-oma-primary"
                    >
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {priorityLabel(p)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-oma-full bg-oma-pending/20 px-2 py-0.5 text-xs font-medium text-oma-pending">
                      Pending
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      placeholder="Category"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleCreate();
                      }}
                      className="w-full rounded-oma-sm border border-oma-glass-border-bright bg-oma-bg-surface px-2 py-1 text-xs text-oma-text placeholder:text-oma-text-subtle outline-none focus:border-oma-primary"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-oma-text-subtle">--</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-oma-text-subtle">--</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-oma-text-subtle">Now</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="xs"
                      onClick={() => void handleCreate()}
                      disabled={!newName.trim() || isCreating}
                      className="rounded-oma-sm"
                    >
                      {isCreating ? "Saving..." : "Save"}
                    </Button>
                  </td>
                </tr>
              )}

              {/* --------------------------------------------------------- */}
              {/* Feature rows                                              */}
              {/* --------------------------------------------------------- */}
              {displayedFeatures.map((feature) => (
                <tr
                  key={feature.id}
                  onClick={() => onSelectFeature(feature)}
                  className="glass-sm cursor-pointer border-b border-oma-glass-border transition-colors hover:bg-white/[0.04]"
                >
                  {/* Name (inline editable on double-click) */}
                  <td className="px-4 py-3">
                    <InlineNameEditor
                      value={feature.name}
                      onSave={(name) => void handleInlineUpdate(feature.id, { name })}
                    />
                  </td>

                  {/* Priority (inline dropdown on click) */}
                  <td className="px-4 py-3">
                    <InlinePrioritySelect
                      value={feature.priority}
                      onSave={(priority) => void handleInlineUpdate(feature.id, { priority })}
                    />
                  </td>

                  {/* Status (inline dropdown on click) + progress indicator */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <InlineStatusSelect
                        value={feature.status}
                        onSave={(status) => void handleInlineUpdate(feature.id, { status })}
                      />
                      {feature.status === "in_progress" && (() => {
                        const assignedAgent = AGENT_DEFS.find((a) => a.name === feature.assignedAgentId);
                        const agentLive = feature.assignedAgentId
                          ? agentStatuses[feature.assignedAgentId as AgentName]
                          : undefined;
                        const isActive = agentLive?.status === "working";
                        if (assignedAgent) {
                          return (
                            <span className={cn("flex items-center gap-1 text-[10px]", isActive ? "text-oma-text-muted" : "text-oma-text-subtle")}>
                              <span>{assignedAgent.mascot}</span>
                              {isActive && <span className={cn("inline-block size-1.5 rounded-full animate-pulse", assignedAgent.dotColor)} />}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3">
                    {feature.category ? (
                      <span className="inline-block rounded-oma-full bg-oma-primary/15 px-2 py-0.5 text-xs font-medium text-oma-primary">
                        {feature.category}
                      </span>
                    ) : (
                      <span className="text-xs text-oma-text-subtle">--</span>
                    )}
                  </td>

                  {/* Linear issue badge */}
                  <td className="px-4 py-3">
                    {feature.linearIssueId && feature.linearIssueUrl ? (
                      <span onClick={(e) => e.stopPropagation()}>
                        <LinearTicketBadge
                          linearIssueId={feature.linearIssueId}
                          linearIssueUrl={feature.linearIssueUrl}
                        />
                      </span>
                    ) : (
                      <span className="text-xs text-oma-text-subtle">--</span>
                    )}
                  </td>

                  {/* Linear State */}
                  <td className="px-4 py-3">
                    {feature.linearStateName ? (
                      <span className="inline-block rounded-oma-full bg-oma-info/15 px-2 py-0.5 text-xs font-medium text-oma-info">
                        {feature.linearStateName}
                      </span>
                    ) : (
                      <span className="text-xs text-oma-text-subtle">--</span>
                    )}
                  </td>

                  {/* Created date */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-oma-text-muted">
                      {formatDate(feature.createdAt)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Assign to agent (pending features only) */}
                      {feature.status === "pending" && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssignError(null);
                              setAssigningFeatureId(
                                assigningFeatureId === feature.id ? null : feature.id,
                              );
                            }}
                            className="inline-flex items-center justify-center rounded-oma-sm p-1.5 text-oma-text-subtle transition-colors hover:bg-oma-primary/10 hover:text-oma-primary"
                            title="Assign to agent"
                          >
                            <UserPlus className="size-3.5" />
                          </button>
                          {/* Agent selection popover with live status */}
                          {assigningFeatureId === feature.id && (
                            <div
                              className="glass-lg absolute right-0 top-full z-50 mt-1 w-56 rounded-oma border border-oma-glass-border-bright p-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {AGENT_DEFS.map((agent) => {
                                const live = agentStatuses[agent.name];
                                const isBusy = live?.status === "working";
                                const isErrored = live?.status === "errored";
                                const working = isBusy ? (live as AgentLiveStatusWorking) : null;

                                return (
                                  <button
                                    key={agent.name}
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => void handleAssign(feature.id, agent.name)}
                                    className={cn(
                                      "flex w-full items-center gap-2 rounded-oma-sm px-3 py-2 text-left text-sm transition-colors",
                                      isBusy
                                        ? "cursor-not-allowed opacity-50"
                                        : "hover:bg-white/[0.06]",
                                    )}
                                  >
                                    {/* Status dot */}
                                    <span
                                      className={cn(
                                        "inline-block size-2 shrink-0 rounded-full",
                                        isBusy ? `${agent.dotColor} animate-pulse` : "",
                                        isErrored ? "bg-oma-fail" : "",
                                        !isBusy && !isErrored ? "bg-oma-text-faint" : "",
                                      )}
                                    />
                                    <span className={cn("font-medium", agent.color)}>
                                      {agent.label}
                                    </span>
                                    <span className="flex-1 text-xs text-oma-text-muted">
                                      {agent.role}
                                    </span>
                                    {isBusy && working && (
                                      <span className="max-w-[80px] truncate text-[10px] text-oma-text-subtle" title={working.currentTask}>
                                        Working
                                      </span>
                                    )}
                                    {isErrored && (
                                      <span className="text-[10px] text-oma-fail">
                                        Failed
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(feature);
                        }}
                        className="inline-flex items-center justify-center rounded-oma-sm p-1.5 text-oma-text-subtle transition-colors hover:bg-oma-fail/10 hover:text-oma-fail"
                        title="Delete feature"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* --------------------------------------------------------- */}
              {/* Empty state                                               */}
              {/* --------------------------------------------------------- */}
              {displayedFeatures.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <p className="text-sm text-oma-text-muted">
                      {features.length === 0
                        ? "No features yet. Click \"Add Feature\" to get started."
                        : "No features match your search or filter."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Feature count footer */}
        <div className="border-t border-oma-glass-border px-4 py-2">
          <span className="text-xs text-oma-text-subtle">
            {displayedFeatures.length} of {features.length} feature
            {features.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Delete confirmation dialog                                        */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="glass-lg rounded-oma-lg border-oma-glass-border-bright bg-oma-bg-elevated">
          <DialogHeader>
            <DialogTitle className="font-serif text-oma-text">Delete Feature</DialogTitle>
            <DialogDescription className="text-oma-text-muted">
              Are you sure you want to delete{" "}
              <span className="font-medium text-oma-text">{deleteTarget?.name}</span>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
              className="rounded-oma"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              className="rounded-oma"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
