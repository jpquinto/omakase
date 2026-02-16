"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { AgentLiveStatus, AgentName, AllAgentStatuses } from "@omakase/db";

type AllAgents = Record<AgentName, AgentLiveStatus>;

interface UseAgentStatusResult {
  agents: AllAgents;
  isLoading: boolean;
  error: Error | null;
  isStale: boolean;
  refetch: () => void;
  /** Optimistically override a single agent's status in the local cache. */
  setOptimistic: (agentName: AgentName, status: AgentLiveStatus) => void;
}

const DEFAULT_AGENTS: AllAgents = {
  miso: { status: "idle" as const },
  nori: { status: "idle" as const },
  koji: { status: "idle" as const },
  toro: { status: "idle" as const },
};

const POLL_INTERVAL = 5000;

export function useAgentStatus(): UseAgentStatusResult {
  const [agents, setAgents] = useState<AllAgents>(DEFAULT_AGENTS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const optimisticRef = useRef<Partial<Record<AgentName, AgentLiveStatus>>>({});

  const fetchData = useCallback(async () => {
    try {
      const result = await apiFetch<AllAgentStatuses>("/api/agents/status");
      const merged = { ...result.agents };
      // Re-apply any optimistic overrides that haven't been confirmed yet
      for (const [name, status] of Object.entries(optimisticRef.current)) {
        if (status) {
          merged[name as AgentName] = status;
        }
      }
      setAgents(merged as AllAgents);
      setError(null);
      setIsStale(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsStale(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    intervalRef.current = setInterval(() => void fetchData(), POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  const setOptimistic = useCallback((agentName: AgentName, status: AgentLiveStatus) => {
    optimisticRef.current[agentName] = status;
    setAgents((prev) => ({ ...prev, [agentName]: status }));
  }, []);

  return { agents, isLoading, error, isStale, refetch: fetchData, setOptimistic };
}

/** Convenience hook for a single agent's status. */
export function useSingleAgentStatus(agentName: AgentName | undefined) {
  const { agents, isLoading, error, isStale } = useAgentStatus();
  return {
    status: agentName ? agents[agentName] : undefined,
    isLoading,
    error,
    isStale,
  };
}
