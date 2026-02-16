"use client";

// ---------------------------------------------------------------------------
// Global Workspace Browser — /workspace
//
// Full-page file browser for agent working directories. Displays a project
// selector and the WorkspaceExplorer tree/viewer for the selected project.
// ---------------------------------------------------------------------------

import { useState, useCallback } from "react";
import { FolderOpen, ChevronDown, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjects } from "@/hooks/use-api";
import { WorkspaceExplorer } from "@/components/chat/workspace-explorer";

export default function WorkspacePage() {
  // Project selector — persisted in localStorage
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("omakase:workspace:project") ?? null;
  });
  const { data: projects, isLoading: projectsLoading } = useProjects("user_test_001");

  const handleProjectChange = useCallback((id: string) => {
    setSelectedProjectId(id);
    localStorage.setItem("omakase:workspace:project", id);
  }, []);

  // Auto-select first project if none chosen yet
  if (!selectedProjectId && projects && projects.length > 0) {
    setSelectedProjectId(projects[0].id);
  }

  return (
    <div className="flex h-full flex-col gap-5">
      {/* Header row */}
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-oma bg-oma-primary/10">
            <FolderOpen className="size-5 text-oma-primary" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-semibold text-oma-text">
              Workspace
            </h1>
            <p className="text-sm text-oma-text-muted">
              Browse agent working directories
            </p>
          </div>
        </div>

        {/* Project selector */}
        {projectsLoading ? (
          <div className="flex items-center gap-2 text-sm text-oma-text-subtle">
            <Loader2 className="size-4 animate-spin" />
            Loading projects...
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="relative">
            <select
              value={selectedProjectId ?? ""}
              onChange={(e) => handleProjectChange(e.target.value)}
              className={cn(
                "glass appearance-none rounded-oma border border-oma-glass-border px-4 py-2.5 pr-10",
                "text-sm font-medium text-oma-text",
                "bg-oma-bg-elevated transition-all duration-200",
                "hover:border-oma-glass-border-bright focus:outline-none focus:ring-1 focus:ring-oma-primary/40",
                "cursor-pointer",
              )}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-oma-bg-elevated text-oma-text">
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-oma-text-muted" />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-oma-text-subtle">
            <AlertCircle className="size-4" />
            No projects found
          </div>
        )}
      </div>

      {/* Gradient separator */}
      <div className="h-px w-full shrink-0 bg-gradient-to-r from-oma-primary/40 via-oma-glass-border to-transparent" />

      {/* File explorer */}
      {selectedProjectId ? (
        <div className="glass min-h-0 flex-1 overflow-hidden rounded-oma-lg">
          <WorkspaceExplorer
            projectId={selectedProjectId}
          />
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <FolderOpen className="size-10 text-oma-text-subtle" />
          <p className="text-sm text-oma-text-muted">
            Select a project to browse the workspace
          </p>
        </div>
      )}
    </div>
  );
}
