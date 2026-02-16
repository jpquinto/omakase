"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AgentRunRole, AgentName, AgentLiveStatusWorking } from "@omakase/db";
import { useAgentStatus } from "@/hooks/use-agent-status";
import { useAgentDispatch } from "@/hooks/use-agent-dispatch";

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

const AGENT_DEFS = [
  { id: "miso", name: "Miso", mascot: "\uD83C\uDF5C", role: "architect" as const },
  { id: "nori", name: "Nori", mascot: "\uD83C\uDF59", role: "coder" as const },
  { id: "koji", name: "Koji", mascot: "\uD83C\uDF76", role: "reviewer" as const },
  { id: "toro", name: "Toro", mascot: "\uD83C\uDF63", role: "tester" as const },
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
  const router = useRouter();
  const { agents: agentStatuses } = useAgentStatus();
  const { dispatch } = useAgentDispatch();
  // Track which agents have unread messages (cleared when chat opens)
  const [unreadAgents, setUnreadAgents] = useState<Set<string>>(new Set());
  // Track which agent card has dispatch input open
  const [dispatchingAgent, setDispatchingAgent] = useState<string | null>(null);
  const [dispatchPrompt, setDispatchPrompt] = useState("");

  // Derive agent list from live status
  const agents: Agent[] = AGENT_DEFS.map((def) => {
    const live = agentStatuses[def.id as keyof typeof agentStatuses];
    if (live?.status === "working") {
      const working = live as AgentLiveStatusWorking;
      return {
        id: def.id,
        name: def.name,
        mascot: def.mascot,
        role: def.role,
        status: "running" as const,
        currentFeature: working.currentTask,
        currentRunId: working.runId,
      };
    }
    if (live?.status === "errored") {
      return {
        id: def.id,
        name: def.name,
        mascot: def.mascot,
        role: def.role,
        status: "failed" as const,
        currentFeature: null,
        currentRunId: null,
      };
    }
    return {
      id: def.id,
      name: def.name,
      mascot: def.mascot,
      role: def.role,
      status: "idle" as const,
      currentFeature: null,
      currentRunId: null,
    };
  });

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
          {agents.filter((a) => a.status === "running").length}/{agents.length} active
        </span>
      </div>

      {/* Agent cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {agents.map((agent) => {
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

              {/* Current feature or dispatch action */}
              {agent.currentFeature ? (
                <div className="glass-sm rounded-oma px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-oma-text-subtle">
                    Working on
                  </p>
                  <p className="text-xs font-medium text-oma-text">
                    {agent.currentFeature}
                  </p>
                </div>
              ) : dispatchingAgent === agent.id ? (
                <div className="glass-sm rounded-oma px-3 py-2">
                  <input
                    type="text"
                    value={dispatchPrompt}
                    onChange={(e) => setDispatchPrompt(e.target.value)}
                    onKeyDown={async (e) => {
                      e.stopPropagation();
                      if (e.key === "Enter" && dispatchPrompt.trim()) {
                        try {
                          const result = await dispatch({ agentName: agent.id as AgentName, prompt: dispatchPrompt.trim() });
                          setDispatchingAgent(null);
                          setDispatchPrompt("");
                          router.push(`/agents/${agent.id}/chat?thread=${result.threadId}`);
                        } catch { /* error in hook */ }
                      }
                      if (e.key === "Escape") {
                        setDispatchingAgent(null);
                        setDispatchPrompt("");
                      }
                    }}
                    placeholder={`Task for ${agent.name}...`}
                    className="w-full bg-transparent text-xs text-oma-text outline-none placeholder:text-oma-text-faint"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDispatchingAgent(agent.id);
                    setDispatchPrompt("");
                  }}
                  className="glass-sm w-full rounded-oma border border-dashed border-oma-glass-border px-3 py-2 text-left transition-colors hover:border-oma-primary/30"
                >
                  <p className="text-[10px] font-medium text-oma-text-muted hover:text-oma-primary">
                    Dispatch agent &rarr;
                  </p>
                </button>
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
