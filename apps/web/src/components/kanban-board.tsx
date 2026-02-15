"use client";

// ---------------------------------------------------------------------------
// Kanban Board Component
//
// Renders features across five status columns: Pending, In Progress,
// Review Ready, Passing, and Failing. Each column uses a glass surface with
// a colored left-border accent. Cards use the Omakase liquid glass design
// system.
// ---------------------------------------------------------------------------

import { useProjectFeatures } from "@/hooks/use-api";
import { LinearTicketBadge } from "@/components/linear-ticket-badge";
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

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const { data: allFeatures } = useProjectFeatures(projectId);
  const featureList = allFeatures ?? [];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {COLUMNS.map((column) => {
        const features = featureList.filter((f) => f.status === column.status);
        return (
          <div key={column.status} className="flex flex-col">
            {/* Column header — glass surface with colored left accent */}
            <div
              className={`glass-sm rounded-oma mb-3 flex items-center justify-between border-l-4 px-4 py-2.5 ${column.borderColor}`}
            >
              <span className="text-sm font-semibold uppercase tracking-wider text-oma-text">
                {column.label}
              </span>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-oma-bg-surface text-xs font-medium text-oma-text-muted">
                {features.length}
              </span>
            </div>

            {/* Column body */}
            <div className="flex flex-1 flex-col gap-3">
              {features.map((feature) => (
                <div
                  key={feature.id}
                  className="glass rounded-oma glass-hover p-4 transition-all duration-200 hover:scale-[1.02]"
                >
                  {/* Feature name */}
                  <h3 className="mb-2 text-sm font-semibold leading-tight text-oma-text">
                    {feature.name}
                  </h3>

                  {/* Tags row */}
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    {/* Priority badge */}
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityColor(feature.priority)}`}
                    >
                      {priorityLabel(feature.priority)}
                    </span>

                    {/* Category tag */}
                    {feature.category && (
                      <span className="inline-block rounded-full bg-oma-primary/15 px-2 py-0.5 text-[10px] font-medium text-oma-primary">
                        {feature.category}
                      </span>
                    )}
                  </div>

                  {/* Linear badge */}
                  {feature.linearIssueId && feature.linearIssueUrl && (
                    <div className="mb-2">
                      <LinearTicketBadge
                        linearIssueId={feature.linearIssueId}
                        linearIssueUrl={feature.linearIssueUrl}
                      />
                    </div>
                  )}

                  {/* Dependency count */}
                  {feature.dependencies.length > 0 && (
                    <p className="text-[11px] font-medium text-oma-text-subtle">
                      {feature.dependencies.length} dependenc{feature.dependencies.length === 1 ? "y" : "ies"}
                    </p>
                  )}
                </div>
              ))}

              {/* Empty state */}
              {features.length === 0 && (
                <div className="glass-sm rounded-oma flex h-24 items-center justify-center border border-dashed border-oma-glass-border">
                  <span className="text-xs font-medium text-oma-text-muted">
                    No features
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
