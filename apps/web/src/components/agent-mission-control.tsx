"use client";

// ---------------------------------------------------------------------------
// Agent Mission Control Component
//
// Displays a grid of agent cards showing each agent's mascot, name, role,
// current status, and the feature they are working on. Matches the mascot
// naming convention from the existing Omakase UI (AgentMissionControl.tsx).
// ---------------------------------------------------------------------------

interface Agent {
  id: string;
  name: string;
  mascot: string;
  role: "architect" | "coder" | "reviewer" | "tester";
  status: "idle" | "running" | "stopped" | "failed";
  currentFeature: string | null;
}

const MOCK_AGENTS: Agent[] = [
  {
    id: "a1",
    name: "Spark",
    mascot: "\u26A1", // lightning bolt
    role: "architect",
    status: "running",
    currentFeature: "Database Schema",
  },
  {
    id: "a2",
    name: "Fizz",
    mascot: "\uD83E\uDDEA", // test tube
    role: "coder",
    status: "running",
    currentFeature: "Shopping Cart",
  },
  {
    id: "a3",
    name: "Octo",
    mascot: "\uD83D\uDC19", // octopus
    role: "reviewer",
    status: "idle",
    currentFeature: null,
  },
  {
    id: "a4",
    name: "Hoot",
    mascot: "\uD83E\uDD89", // owl
    role: "tester",
    status: "running",
    currentFeature: "User Authentication",
  },
];

/** Maps agent status to a dot color class */
function statusDotColor(status: Agent["status"]): string {
  const colors: Record<Agent["status"], string> = {
    idle: "bg-neo-muted-foreground",
    running: "bg-neo-done",
    stopped: "bg-neo-pending",
    failed: "bg-neo-fail",
  };
  return colors[status];
}

/** Maps agent status to a human-readable label */
function statusLabel(status: Agent["status"]): string {
  const labels: Record<Agent["status"], string> = {
    idle: "Idle",
    running: "Running",
    stopped: "Stopped",
    failed: "Failed",
  };
  return labels[status];
}

/** Maps agent role to a styled background */
function roleBadgeColor(role: Agent["role"]): string {
  const colors: Record<Agent["role"], string> = {
    architect: "bg-neo-primary text-white",
    coder: "bg-neo-progress text-neo-foreground",
    reviewer: "bg-neo-accent text-neo-foreground",
    tester: "bg-neo-done text-neo-foreground",
  };
  return colors[role];
}

export function AgentMissionControl() {
  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black tracking-tight text-neo-foreground">
          Agent Mission Control
        </h2>
        <span className="neo-border bg-neo-muted px-2.5 py-1 text-xs font-bold text-neo-foreground">
          {MOCK_AGENTS.filter((a) => a.status === "running").length}/{MOCK_AGENTS.length} active
        </span>
      </div>

      {/* Agent cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {MOCK_AGENTS.map((agent) => (
          <div
            key={agent.id}
            className="neo-card rounded-none p-5 transition-transform hover:-translate-y-0.5"
          >
            {/* Mascot and name */}
            <div className="mb-3 flex items-center gap-3">
              <span className="text-3xl leading-none" role="img" aria-label={agent.name}>
                {agent.mascot}
              </span>
              <div>
                <h3 className="text-sm font-black text-neo-foreground">
                  {agent.name}
                </h3>
                {/* Role badge */}
                <span
                  className={`neo-border mt-0.5 inline-block rounded-none px-1.5 py-0.5 text-[10px] font-bold uppercase ${roleBadgeColor(agent.role)}`}
                >
                  {agent.role}
                </span>
              </div>
            </div>

            {/* Status indicator */}
            <div className="mb-3 flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${statusDotColor(agent.status)} ${
                  agent.status === "running" ? "animate-pulse" : ""
                }`}
              />
              <span className="text-xs font-bold text-neo-muted-foreground">
                {statusLabel(agent.status)}
              </span>
            </div>

            {/* Current feature */}
            {agent.currentFeature ? (
              <div className="neo-border rounded-none bg-neo-muted px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neo-muted-foreground">
                  Working on
                </p>
                <p className="text-xs font-black text-neo-foreground">
                  {agent.currentFeature}
                </p>
              </div>
            ) : (
              <div className="neo-border rounded-none border-dashed bg-neo-bg px-3 py-2">
                <p className="text-[10px] font-bold text-neo-muted-foreground">
                  Awaiting assignment
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
