"use client";

// ---------------------------------------------------------------------------
// Dispatch Modal
//
// Lets users choose how to assign a feature to an agent:
//   - Direct: Single agent work session (pick one agent)
//   - Pipeline: Full 4-step pipeline (architect → coder → reviewer → tester)
//
// Uses LiquidTabs for mode selection and glass-styled agent cards.
// ---------------------------------------------------------------------------

import { useCallback, useState } from "react";
import { AlertCircle, ArrowRight, Zap } from "lucide-react";
import type { Feature, AgentLiveStatusWorking, AgentName } from "@omakase/db";
import { cn } from "@/lib/utils";
import { useAssignFeature } from "@/hooks/use-api";
import { useAgentStatus } from "@/hooks/use-agent-status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LiquidTabs,
  LiquidTabsContent,
  LiquidTabsList,
  LiquidTabsTrigger,
} from "@/components/ui/liquid-tabs";

// ---------------------------------------------------------------------------
// Agent definitions (shared constant)
// ---------------------------------------------------------------------------

export const AGENT_DEFS = [
  { name: "miso" as AgentName, label: "Miso", mascot: "\uD83C\uDF5C", role: "Architect", color: "oma-gold", textColor: "text-oma-gold", dotColor: "bg-oma-gold" },
  { name: "nori" as AgentName, label: "Nori", mascot: "\uD83C\uDF59", role: "Coder", color: "oma-indigo", textColor: "text-oma-indigo", dotColor: "bg-oma-indigo" },
  { name: "koji" as AgentName, label: "Koji", mascot: "\uD83C\uDF76", role: "Reviewer", color: "oma-secondary", textColor: "text-oma-secondary", dotColor: "bg-oma-secondary" },
  { name: "toro" as AgentName, label: "Toro", mascot: "\uD83C\uDF63", role: "Tester", color: "oma-jade", textColor: "text-oma-jade", dotColor: "bg-oma-jade" },
] as const;

// Full Tailwind class maps — complete class names for JIT detection
const AGENT_GRADIENT: Record<AgentName, string> = {
  miso: "from-oma-gold/20 to-oma-gold/5",
  nori: "from-oma-indigo/20 to-oma-indigo/5",
  koji: "from-oma-secondary/20 to-oma-secondary/5",
  toro: "from-oma-jade/20 to-oma-jade/5",
};

const AGENT_BORDER: Record<AgentName, string> = {
  miso: "border-oma-gold",
  nori: "border-oma-indigo",
  koji: "border-oma-secondary",
  toro: "border-oma-jade",
};

const AGENT_TEXT: Record<AgentName, string> = {
  miso: "text-oma-gold",
  nori: "text-oma-indigo",
  koji: "text-oma-secondary",
  toro: "text-oma-jade",
};

const AGENT_DOT: Record<AgentName, string> = {
  miso: "bg-oma-gold",
  nori: "bg-oma-indigo",
  koji: "bg-oma-secondary",
  toro: "bg-oma-jade",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DispatchResult {
  agentName: AgentName;
  mode: "direct" | "pipeline";
  threadId?: string;
  runId?: string;
}

interface DispatchModalProps {
  feature: Feature;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDispatched: (result: DispatchResult) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DispatchModal({
  feature,
  open,
  onOpenChange,
  onDispatched,
}: DispatchModalProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentName | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { agents: agentStatuses } = useAgentStatus();
  const assignFeature = useAssignFeature();

  const handleDispatch = useCallback(
    async (mode: "direct" | "pipeline") => {
      const agent = mode === "direct" ? selectedAgent : "nori"; // Pipeline uses nori as entry point
      if (!agent) return;

      setIsDispatching(true);
      setError(null);
      try {
        const result = await assignFeature(feature.id, agent, mode);
        onDispatched({
          agentName: agent,
          mode,
          threadId: result.threadId,
          runId: result.runId,
        });
        onOpenChange(false);
        setSelectedAgent(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Dispatch failed";
        setError(message);
      } finally {
        setIsDispatching(false);
      }
    },
    [selectedAgent, feature.id, assignFeature, onDispatched, onOpenChange],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setSelectedAgent(null);
        setError(null);
      }
      onOpenChange(open);
    },
    [onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="glass-lg rounded-oma-lg border-oma-glass-border-bright bg-oma-bg-elevated md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-oma-text">
            Dispatch Feature
          </DialogTitle>
          <DialogDescription className="text-oma-text-muted">
            {feature.name}
          </DialogDescription>
        </DialogHeader>

        {/* Error alert */}
        {error && (
          <div className="flex items-center gap-2 rounded-oma border border-oma-fail/30 bg-oma-fail/10 px-3 py-2">
            <AlertCircle className="size-4 shrink-0 text-oma-fail" />
            <span className="flex-1 text-sm text-oma-fail">{error}</span>
          </div>
        )}

        <LiquidTabs defaultValue="direct" className="gap-4">
          <LiquidTabsList className="mx-auto">
            <LiquidTabsTrigger value="direct">
              <Zap className="size-3.5" />
              Direct
            </LiquidTabsTrigger>
            <LiquidTabsTrigger value="pipeline">
              <ArrowRight className="size-3.5" />
              Pipeline
            </LiquidTabsTrigger>
          </LiquidTabsList>

          {/* ---- Direct tab ---- */}
          <LiquidTabsContent value="direct">
            <div className="flex flex-col gap-4">
              <p className="text-center text-xs text-oma-text-subtle">
                Send this feature directly to a single agent
              </p>

              {/* Agent card grid */}
              <div className="grid grid-cols-2 gap-3">
                {AGENT_DEFS.map((agent) => {
                  const live = agentStatuses[agent.name];
                  const isBusy = live?.status === "working";
                  const isErrored = live?.status === "errored";
                  const isSelected = selectedAgent === agent.name;
                  const working = isBusy ? (live as AgentLiveStatusWorking) : null;

                  return (
                    <button
                      key={agent.name}
                      type="button"
                      onClick={() => {
                        if (!isBusy) setSelectedAgent(agent.name);
                      }}
                      disabled={isBusy}
                      className={cn(
                        "relative flex flex-col items-start gap-1 rounded-oma border p-4 text-left transition-all",
                        "bg-gradient-to-br",
                        AGENT_GRADIENT[agent.name],
                        isSelected
                          ? cn(AGENT_BORDER[agent.name], "shadow-oma-sm")
                          : "border-oma-glass-border hover:border-oma-glass-border-bright",
                        isBusy && "cursor-not-allowed opacity-50",
                      )}
                    >
                      {/* Mascot */}
                      <span className="text-2xl">{agent.mascot}</span>

                      {/* Name */}
                      <span className={cn("font-serif text-sm font-semibold", AGENT_TEXT[agent.name])}>
                        {agent.label}
                      </span>

                      {/* Role */}
                      <span className="text-xs text-oma-text-muted">{agent.role}</span>

                      {/* Status */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-block size-1.5 rounded-full",
                            isBusy && cn(AGENT_DOT[agent.name], "animate-pulse"),
                            isErrored && "bg-oma-fail",
                            !isBusy && !isErrored && "bg-oma-text-faint",
                          )}
                        />
                        <span className="text-[10px] text-oma-text-subtle">
                          {isBusy ? "Working" : isErrored ? "Errored" : "Idle"}
                        </span>
                      </div>

                      {/* Working badge */}
                      {isBusy && working && (
                        <span className="absolute right-2 top-2 rounded-oma-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-medium text-oma-text-muted">
                          Busy
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <Button
                onClick={() => void handleDispatch("direct")}
                disabled={!selectedAgent || isDispatching}
                className="w-full rounded-oma"
              >
                {isDispatching ? "Dispatching..." : "Dispatch"}
              </Button>
            </div>
          </LiquidTabsContent>

          {/* ---- Pipeline tab ---- */}
          <LiquidTabsContent value="pipeline">
            <div className="flex flex-col gap-4">
              <p className="text-center text-xs text-oma-text-subtle">
                Runs the full agent pipeline: Architect → Coder → Reviewer → Tester
              </p>

              {/* Pipeline flow visualization */}
              <div className="flex items-center justify-center gap-1 py-4">
                {AGENT_DEFS.map((agent, i) => (
                  <div key={agent.name} className="flex items-center gap-1">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-lg">{agent.mascot}</span>
                      <span className={cn("text-[10px] font-medium", AGENT_TEXT[agent.name])}>
                        {agent.label}
                      </span>
                    </div>
                    {i < AGENT_DEFS.length - 1 && (
                      <ArrowRight className="mx-1 size-3 text-oma-text-subtle" />
                    )}
                  </div>
                ))}
              </div>

              <Button
                onClick={() => void handleDispatch("pipeline")}
                disabled={isDispatching}
                className="w-full rounded-oma"
              >
                {isDispatching ? "Starting..." : "Start Pipeline"}
              </Button>
            </div>
          </LiquidTabsContent>
        </LiquidTabs>
      </DialogContent>
    </Dialog>
  );
}
