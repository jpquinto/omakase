"use client";

import { useState } from "react";
import type { AgentRunRole } from "@omakase/db";

// ---------------------------------------------------------------------------
// Agent Mission Control Component
//
// Displays a grid of agent cards showing each agent's mascot, name, role,
// current status, and the feature they are working on. Uses the Omakase
// liquid glass design system with glass surfaces and soft color accents.
//
// Cards for running agents are clickable to open the chat sidebar.
// ---------------------------------------------------------------------------

interface Agent {
  id: string;
  name: string;
  mascot: string;
  role: "architect" | "coder" | "reviewer" | "tester";
  status: "idle" | "running" | "stopped" | "failed";
  currentFeature: string | null;
  currentRunId: string | null;
}

interface ChatTarget {
  runId: string;
  agentName: string;
  agentMascot: string;
  agentRole: AgentRunRole;
  featureName: string;
  isActive: boolean;
}

interface AgentMissionControlProps {
  onOpenChat?: (target: ChatTarget) => void;
  activeChatRunId?: string | null;
}

const MOCK_AGENTS: Agent[] = [
  {
    id: "a1",
    name: "Miso",
    mascot: "\uD83C\uDF5C", // steaming bowl
    role: "architect",
    status: "running",
    currentFeature: "Database Schema",
    currentRunId: "run-miso-001",
  },
  {
    id: "a2",
    name: "Nori",
    mascot: "\uD83C\uDF59", // rice ball
    role: "coder",
    status: "running",
    currentFeature: "Shopping Cart",
    currentRunId: "run-nori-001",
  },
  {
    id: "a3",
    name: "Koji",
    mascot: "\uD83C\uDF76", // sake
    role: "reviewer",
    status: "idle",
    currentFeature: null,
    currentRunId: null,
  },
  {
    id: "a4",
    name: "Toro",
    mascot: "\uD83C\uDF63", // sushi
    role: "tester",
    status: "running",
    currentFeature: "User Authentication",
    currentRunId: "run-toro-001",
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
    architect: "bg-oma-gold/20 text-oma-gold",
    coder: "bg-oma-indigo/20 text-oma-indigo",
    reviewer: "bg-oma-secondary/20 text-oma-secondary",
    tester: "bg-oma-jade/20 text-oma-jade",
  };
  return colors[role];
}

export function AgentMissionControl({ onOpenChat, activeChatRunId }: AgentMissionControlProps) {
  // Track which agents have unread messages (cleared when chat opens)
  const [unreadAgents, setUnreadAgents] = useState<Set<string>>(new Set());

  const handleCardClick = (agent: Agent) => {
    if (agent.status !== "running" || !agent.currentRunId || !agent.currentFeature || !onOpenChat) return;
    // Clear unread badge for this agent
    setUnreadAgents((prev) => {
      const next = new Set(prev);
      next.delete(agent.id);
      return next;
    });
    onOpenChat({
      runId: agent.currentRunId,
      agentName: agent.name,
      agentMascot: agent.mascot,
      agentRole: agent.role,
      featureName: agent.currentFeature,
      isActive: true,
    });
  };

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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {MOCK_AGENTS.map((agent) => {
          const isClickable = agent.status === "running" && !!agent.currentRunId && !!onOpenChat;
          const isChatOpen = activeChatRunId === agent.currentRunId;
          const hasUnread = unreadAgents.has(agent.id);

          return (
            <div
              key={agent.id}
              onClick={() => handleCardClick(agent)}
              className={`glass rounded-oma-lg glass-edge p-5 transition-all duration-200 hover:scale-[1.02] ${
                isClickable ? "cursor-pointer" : ""
              } ${isChatOpen ? "ring-1 ring-oma-primary/40" : ""}`}
            >
              {/* Mascot and name */}
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="glass-sm rounded-oma flex h-12 w-12 items-center justify-center text-2xl leading-none relative"
                  role="img"
                  aria-label={agent.name}
                >
                  {agent.mascot}
                  {/* Unread badge */}
                  {hasUnread && (
                    <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-oma-primary shadow-oma-glow-primary" />
                  )}
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

              {/* Chat hint for running agents */}
              {isClickable && (
                <p className="mt-2 text-center text-[10px] text-oma-text-faint">
                  Click to chat
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
