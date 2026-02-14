"use client";

// ---------------------------------------------------------------------------
// Agent Mission Control Component
//
// Displays a grid of agent cards showing each agent's mascot, name, role,
// current status, and the feature they are working on. Uses the Omakase
// liquid glass design system with glass surfaces and soft color accents.
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

/** Maps agent status to an Omakase dot color class */
function statusDotColor(status: Agent["status"]): string {
  const colors: Record<Agent["status"], string> = {
    idle: "bg-oma-text-faint",
    running: "bg-oma-done",
    stopped: "bg-oma-pending",
    failed: "bg-oma-fail",
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

/** Maps agent role to Omakase color classes */
function roleBadgeColor(role: Agent["role"]): string {
  const colors: Record<Agent["role"], string> = {
    architect: "bg-oma-indigo/20 text-oma-indigo",
    coder: "bg-oma-progress/20 text-oma-progress",
    reviewer: "bg-oma-primary/20 text-oma-primary",
    tester: "bg-oma-jade/20 text-oma-jade",
  };
  return colors[role];
}

export function AgentMissionControl() {
  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-oma-text">
          Agent Mission Control
        </h2>
        <span className="glass-sm rounded-full px-3 py-1 text-xs font-medium text-oma-text-muted">
          {MOCK_AGENTS.filter((a) => a.status === "running").length}/{MOCK_AGENTS.length} active
        </span>
      </div>

      {/* Agent cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {MOCK_AGENTS.map((agent) => (
          <div
            key={agent.id}
            className="glass rounded-oma-lg glass-edge p-5 transition-all duration-200 hover:scale-[1.02]"
          >
            {/* Mascot and name */}
            <div className="mb-3 flex items-center gap-3">
              <span
                className="glass-sm rounded-oma flex h-12 w-12 items-center justify-center text-2xl leading-none"
                role="img"
                aria-label={agent.name}
              >
                {agent.mascot}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-oma-text">
                  {agent.name}
                </h3>
                {/* Role badge */}
                <span
                  className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${roleBadgeColor(agent.role)}`}
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
              <span className="text-xs font-medium text-oma-text-muted">
                {statusLabel(agent.status)}
              </span>
            </div>

            {/* Current feature or awaiting state */}
            {agent.currentFeature ? (
              <div className="glass-sm rounded-oma px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-oma-text-subtle">
                  Working on
                </p>
                <p className="text-xs font-medium text-oma-text">
                  {agent.currentFeature}
                </p>
              </div>
            ) : (
              <div className="glass-sm rounded-oma border border-dashed border-oma-glass-border px-3 py-2">
                <p className="text-[10px] font-medium text-oma-text-muted">
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
