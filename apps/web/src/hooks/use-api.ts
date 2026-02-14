"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { Project, Feature, AgentRun } from "@omakase/db";

interface UseQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

function usePollingQuery<T>(
  path: string | null,
  intervalMs: number = 5000,
): UseQueryResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    if (!path) return;
    try {
      const result = await apiFetch<T>(path);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [path]);

  useEffect(() => {
    if (!path) {
      setIsLoading(false);
      return;
    }

    // Initial fetch
    void fetchData();

    // Set up polling
    intervalRef.current = setInterval(() => {
      void fetchData();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, intervalMs, path]);

  return { data, isLoading, error, refetch: fetchData };
}

export function useProjects(userId: string | undefined) {
  return usePollingQuery<Project[]>(
    userId ? `/api/projects?userId=${userId}` : null,
    30000,
  );
}

export function useProject(projectId: string) {
  return usePollingQuery<Project>(
    `/api/projects/${projectId}`,
    30000,
  );
}

export function useProjectFeatures(projectId: string) {
  return usePollingQuery<Feature[]>(
    `/api/projects/${projectId}/features`,
    5000,
  );
}

export function useFeatureStats(projectId: string) {
  return usePollingQuery<{
    total: number;
    pending: number;
    inProgress: number;
    passing: number;
    failing: number;
  }>(
    `/api/projects/${projectId}/features/stats`,
    5000,
  );
}

export function useActiveAgents(projectId: string) {
  return usePollingQuery<AgentRun[]>(
    `/api/projects/${projectId}/agents/active`,
    5000,
  );
}

export function useAgentLogs(projectId: string, featureId?: string) {
  return usePollingQuery<AgentRun[]>(
    featureId ? `/api/projects/${projectId}/agents/logs?featureId=${featureId}` : null,
    5000,
  );
}
