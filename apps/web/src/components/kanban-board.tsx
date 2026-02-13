"use client";

// ---------------------------------------------------------------------------
// Kanban Board Component
//
// Renders features across four status columns: Pending, In Progress, Passing,
// and Failing. Each column has a distinct color header consistent with the
// neobrutalism design tokens defined in globals.css.
// ---------------------------------------------------------------------------

interface Feature {
  id: string;
  name: string;
  priority: number;
  category: string;
  status: "pending" | "in_progress" | "passing" | "failing";
  dependencyCount: number;
}

const MOCK_FEATURES: Feature[] = [
  { id: "f1", name: "User Authentication", priority: 1, category: "Auth", status: "passing", dependencyCount: 0 },
  { id: "f2", name: "Database Schema", priority: 1, category: "Core", status: "passing", dependencyCount: 0 },
  { id: "f3", name: "Product Listing", priority: 2, category: "Commerce", status: "passing", dependencyCount: 1 },
  { id: "f4", name: "Shopping Cart", priority: 2, category: "Commerce", status: "in_progress", dependencyCount: 2 },
  { id: "f5", name: "Checkout Flow", priority: 3, category: "Commerce", status: "pending", dependencyCount: 3 },
  { id: "f6", name: "Payment Integration", priority: 3, category: "Payments", status: "pending", dependencyCount: 2 },
  { id: "f7", name: "Order History", priority: 4, category: "Commerce", status: "pending", dependencyCount: 2 },
  { id: "f8", name: "Search & Filters", priority: 3, category: "UI", status: "in_progress", dependencyCount: 1 },
  { id: "f9", name: "Email Notifications", priority: 5, category: "Infra", status: "failing", dependencyCount: 1 },
  { id: "f10", name: "Admin Dashboard", priority: 4, category: "Admin", status: "pending", dependencyCount: 4 },
];

interface ColumnConfig {
  status: Feature["status"];
  label: string;
  headerBg: string;
  dotColor: string;
}

const COLUMNS: ColumnConfig[] = [
  { status: "pending", label: "Pending", headerBg: "bg-neo-pending", dotColor: "bg-neo-pending" },
  { status: "in_progress", label: "In Progress", headerBg: "bg-neo-progress", dotColor: "bg-neo-progress" },
  { status: "passing", label: "Passing", headerBg: "bg-neo-done", dotColor: "bg-neo-done" },
  { status: "failing", label: "Failing", headerBg: "bg-neo-fail", dotColor: "bg-neo-fail" },
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

/** Maps priority numbers to background color classes */
function priorityColor(priority: number): string {
  const colors: Record<number, string> = {
    1: "bg-neo-fail text-white",
    2: "bg-neo-accent text-neo-foreground",
    3: "bg-neo-progress text-neo-foreground",
    4: "bg-neo-muted text-neo-foreground",
    5: "bg-neo-muted text-neo-muted-foreground",
  };
  return colors[priority] ?? "bg-neo-muted text-neo-foreground";
}

export function KanbanBoard() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      {COLUMNS.map((column) => {
        const features = MOCK_FEATURES.filter((f) => f.status === column.status);
        return (
          <div key={column.status} className="flex flex-col">
            {/* Column header */}
            <div
              className={`neo-border mb-3 flex items-center justify-between px-4 py-2.5 ${column.headerBg}`}
            >
              <span className="text-sm font-black uppercase tracking-wider text-neo-foreground">
                {column.label}
              </span>
              <span className="neo-border inline-flex h-6 w-6 items-center justify-center bg-white text-xs font-bold text-neo-foreground">
                {features.length}
              </span>
            </div>

            {/* Column body */}
            <div className="flex flex-1 flex-col gap-3">
              {features.map((feature) => (
                <div
                  key={feature.id}
                  className="neo-card rounded-none p-4 transition-transform hover:-translate-y-0.5"
                >
                  {/* Feature name */}
                  <h3 className="mb-2 text-sm font-black leading-tight text-neo-foreground">
                    {feature.name}
                  </h3>

                  {/* Tags row */}
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    {/* Priority badge */}
                    <span
                      className={`neo-border inline-block rounded-none px-1.5 py-0.5 text-[10px] font-bold uppercase ${priorityColor(feature.priority)}`}
                    >
                      {priorityLabel(feature.priority)}
                    </span>

                    {/* Category tag */}
                    <span className="neo-border inline-block rounded-none bg-neo-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                      {feature.category}
                    </span>
                  </div>

                  {/* Dependency count */}
                  {feature.dependencyCount > 0 && (
                    <p className="text-[11px] font-semibold text-neo-muted-foreground">
                      {feature.dependencyCount} dependenc{feature.dependencyCount === 1 ? "y" : "ies"}
                    </p>
                  )}
                </div>
              ))}

              {/* Empty state */}
              {features.length === 0 && (
                <div className="neo-border flex h-24 items-center justify-center border-dashed bg-neo-muted">
                  <span className="text-xs font-bold text-neo-muted-foreground">
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
