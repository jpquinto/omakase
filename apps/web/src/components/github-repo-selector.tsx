"use client";

// ---------------------------------------------------------------------------
// GitHub Repo Selector Component
//
// Fetches available repositories from the GitHub App installation and presents
// them in a dropdown. When the user selects a repository, it connects it to
// the project via the orchestrator API.
//
// States:
//   1. Loading — Fetching repos from the API
//   2. Loaded  — Shows a dropdown of available repos
//   3. Error   — Shows an error message with a retry button
//   4. Connecting — Shows a spinner while connecting the selected repo
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { GitBranch, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GitHubRepo {
  id: number;
  name: string;
  owner: string;
  fullName: string;
  defaultBranch: string;
  private: boolean;
}

interface GitHubRepoSelectorProps {
  projectId: string;
  /** Called after a repo has been successfully connected */
  onConnected?: () => void;
  className?: string;
}

export function GitHubRepoSelector({
  projectId,
  onConnected,
  className,
}: GitHubRepoSelectorProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<GitHubRepo[]>(
        `/api/projects/${projectId}/github/repos`,
      );
      setRepos(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch repositories",
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchRepos();
  }, [fetchRepos]);

  const handleSelect = useCallback(
    async (repoFullName: string) => {
      const repo = repos.find((r) => r.fullName === repoFullName);
      if (!repo) return;

      setConnecting(true);
      try {
        await apiFetch(`/api/projects/${projectId}/github/connect-repo`, {
          method: "POST",
          body: JSON.stringify({
            owner: repo.owner,
            name: repo.name,
            defaultBranch: repo.defaultBranch,
          }),
        });
        onConnected?.();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to connect repository",
        );
      } finally {
        setConnecting(false);
      }
    },
    [repos, projectId, onConnected],
  );

  // -- Loading state --
  if (loading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="size-4 animate-spin text-oma-text-muted" />
        <span className="text-sm text-oma-text-muted">
          Loading repositories...
        </span>
      </div>
    );
  }

  // -- Error state --
  if (error) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-oma border border-oma-fail/30 bg-oma-fail/10 px-4 py-3",
          className,
        )}
      >
        <AlertCircle className="size-4 shrink-0 text-oma-fail" />
        <span className="flex-1 text-sm text-oma-fail">{error}</span>
        <button
          onClick={() => void fetchRepos()}
          className="rounded-oma p-1.5 text-oma-text-muted transition-colors hover:bg-oma-bg-surface hover:text-oma-text"
        >
          <RefreshCw className="size-3.5" />
        </button>
      </div>
    );
  }

  // -- Empty state (no repos available) --
  if (repos.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-sm text-oma-text-muted",
          className,
        )}
      >
        <GitBranch className="size-4" />
        <span>No repositories found. Check your GitHub App permissions.</span>
      </div>
    );
  }

  // -- Connecting state overlay --
  if (connecting) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="size-4 animate-spin text-oma-primary" />
        <span className="text-sm font-medium text-oma-text">
          Connecting repository...
        </span>
      </div>
    );
  }

  // -- Repo selection dropdown --
  return (
    <div className={cn("space-y-2", className)}>
      <label className="block text-xs font-medium text-oma-text-muted">
        Select a repository
      </label>
      <Select onValueChange={(value) => void handleSelect(value)}>
        <SelectTrigger className="glass-sm w-full rounded-oma border border-oma-glass-border bg-transparent px-3 py-2.5 text-sm text-oma-text transition-colors focus:border-oma-primary focus:ring-1 focus:ring-oma-primary/30">
          <SelectValue placeholder="Choose a repository..." />
        </SelectTrigger>
        <SelectContent className="glass rounded-oma border border-oma-glass-border bg-oma-bg-elevated">
          {repos.map((repo) => (
            <SelectItem
              key={repo.id}
              value={repo.fullName}
              className="cursor-pointer rounded-oma-sm text-sm text-oma-text transition-colors hover:bg-oma-bg-surface"
            >
              <div className="flex items-center gap-2">
                <GitBranch className="size-3.5 text-oma-text-subtle" />
                <span>{repo.fullName}</span>
                {repo.private && (
                  <span className="rounded-oma-full bg-oma-bg-surface px-1.5 py-0.5 text-[10px] font-medium text-oma-text-muted">
                    Private
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
