"use client";

// ---------------------------------------------------------------------------
// Kanban Board Component
//
// Renders features across five status columns: Pending, In Progress,
// Review Ready, Passing, and Failing. Each column uses a glass surface with
// a colored left-border accent. Cards use the Omakase liquid glass design
// system.
//
// Mobile: single-column tab view with horizontal tab navigation.
// Desktop: 5-column grid.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { useProjectFeatures } from "@/hooks/use-api";
import { LinearTicketBadge } from "@/components/linear-ticket-badge";
import { cn } from "@/lib/utils";
import type { Feature } from "@omakase/db";

interface ColumnConfig {
  status: Feature["status"];
  label: string;
  borderColor: string;
}

const COLUMNS: ColumnConfig[] = [
  { status: "pending", label: "Pending", borderColor: "border-oma-pending" },
  { status: "in_progress", label: "In Progress", borderColor: "border-oma-progress" },
  { status: "review_ready", label: "Ready for Review", borderColor: "border-oma-review" },
  { status: "passing", label: "Passing", borderColor: "border-oma-done" },
  { status: "failing", label: "Failing", borderColor: "border-oma-fail" },
];

/** Maps priority numbers (1-5) to display labels */
function priorityLabel(priority: number): string {
  const labels: Record<number, string> = {
    1: "P1 Critical",
    2: "P2 High",
    3: "P3 Medium",
    4: "P4 Low",
    5: "P5 Minor",
  };
  return labels[priority] ?? `P${priority}`;
}

/** Maps priority numbers to Omakase color classes */
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

interface KanbanBoardProps {
  projectId: string;
}

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <div className="glass rounded-oma glass-hover p-4 transition-all duration-200 hover:scale-[1.02]">
      <h3 className="mb-2 text-sm font-semibold leading-tight text-oma-text">
        {feature.name}
      </h3>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityColor(feature.priority)}`}
        >
          {priorityLabel(feature.priority)}
        </span>
        {feature.category && (
          <span className="inline-block rounded-full bg-oma-primary/15 px-2 py-0.5 text-[10px] font-medium text-oma-primary">
            {feature.category}
          </span>
        )}
      </div>
      {feature.linearIssueId && feature.linearIssueUrl && (
        <div className="mb-2">
          <LinearTicketBadge
            linearIssueId={feature.linearIssueId}
            linearIssueUrl={feature.linearIssueUrl}
          />
        </div>
      )}
      {feature.dependencies.length > 0 && (
        <p className="text-[11px] font-medium text-oma-text-subtle">
          {feature.dependencies.length} dependenc{feature.dependencies.length === 1 ? "y" : "ies"}
        </p>
      )}
    </div>
  );
}

function ColumnContent({ features }: { features: Feature[] }) {
  if (features.length === 0) {
    return (
      <div className="glass-sm rounded-oma flex h-24 items-center justify-center border border-dashed border-oma-glass-border">
        <span className="text-xs font-medium text-oma-text-muted">No features</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {features.map((feature) => (
        <FeatureCard key={feature.id} feature={feature} />
      ))}
    </div>
  );
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const { data: allFeatures } = useProjectFeatures(projectId);
  const featureList = allFeatures ?? [];
  const [activeTab, setActiveTab] = useState(0);

  // Group features by column
  const columnFeatures = COLUMNS.map((column) =>
    featureList.filter((f) => f.status === column.status)
  );

  return (
    <>
      {/* ── Mobile: tab navigation + single column view ── */}
      <div className="md:hidden">
        {/* Horizontal tab bar */}
        <div className="mb-4 flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {COLUMNS.map((column, i) => (
            <button
              key={column.status}
              onClick={() => setActiveTab(i)}
              className={cn(
                "flex min-h-[44px] shrink-0 items-center gap-2 rounded-oma-sm px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all",
                activeTab === i
                  ? "glass-primary text-oma-primary"
                  : "text-oma-text-muted hover:bg-white/[0.04]"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", column.borderColor.replace("border-", "bg-"))} />
              {column.label}
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-oma-bg-surface text-[10px] font-medium text-oma-text-muted">
                {columnFeatures[i].length}
              </span>
            </button>
          ))}
        </div>

        {/* Active column content */}
        <ColumnContent features={columnFeatures[activeTab]} />
      </div>

      {/* ── Desktop: 5-column grid ── */}
      <div className="hidden gap-4 md:grid md:grid-cols-5">
        {COLUMNS.map((column, i) => (
          <div key={column.status} className="flex flex-col">
            <div
              className={`glass-sm rounded-oma mb-3 flex items-center justify-between border-l-4 px-4 py-2.5 ${column.borderColor}`}
            >
              <span className="text-sm font-semibold uppercase tracking-wider text-oma-text">
                {column.label}
              </span>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-oma-bg-surface text-xs font-medium text-oma-text-muted">
                {columnFeatures[i].length}
              </span>
            </div>
            <div className="flex flex-1 flex-col">
              <ColumnContent features={columnFeatures[i]} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
