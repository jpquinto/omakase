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
    reviewReady: number;
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

// ---------------------------------------------------------------------------
// Agent-specific hooks
//
// These power the agent profile pages (/agents and /agents/[name]).
// ---------------------------------------------------------------------------

export function useAgentProfile(agentName: string | undefined) {
  return usePollingQuery<{
    agentName: string;
    displayName: string;
    persona: string;
    traits: string[];
    communicationStyle: string;
    updatedAt: string;
  }>(
    agentName ? `/api/agents/${agentName}/profile` : null,
    60000,
  );
}

export function useAgentStats(agentName: string | undefined) {
  return usePollingQuery<{
    totalRuns: number;
    successRate: number;
    avgDurationMs: number;
    lastRunAt: string | null;
  }>(
    agentName ? `/api/agents/${agentName}/stats` : null,
    30000,
  );
}

export function useAgentActivity(agentName: string | undefined) {
  return usePollingQuery<{ date: string; count: number }[]>(
    agentName ? `/api/agents/${agentName}/activity` : null,
    60000,
  );
}

export function useAgentRuns(agentName: string | undefined) {
  return usePollingQuery<Array<{
    id: string;
    agentId: string;
    projectId: string;
    featureId: string;
    role: string;
    status: string;
    outputSummary?: string;
    errorMessage?: string;
    startedAt: string;
    completedAt?: string;
    durationMs?: number;
  }>>(
    agentName ? `/api/agents/${agentName}/runs` : null,
    30000,
  );
}

export function useAgentMemories(agentName: string | undefined) {
  return usePollingQuery<Array<{
    id: string;
    agentName: string;
    projectId: string;
    content: string;
    source: string;
    createdAt: string;
  }>>(
    agentName ? `/api/agents/${agentName}/memories?projectId=all` : null,
    60000,
  );
}

// ---------------------------------------------------------------------------
// Mutation hooks
//
// These do not use polling — they return a stable async function that performs
// a single API call via `apiFetch`. The caller is responsible for triggering
// a refetch of any dependent queries after a mutation succeeds.
// ---------------------------------------------------------------------------

/** Create a new project. */
export function useCreateProject() {
  return useCallback(
    async (data: { name: string; description?: string; ownerId: string }) => {
      return apiFetch<Project>(`/api/projects`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    [],
  );
}

/** Create a new feature within a project. */
export function useCreateFeature() {
  return useCallback(
    async (
      projectId: string,
      data: {
        name: string;
        description?: string;
        priority?: number;
        category?: string;
      },
    ) => {
      return apiFetch<Feature>(`/api/projects/${projectId}/features`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    [],
  );
}

/** Update an existing feature (partial update). */
export function useUpdateFeature() {
  return useCallback(
    async (
      featureId: string,
      data: {
        name?: string;
        description?: string;
        priority?: number;
        status?: string;
        category?: string;
      },
    ) => {
      await apiFetch<void>(`/api/features/${featureId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    [],
  );
}

/** Delete a feature by its ID. */
export function useDeleteFeature() {
  return useCallback(async (featureId: string) => {
    await apiFetch<void>(`/api/features/${featureId}`, {
      method: "DELETE",
    });
  }, []);
}

/** Bulk import multiple features into a project. */
export function useBulkImportFeatures() {
  return useCallback(
    async (
      projectId: string,
      features: Array<{
        name: string;
        description?: string;
        priority?: number;
        category?: string;
      }>,
    ) => {
      return apiFetch<{ created: number; skipped: number }>(
        `/api/projects/${projectId}/features/bulk`,
        {
          method: "POST",
          body: JSON.stringify({ features }),
        },
      );
    },
    [],
  );
}

/** Add a dependency between two features (featureId depends on dependsOnId). */
export function useAddDependency() {
  return useCallback(
    async (featureId: string, dependsOnId: string) => {
      await apiFetch<void>(`/api/features/${featureId}/dependencies`, {
        method: "POST",
        body: JSON.stringify({ dependsOnId }),
      });
    },
    [],
  );
}

/** Remove a dependency between two features. */
export function useRemoveDependency() {
  return useCallback(
    async (featureId: string, dependsOnId: string) => {
      await apiFetch<void>(
        `/api/features/${featureId}/dependencies/${dependsOnId}`,
        {
          method: "DELETE",
        },
      );
    },
    [],
  );
}

/** Disconnect a project from its Linear integration. */
export function useDisconnectLinear() {
  return useCallback(async (projectId: string) => {
    await apiFetch<void>(`/api/projects/${projectId}/linear-token`, {
      method: "DELETE",
    });
  }, []);
}

/** Disconnect a project from its GitHub integration. */
export function useDisconnectGitHub() {
  return useCallback(async (projectId: string) => {
    await apiFetch<void>(`/api/projects/${projectId}/github`, {
      method: "DELETE",
    });
  }, []);
}
