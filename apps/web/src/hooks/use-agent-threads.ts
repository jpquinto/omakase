"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { AgentThread, AgentThreadMode, AgentThreadStatus } from "@omakase/db";

interface PaginatedThreadsResponse {
  threads: AgentThread[];
  nextCursor: string | null;
}

interface UseAgentThreadsResult {
  threads: AgentThread[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
  createThread: (title?: string, mode?: AgentThreadMode) => Promise<AgentThread>;
  updateThread: (threadId: string, data: { title?: string; status?: AgentThreadStatus }) => Promise<AgentThread>;
}

const PAGE_SIZE = 20;

export function useAgentThreads(
  agentName: string | null,
  projectId: string | null,
): UseAgentThreadsResult {
  const [threads, setThreads] = useState<AgentThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchThreads = useCallback(async (cursor?: string) => {
    if (!agentName) return;
    try {
      const params = new URLSearchParams();
      if (projectId) params.set("projectId", projectId);
      params.set("limit", String(PAGE_SIZE));
      if (cursor) params.set("cursor", cursor);
      const qs = params.toString();

      const result = await apiFetch<PaginatedThreadsResponse>(
        `/api/agents/${agentName}/threads?${qs}`,
      );

      if (cursor) {
        // Appending next page — deduplicate by threadId
        setThreads((prev) => {
          const existingIds = new Set(prev.map((t) => t.threadId));
          const newItems = result.threads.filter((t) => !existingIds.has(t.threadId));
          return [...prev, ...newItems];
        });
      } else {
        setThreads(result.threads);
      }
      setNextCursor(result.nextCursor);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [agentName, projectId]);

  useEffect(() => {
    if (!agentName) {
      setIsLoading(false);
      setThreads([]);
      setNextCursor(null);
      return;
    }

    void fetchThreads();

    // Polling refreshes only the first page to pick up new threads
    intervalRef.current = setInterval(() => {
      void fetchThreads();
    }, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchThreads, agentName, projectId]);

  const loadMore = useCallback(() => {
    if (nextCursor) {
      void fetchThreads(nextCursor);
    }
  }, [fetchThreads, nextCursor]);

  const createThreadFn = useCallback(
    async (title?: string, mode?: AgentThreadMode) => {
      if (!agentName) throw new Error("Missing agentName");
      const thread = await apiFetch<AgentThread>(
        `/api/agents/${agentName}/threads`,
        {
          method: "POST",
          body: JSON.stringify({ projectId: projectId ?? "general", title, mode }),
        },
      );
      setThreads((prev) => [thread, ...prev]);
      return thread;
    },
    [agentName, projectId],
  );

  const updateThreadFn = useCallback(
    async (threadId: string, data: { title?: string; status?: AgentThreadStatus }) => {
      if (!agentName) throw new Error("Missing agentName");
      const updated = await apiFetch<AgentThread>(
        `/api/agents/${agentName}/threads/${threadId}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
      );
      setThreads((prev) =>
        data.status === "archived"
          ? prev.filter((t) => t.threadId !== threadId)
          : prev.map((t) => (t.threadId === threadId ? updated : t)),
      );
      return updated;
    },
    [agentName],
  );

  return {
    threads,
    isLoading,
    error,
    hasMore: !!nextCursor,
    loadMore,
    refetch: fetchThreads,
    createThread: createThreadFn,
    updateThread: updateThreadFn,
  };
}
