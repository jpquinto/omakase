"use client";

// ---------------------------------------------------------------------------
// Agent Queue List
//
// Displays an ordered list of queued jobs for a specific agent. Each row shows
// position, prompt summary, time since queued, and reorder/remove controls.
// Uses the Omakase Liquid Glass design system with staggered entrance
// animations and agent-specific accent colors.
// ---------------------------------------------------------------------------

import { ChevronDown, ChevronUp, Loader2, X } from "lucide-react";
import type { AgentName } from "@omakase/db";
import { cn } from "@/lib/utils";
import { useAgentQueue } from "@/hooks/use-agent-queue";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentQueueListProps {
  agentName: AgentName;
  /** Tailwind color class like "oma-gold" (without prefix) */
  accentColor: string;
}

// ---------------------------------------------------------------------------
// Accent color mappings — maps oma-* token names to Tailwind classes for the
// position number and border highlights.
// ---------------------------------------------------------------------------

const ACCENT_TEXT_CLASSES: Record<string, string> = {
  "oma-gold": "text-oma-gold",
  "oma-indigo": "text-oma-indigo",
  "oma-secondary": "text-oma-secondary",
  "oma-jade": "text-oma-jade",
};

const ACCENT_BG_CLASSES: Record<string, string> = {
  "oma-gold": "bg-oma-gold/10",
  "oma-indigo": "bg-oma-indigo/10",
  "oma-secondary": "bg-oma-secondary/10",
  "oma-jade": "bg-oma-jade/10",
};

const ACCENT_BORDER_CLASSES: Record<string, string> = {
  "oma-gold": "border-oma-gold/20",
  "oma-indigo": "border-oma-indigo/20",
  "oma-secondary": "border-oma-secondary/20",
  "oma-jade": "border-oma-jade/20",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format an ISO timestamp as a compact relative time string (e.g. "2m ago"). */
function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;

  if (Number.isNaN(diffMs) || diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Truncate a string to a max length, appending ellipsis if trimmed. */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "\u2026";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AgentQueueList({ agentName, accentColor }: AgentQueueListProps) {
  const { queue, isLoading, removeJob, reorderJob } = useAgentQueue(agentName);

  const textClass = ACCENT_TEXT_CLASSES[accentColor] ?? "text-oma-text-muted";
  const bgClass = ACCENT_BG_CLASSES[accentColor] ?? "bg-oma-text/10";
  const borderClass = ACCENT_BORDER_CLASSES[accentColor] ?? "border-oma-glass-border";

  // Loading state
  if (isLoading) {
    return (
      <div className="glass rounded-oma p-6">
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="size-4 animate-spin text-oma-text-subtle" />
          <span className="text-sm text-oma-text-muted">Loading queue...</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (queue.length === 0) {
    return (
      <div className="glass rounded-oma p-6">
        <p className="py-4 text-center text-sm text-oma-text-muted">
          No jobs queued
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-oma overflow-hidden">
      {/* Queue items */}
      <div className="divide-y divide-white/[0.04]">
        {queue.map((job, index) => (
          <div
            key={job.jobId}
            className={cn(
              "group/row flex items-center gap-3 px-4 py-3",
              "transition-colors duration-200 hover:bg-white/[0.03]",
              "animate-oma-fade-up opacity-0",
            )}
            style={{
              animationDelay: `${index * 60}ms`,
              animationFillMode: "forwards",
            }}
          >
            {/* Position number */}
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-oma-full border text-xs font-semibold",
                textClass,
                bgClass,
                borderClass,
              )}
            >
              {index + 1}
            </span>

            {/* Prompt summary and timestamp */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-oma-text">
                {truncate(job.prompt, 60)}
              </p>
              <p className="text-[10px] text-oma-text-subtle">
                {formatRelativeTime(job.queuedAt)}
              </p>
            </div>

            {/* Reorder and remove controls — visible on hover */}
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover/row:opacity-100">
              {/* Move up */}
              <button
                type="button"
                disabled={index === 0}
                onClick={() => void reorderJob(job.jobId, index - 1)}
                className={cn(
                  "inline-flex items-center justify-center rounded-oma-sm p-1 text-oma-text-subtle transition-colors",
                  index === 0
                    ? "cursor-not-allowed opacity-30"
                    : "hover:bg-white/[0.06] hover:text-oma-text",
                )}
                title="Move up"
              >
                <ChevronUp className="size-3.5" />
              </button>

              {/* Move down */}
              <button
                type="button"
                disabled={index === queue.length - 1}
                onClick={() => void reorderJob(job.jobId, index + 1)}
                className={cn(
                  "inline-flex items-center justify-center rounded-oma-sm p-1 text-oma-text-subtle transition-colors",
                  index === queue.length - 1
                    ? "cursor-not-allowed opacity-30"
                    : "hover:bg-white/[0.06] hover:text-oma-text",
                )}
                title="Move down"
              >
                <ChevronDown className="size-3.5" />
              </button>

              {/* Remove */}
              <button
                type="button"
                onClick={() => void removeJob(job.jobId)}
                className="inline-flex items-center justify-center rounded-oma-sm p-1 text-oma-text-subtle transition-colors hover:bg-oma-fail/10 hover:text-oma-fail"
                title="Remove from queue"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer count */}
      <div className="border-t border-oma-glass-border px-4 py-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-oma-text-subtle">
          {queue.length} job{queue.length !== 1 ? "s" : ""} queued
        </span>
      </div>
    </div>
  );
}
