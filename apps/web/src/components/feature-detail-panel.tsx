"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Plus,
  Trash2,
  AlertTriangle,
  Calendar,
  Clock,
  Link2,
  Tag,
  Layers,
  FileText,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { useAgentStatus } from "@/hooks/use-agent-status";
import { useAgentDispatch } from "@/hooks/use-agent-dispatch";
import type { AgentName, AgentLiveStatusWorking } from "@omakase/db";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { LinearTicketBadge } from "@/components/linear-ticket-badge";
import { toast } from "@/components/toast-provider";
import type { Feature, FeatureStatus } from "@omakase/db";

// ---------------------------------------------------------------------------
// Feature Detail Panel
//
// Slide-out panel that appears from the right side of the viewport. Provides
// inline editing for all feature fields, dependency management with cycle
// detection, and Linear issue linking. Follows the Omakase liquid glass
// design system.
// ---------------------------------------------------------------------------

interface FeatureDetailPanelProps {
  feature: Feature | null;
  allFeatures: Feature[];
  onClose: () => void;
  onUpdate: () => void;
}

// -- Status & Priority Configuration -----------------------------------------

const FEATURE_STATUSES: { value: FeatureStatus; label: string; color: string }[] = [
  { value: "pending", label: "Pending", color: "bg-oma-pending/20 text-oma-pending" },
  { value: "in_progress", label: "In Progress", color: "bg-oma-progress/20 text-oma-progress" },
  { value: "review_ready", label: "Review Ready", color: "bg-oma-review/20 text-oma-review" },
  { value: "passing", label: "Passing", color: "bg-oma-done/20 text-oma-done" },
  { value: "failing", label: "Failing", color: "bg-oma-fail/20 text-oma-fail" },
];

const PRIORITIES: { value: number; label: string; color: string }[] = [
  { value: 1, label: "P1 Critical", color: "bg-oma-fail/20 text-oma-fail" },
  { value: 2, label: "P2 High", color: "bg-oma-secondary/20 text-oma-secondary" },
  { value: 3, label: "P3 Medium", color: "bg-oma-progress/20 text-oma-progress" },
  { value: 4, label: "P4 Low", color: "bg-oma-bg-surface text-oma-text-muted" },
  { value: 5, label: "P5 Minor", color: "bg-oma-bg-surface text-oma-text-faint" },
];

// -- Helpers -----------------------------------------------------------------

function statusConfig(status: FeatureStatus) {
  return FEATURE_STATUSES.find((s) => s.value === status) ?? FEATURE_STATUSES[0];
}

function priorityConfig(priority: number) {
  return PRIORITIES.find((p) => p.value === priority) ?? PRIORITIES[2];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Patch a feature field through the API. Returns true on success.
 * Surfaces errors via toast and returns false on failure.
 */
async function patchFeature(
  featureId: string,
  fields: Partial<Pick<Feature, "name" | "description" | "category" | "status" | "priority">>,
): Promise<boolean> {
  try {
    await apiFetch(`/api/features/${featureId}`, {
      method: "PATCH",
      body: JSON.stringify(fields),
    });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update feature";
    toast.error(message);
    return false;
  }
}

// -- Dropdown Component ------------------------------------------------------

/**
 * Generic dropdown used for status, priority, and dependency selection.
 * Renders as a glass-sm popover anchored below the trigger element.
 */
function Dropdown<T extends string | number>({
  trigger,
  items,
  onSelect,
  className,
}: {
  trigger: React.ReactNode;
  items: { value: T; label: string; color?: string }[];
  onSelect: (value: T) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1 transition-opacity hover:opacity-80"
      >
        {trigger}
        <ChevronDown className="h-3 w-3 text-oma-text-subtle" />
      </button>

      {open && (
        <div className="glass absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-oma p-1 shadow-oma animate-oma-scale-in">
          {items.map((item) => (
            <button
              key={String(item.value)}
              type="button"
              onClick={() => {
                onSelect(item.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-oma-sm px-3 py-2 text-left text-sm transition-colors",
                "hover:bg-oma-bg-surface/80 text-oma-text",
              )}
            >
              {item.color && (
                <span className={cn("inline-block h-2 w-2 rounded-full", item.color.split(" ")[0])} />
              )}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// -- Main Panel Component ----------------------------------------------------

export function FeatureDetailPanel({
  feature,
  allFeatures,
  onClose,
  onUpdate,
}: FeatureDetailPanelProps) {
  // Local state for editable fields — initialised from the feature prop
  const [name, setName] = useState(feature?.name ?? "");
  const [description, setDescription] = useState(feature?.description ?? "");
  const [category, setCategory] = useState(feature?.category ?? "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [depError, setDepError] = useState<string | null>(null);
  const [addingDep, setAddingDep] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Sync local state when the feature prop changes (e.g. after onUpdate)
  useEffect(() => {
    if (feature) {
      setName(feature.name);
      setDescription(feature.description ?? "");
      setCategory(feature.category ?? "");
    }
  }, [feature]);

  // Focus the name input when entering edit mode
  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  // -- Field save handlers ---------------------------------------------------
  // These are only callable when feature is non-null (guarded in JSX).

  const saveName = async () => {
    if (!feature) return;
    setIsEditingName(false);
    const trimmed = name.trim();
    if (!trimmed || trimmed === feature.name) {
      setName(feature.name);
      return;
    }
    const ok = await patchFeature(feature.id, { name: trimmed });
    if (ok) {
      toast.success("Feature name updated");
      onUpdate();
    } else {
      setName(feature.name);
    }
  };

  const saveDescription = async () => {
    if (!feature) return;
    const trimmed = description.trim();
    if (trimmed === (feature.description ?? "")) return;
    const ok = await patchFeature(feature.id, { description: trimmed });
    if (ok) {
      toast.success("Description updated");
      onUpdate();
    } else {
      setDescription(feature.description ?? "");
    }
  };

  const saveCategory = async () => {
    if (!feature) return;
    const trimmed = category.trim();
    if (trimmed === (feature.category ?? "")) return;
    const ok = await patchFeature(feature.id, { category: trimmed });
    if (ok) {
      toast.success("Category updated");
      onUpdate();
    } else {
      setCategory(feature.category ?? "");
    }
  };

  const changeStatus = async (newStatus: FeatureStatus) => {
    if (!feature) return;
    if (newStatus === feature.status) return;
    const ok = await patchFeature(feature.id, { status: newStatus });
    if (ok) {
      toast.success(`Status changed to ${statusConfig(newStatus).label}`);
      onUpdate();
    }
  };

  const changePriority = async (newPriority: number) => {
    if (!feature) return;
    if (newPriority === feature.priority) return;
    const ok = await patchFeature(feature.id, { priority: newPriority });
    if (ok) {
      toast.success(`Priority changed to ${priorityConfig(newPriority).label}`);
      onUpdate();
    }
  };

  // -- Dependency management -------------------------------------------------

  const addDependency = async (dependsOnId: string) => {
    if (!feature) return;
    setDepError(null);
    try {
      await apiFetch(`/api/features/${feature.id}/dependencies`, {
        method: "POST",
        body: JSON.stringify({ dependsOnId }),
      });
      toast.success("Dependency added");
      onUpdate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add dependency";
      if (message.includes("409")) {
        setDepError("Cannot add dependency: this would create a circular reference.");
        toast.error("Circular dependency detected");
      } else {
        setDepError(message);
        toast.error(message);
      }
    } finally {
      setAddingDep(false);
    }
  };

  const removeDependency = async (dependsOnId: string) => {
    if (!feature) return;
    setDepError(null);
    try {
      await apiFetch(`/api/features/${feature.id}/dependencies/${dependsOnId}`, {
        method: "DELETE",
      });
      toast.success("Dependency removed");
      onUpdate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove dependency";
      toast.error(message);
    }
  };

  // Build the list of features available for adding as dependencies
  const availableDeps = feature
    ? allFeatures.filter(
        (f) => f.id !== feature.id && !feature.dependencies.includes(f.id),
      )
    : [];

  // Resolve dependency IDs to their Feature objects for display
  const resolvedDeps = feature
    ? (feature.dependencies
        .map((depId) => allFeatures.find((f) => f.id === depId))
        .filter(Boolean) as Feature[])
    : [];

  const currentStatus = feature ? statusConfig(feature.status) : FEATURE_STATUSES[0];
  const currentPriority = feature ? priorityConfig(feature.priority) : PRIORITIES[2];

  return (
    <Dialog open={!!feature} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        showCloseButton
        className={cn(
          "glass-lg flex w-full flex-col overflow-hidden border border-oma-glass-border bg-oma-bg-elevated p-0 shadow-oma-lg",
          // Mobile: full-screen overlay
          "h-[100dvh] max-w-none rounded-none",
          // Desktop: centered dialog
          "md:max-h-[85vh] md:h-auto md:max-w-lg md:rounded-oma-lg",
        )}
      >
        <DialogTitle className="sr-only">
          Feature Details{feature ? `: ${feature.name}` : ""}
        </DialogTitle>

        {feature && (
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-0">
            {/* -- Section: Header / Name -- */}
            <div className="border-b border-oma-glass-border px-6 py-5">
              {isEditingName ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") {
                      setName(feature.name);
                      setIsEditingName(false);
                    }
                  }}
                  className={cn(
                    "w-full bg-transparent font-serif text-2xl font-semibold text-oma-text",
                    "border-b-2 border-oma-primary/40 outline-none",
                    "placeholder:text-oma-text-faint",
                  )}
                  placeholder="Feature name"
                />
              ) : (
                <h2
                  onClick={() => setIsEditingName(true)}
                  className={cn(
                    "cursor-pointer font-serif text-2xl font-semibold text-oma-text",
                    "rounded-oma-sm px-1 -mx-1 transition-colors",
                    "hover:bg-oma-bg-surface/50",
                  )}
                  title="Click to edit name"
                >
                  {feature.name}
                </h2>
              )}
            </div>

            {/* -- Section: Status & Priority -- */}
            <div className="flex items-center gap-3 border-b border-oma-glass-border px-6 py-4">
              <Dropdown<FeatureStatus>
                trigger={
                  <span
                    className={cn(
                      "inline-flex items-center rounded-oma-full px-3 py-1 text-xs font-medium",
                      currentStatus.color,
                    )}
                  >
                    {currentStatus.label}
                  </span>
                }
                items={FEATURE_STATUSES}
                onSelect={changeStatus}
              />

              <Dropdown<number>
                trigger={
                  <span
                    className={cn(
                      "inline-flex items-center rounded-oma-full px-3 py-1 text-xs font-medium",
                      currentPriority.color,
                    )}
                  >
                    {currentPriority.label}
                  </span>
                }
                items={PRIORITIES}
                onSelect={changePriority}
              />
            </div>

            {/* -- Section: Assign Agent -- */}
            <div className="border-b border-oma-glass-border px-6 py-4">
              <label className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-oma-text-subtle">
                <Bot className="h-3.5 w-3.5" />
                Assign Agent
              </label>
              <AssignAgentRow feature={feature} onClose={onClose} />
            </div>

            {/* -- Section: Description -- */}
            <div className="border-b border-oma-glass-border px-6 py-4">
              <label className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-oma-text-subtle">
                <FileText className="h-3.5 w-3.5" />
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={saveDescription}
                rows={4}
                placeholder="Add a description..."
                className={cn(
                  "glass-sm w-full resize-none rounded-oma bg-transparent px-3 py-2.5",
                  "text-sm leading-relaxed text-oma-text",
                  "border border-oma-glass-border outline-none transition-colors",
                  "placeholder:text-oma-text-faint",
                  "focus:border-oma-primary/40 focus:ring-1 focus:ring-oma-primary/20",
                )}
              />
            </div>

            {/* -- Section: Category -- */}
            <div className="border-b border-oma-glass-border px-6 py-4">
              <label className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-oma-text-subtle">
                <Tag className="h-3.5 w-3.5" />
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                onBlur={saveCategory}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                placeholder="e.g. Auth, Commerce, UI"
                className={cn(
                  "glass-sm w-full rounded-oma bg-transparent px-3 py-2",
                  "text-sm text-oma-text",
                  "border border-oma-glass-border outline-none transition-colors",
                  "placeholder:text-oma-text-faint",
                  "focus:border-oma-primary/40 focus:ring-1 focus:ring-oma-primary/20",
                )}
              />
            </div>

            {/* -- Section: Linear Issue -- */}
            {feature.linearIssueId && feature.linearIssueUrl && (
              <div className="border-b border-oma-glass-border px-6 py-4">
                <label className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-oma-text-subtle">
                  <Link2 className="h-3.5 w-3.5" />
                  Linear Issue
                </label>
                <LinearTicketBadge
                  linearIssueId={feature.linearIssueId}
                  linearIssueUrl={feature.linearIssueUrl}
                />
              </div>
            )}

            {/* -- Section: Dependencies -- */}
            <div className="border-b border-oma-glass-border px-6 py-4">
              <label className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-oma-text-subtle">
                <Layers className="h-3.5 w-3.5" />
                Dependencies
                {resolvedDeps.length > 0 && (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-oma-bg-surface text-[10px] font-semibold text-oma-text-muted">
                    {resolvedDeps.length}
                  </span>
                )}
              </label>

              {/* Dependency cycle / error banner */}
              {depError && (
                <div className="mb-3 flex items-start gap-2 rounded-oma border border-oma-error/30 bg-oma-error/10 px-3 py-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-oma-error" />
                  <p className="text-[11px] leading-relaxed text-oma-error">{depError}</p>
                </div>
              )}

              {/* Current dependencies */}
              {resolvedDeps.length > 0 ? (
                <div className="mb-3 space-y-2">
                  {resolvedDeps.map((dep) => {
                    const depStatus = statusConfig(dep.status);
                    return (
                      <div
                        key={dep.id}
                        className="glass-sm flex items-center justify-between rounded-oma px-3 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={cn(
                              "inline-block h-2 w-2 shrink-0 rounded-full",
                              depStatus.color.split(" ")[0],
                            )}
                          />
                          <span className="truncate text-sm text-oma-text">
                            {dep.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDependency(dep.id)}
                          className={cn(
                            "ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-oma-sm",
                            "text-oma-text-subtle transition-colors",
                            "hover:bg-oma-error/10 hover:text-oma-error",
                          )}
                          aria-label={`Remove dependency on ${dep.name}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mb-3 text-xs text-oma-text-faint">
                  No dependencies added yet.
                </p>
              )}

              {/* Add dependency */}
              {availableDeps.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAddingDep((prev) => !prev)}
                    className={cn(
                      "glass-sm flex w-full items-center justify-center gap-1.5 rounded-oma px-3 py-2",
                      "text-xs font-medium text-oma-text-muted transition-colors",
                      "border border-dashed border-oma-glass-border",
                      "hover:border-oma-primary/30 hover:text-oma-primary",
                    )}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Dependency
                  </button>

                  {addingDep && (
                    <AddDependencyDropdown
                      features={availableDeps}
                      onSelect={addDependency}
                      onClose={() => setAddingDep(false)}
                    />
                  )}
                </div>
              )}
            </div>

            {/* -- Section: Metadata Footer -- */}
            <div className="px-6 py-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-oma-text-subtle">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Created {formatDate(feature.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-oma-text-subtle">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Updated {formatDate(feature.updatedAt)}</span>
                </div>
                {feature.completedAt && (
                  <div className="flex items-center gap-2 text-xs text-oma-done">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Completed {formatDate(feature.completedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Add Dependency Dropdown
//
// A searchable dropdown that appears below the "Add Dependency" button.
// Filters features in real time as the user types.
// ---------------------------------------------------------------------------

function AddDependencyDropdown({
  features,
  onSelect,
  onClose,
}: {
  features: Feature[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the search input when the dropdown opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const filtered = features.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      ref={ref}
      className="glass absolute left-0 top-full z-50 mt-1 w-full rounded-oma p-2 shadow-oma animate-oma-scale-in"
    >
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search features..."
        className={cn(
          "mb-1.5 w-full rounded-oma-sm bg-oma-bg-surface/60 px-3 py-1.5",
          "text-xs text-oma-text outline-none",
          "placeholder:text-oma-text-faint",
          "border border-oma-glass-border focus:border-oma-primary/40",
        )}
      />

      <div className="max-h-48 overflow-y-auto">
        {filtered.length > 0 ? (
          filtered.map((f) => {
            const depStatus = statusConfig(f.status);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onSelect(f.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-oma-sm px-3 py-2 text-left",
                  "text-sm text-oma-text transition-colors",
                  "hover:bg-oma-bg-surface/80",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-2 w-2 shrink-0 rounded-full",
                    depStatus.color.split(" ")[0],
                  )}
                />
                <span className="truncate">{f.name}</span>
              </button>
            );
          })
        ) : (
          <p className="px-3 py-2 text-xs text-oma-text-faint">
            No matching features
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assign Agent Row
//
// Shows the 4 agents as selectable buttons. Busy agents show a "Working"
// badge and cannot be selected. Clicking an idle agent dispatches it with
// the feature's context as the prompt.
// ---------------------------------------------------------------------------

const AGENT_BUTTONS = [
  { id: "miso" as AgentName, name: "Miso", mascot: "\u{1F35C}", color: "oma-gold" },
  { id: "nori" as AgentName, name: "Nori", mascot: "\u{1F359}", color: "oma-indigo" },
  { id: "koji" as AgentName, name: "Koji", mascot: "\u{1F376}", color: "oma-secondary" },
  { id: "toro" as AgentName, name: "Toro", mascot: "\u{1F363}", color: "oma-jade" },
];

function AssignAgentRow({ feature, onClose }: { feature: Feature; onClose: () => void }) {
  const router = useRouter();
  const { agents: agentStatuses } = useAgentStatus();
  const { dispatch, isDispatching } = useAgentDispatch();

  const handleAssign = async (agentName: AgentName) => {
    const prompt = `Work on feature: ${feature.name}${feature.description ? `\n\nDescription: ${feature.description}` : ""}`;
    try {
      const result = await dispatch({
        agentName,
        projectId: feature.projectId,
        prompt,
      });
      onClose();
      router.push(`/agents/${agentName}/chat?thread=${result.threadId}`);
    } catch {
      // Error handled by hook
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {AGENT_BUTTONS.map((agent) => {
        const status = agentStatuses[agent.id];
        const isBusy = status?.status === "working";
        return (
          <button
            key={agent.id}
            onClick={() => !isBusy && handleAssign(agent.id)}
            disabled={isBusy || isDispatching}
            className={cn(
              "glass-sm flex items-center gap-2 rounded-oma px-3 py-2 text-sm transition-all duration-200",
              isBusy
                ? "cursor-not-allowed opacity-50"
                : "hover:-translate-y-0.5 hover:shadow-oma-sm hover:border-oma-glass-border-bright",
            )}
            title={isBusy ? `${agent.name} is busy: ${(status as AgentLiveStatusWorking).currentTask}` : `Assign to ${agent.name}`}
          >
            <span className="text-base">{agent.mascot}</span>
            <span className="font-medium text-oma-text">{agent.name}</span>
            {isBusy && (
              <span className="rounded-oma-full bg-oma-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-oma-warning">
                Working
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
