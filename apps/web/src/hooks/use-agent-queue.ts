"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { QueuedJob, AgentName } from "@omakase/db";

interface UseAgentQueueResult {
  queue: QueuedJob[];
  isLoading: boolean;
  error: Error | null;
  removeJob: (jobId: string) => Promise<void>;
  reorderJob: (jobId: string, newPosition: number) => Promise<void>;
  refetch: () => void;
}

const POLL_INTERVAL = 5000;

export function useAgentQueue(agentName: AgentName): UseAgentQueueResult {
  const [queue, setQueue] = useState<QueuedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await apiFetch<QueuedJob[]>(
        `/api/agents/${agentName}/queue`,
      );
      setQueue(Array.isArray(result) ? result : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [agentName]);

  useEffect(() => {
    void fetchData();
    intervalRef.current = setInterval(() => void fetchData(), POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  const removeJob = useCallback(
    async (jobId: string) => {
      // Optimistic removal
      setQueue((prev) => prev.filter((job) => job.jobId !== jobId));
      try {
        await apiFetch(`/api/agents/${agentName}/queue/${jobId}`, {
          method: "DELETE",
        });
        // Refetch to get accurate positions after deletion
        await fetchData();
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        // Rollback: refetch to restore accurate state
        await fetchData();
      }
    },
    [agentName, fetchData],
  );

  const reorderJob = useCallback(
    async (jobId: string, newPosition: number) => {
      // Optimistic reorder: move the job to the new position locally
      setQueue((prev) => {
        const jobIndex = prev.findIndex((j) => j.jobId === jobId);
        if (jobIndex === -1) return prev;
        const updated = [...prev];
        const [moved] = updated.splice(jobIndex, 1);
        updated.splice(newPosition, 0, moved);
        return updated.map((job, i) => ({ ...job, position: i }));
      });
      try {
        await apiFetch(`/api/agents/${agentName}/queue/${jobId}`, {
          method: "PATCH",
          body: JSON.stringify({ position: newPosition }),
        });
        // Refetch to get server-confirmed positions
        await fetchData();
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        // Rollback: refetch to restore accurate state
        await fetchData();
      }
    },
    [agentName, fetchData],
  );

  return { queue, isLoading, error, removeJob, reorderJob, refetch: fetchData };
}
