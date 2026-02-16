"use client";

import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { useAgentStatus } from "./use-agent-status";
import type { AgentName, AgentLiveStatusWorking } from "@omakase/db";

interface DispatchParams {
  agentName: AgentName;
  projectId?: string;
  prompt: string;
  threadId?: string;
}

interface DispatchResult {
  runId: string;
  threadId: string;
  status: string;
}

interface DispatchError {
  busy: boolean;
  currentTask?: string;
  runId?: string;
  startedAt?: string;
  message: string;
}

interface UseAgentDispatchResult {
  dispatch: (params: DispatchParams) => Promise<DispatchResult>;
  isDispatching: boolean;
  error: DispatchError | null;
  clearError: () => void;
}

export function useAgentDispatch(): UseAgentDispatchResult {
  const { agents, setOptimistic } = useAgentStatus();
  const [isDispatching, setIsDispatching] = useState(false);
  const [error, setError] = useState<DispatchError | null>(null);

  const dispatch = useCallback(
    async (params: DispatchParams): Promise<DispatchResult> => {
      const { agentName, projectId, prompt, threadId } = params;

      // Check if agent is busy
      const agentStatus = agents[agentName];
      if (agentStatus?.status === "working") {
        const working = agentStatus as AgentLiveStatusWorking;
        const err: DispatchError = {
          busy: true,
          currentTask: working.currentTask,
          runId: working.runId,
          startedAt: working.startedAt,
          message: `${agentName} is currently working on: ${working.currentTask}`,
        };
        setError(err);
        throw err;
      }

      setIsDispatching(true);
      setError(null);

      // Optimistic update: immediately show as working
      setOptimistic(agentName, {
        status: "working",
        runId: "pending",
        threadId: threadId ?? "pending",
        projectId: projectId ?? "general",
        startedAt: new Date().toISOString(),
        currentTask: prompt.split(/\s+/).slice(0, 6).join(" ").slice(0, 50) || "Working...",
      } as AgentLiveStatusWorking);

      try {
        // Create thread if needed
        let resolvedThreadId = threadId;
        if (!resolvedThreadId) {
          const title = prompt.split(/\s+/).slice(0, 6).join(" ").slice(0, 50) || "New conversation";
          const thread = await apiFetch<{ threadId: string }>(
            `/api/agents/${agentName}/threads`,
            {
              method: "POST",
              body: JSON.stringify({ projectId, title, mode: "work" }),
            },
          );
          resolvedThreadId = thread.threadId;
        }

        // Start work session
        const result = await apiFetch<{ runId: string; status: string }>(
          `/api/agents/${agentName}/work-sessions`,
          {
            method: "POST",
            body: JSON.stringify({ projectId, threadId: resolvedThreadId, prompt }),
          },
        );

        // Update optimistic state with real runId
        setOptimistic(agentName, {
          status: "working",
          runId: result.runId,
          threadId: resolvedThreadId,
          projectId: projectId ?? "general",
          startedAt: new Date().toISOString(),
          currentTask: prompt.split(/\s+/).slice(0, 6).join(" ").slice(0, 50) || "Working...",
        } as AgentLiveStatusWorking);

        // Store the user message
        await apiFetch(`/api/agent-runs/${result.runId}/messages`, {
          method: "POST",
          body: JSON.stringify({ content: prompt, sender: "user", threadId: resolvedThreadId }),
        });

        return { runId: result.runId, threadId: resolvedThreadId, status: result.status };
      } catch (err) {
        // Rollback optimistic update
        setOptimistic(agentName, { status: "idle" as const });
        const dispatchErr: DispatchError = {
          busy: false,
          message: err instanceof Error ? err.message : String(err),
        };
        setError(dispatchErr);
        throw dispatchErr;
      } finally {
        setIsDispatching(false);
      }
    },
    [agents, setOptimistic],
  );

  const clearError = useCallback(() => setError(null), []);

  return { dispatch, isDispatching, error, clearError };
}
