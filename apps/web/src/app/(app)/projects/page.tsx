"use client";

import { useState } from "react";
import Link from "next/link";
import { useProjects, useFeatureStats, useActiveAgents } from "@/hooks/use-api";
import { ScrollReveal } from "@/components/scroll-reveal";
import { CreateProjectWizard } from "@/components/create-project-wizard";
import type { Project } from "@omakase/db";

// ---------------------------------------------------------------------------
// Projects List Page
//
// Fetches real project data via the orchestrator API. Each ProjectCard
// independently fetches its own feature stats and active agent count so the
// list page loads incrementally without blocking on per-project calls.
// ---------------------------------------------------------------------------

/** Hardcoded user ID until auth context is wired through */
const CURRENT_USER_ID = "user_test_001";

export default function ProjectsPage() {
  const { data: projects, isLoading, error, refetch } = useProjects(CURRENT_USER_ID);
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <div>
      {/* Project creation wizard */}
      <CreateProjectWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onCreated={() => refetch()}
      />

      {/* Page header */}
      <ScrollReveal>
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-serif text-2xl font-semibold text-oma-text">
            Projects
          </h1>
          <button
            onClick={() => setWizardOpen(true)}
            className="rounded-oma bg-gradient-to-r from-oma-primary to-oma-primary-dim px-5 py-2.5 text-sm font-medium text-white shadow-oma-sm transition-all duration-200 hover:shadow-oma-glow-primary hover:brightness-110"
          >
            + New Project
          </button>
        </div>
        {/* Gradient separator */}
        <div className="mt-6 h-px w-full bg-gradient-to-r from-oma-primary/40 via-oma-glass-border to-transparent" />
      </ScrollReveal>

      {/* Loading state */}
      {isLoading && (
        <div className="mt-6 glass rounded-oma-lg">
          {[1, 2, 3].map((i) => (
            <ProjectRowSkeleton key={i} isLast={i === 3} />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="mt-6 glass rounded-oma-lg p-6 text-center">
          <p className="text-sm text-oma-error">
            Failed to load projects. Please try again later.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && projects && projects.length === 0 && (
        <div className="mt-6 glass rounded-oma-lg p-12 text-center">
          <p className="text-sm text-oma-text-muted">
            No projects yet. Create your first project to get started.
          </p>
        </div>
      )}

      {/* Project list */}
      {!isLoading && projects && projects.length > 0 && (
        <div className="mt-6 glass rounded-oma-lg">
          {projects.map((project, i) => (
            <div
              key={project.id}
              className="animate-oma-fade-up opacity-0"
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: "forwards" }}
            >
              <ProjectRow project={project} isLast={i === projects.length - 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProjectRow — list row that fetches its own stats independently
// ---------------------------------------------------------------------------

function ProjectRow({ project, isLast }: { project: Project; isLast: boolean }) {
  const { data: stats } = useFeatureStats(project.id);
  const { data: activeAgentRuns } = useActiveAgents(project.id);

  const featuresPassing = stats?.passing ?? 0;
  const featuresTotal = stats?.total ?? 0;
  const activeAgents = activeAgentRuns?.length ?? 0;

  const progressPercent =
    featuresTotal > 0
      ? Math.round((featuresPassing / featuresTotal) * 100)
      : 0;

  return (
    <Link
      href={`/projects/${project.id}`}
      className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.04] ${
        !isLast ? "border-b border-oma-glass-border" : ""
      }`}
    >
      {/* Name & description */}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-medium text-oma-text">
          {project.name}
        </h2>
        <p className="mt-0.5 truncate text-xs text-oma-text-muted">
          {project.description ?? "No description"}
        </p>
      </div>

      {/* Active agents badge */}
      <div className="hidden shrink-0 sm:block">
        {activeAgents > 0 ? (
          <span className="glass-primary inline-flex items-center gap-1.5 rounded-oma-full px-2.5 py-1 text-xs font-medium text-oma-primary">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-oma-progress" />
            {activeAgents} agent{activeAgents > 1 ? "s" : ""}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-oma-full bg-oma-bg-surface px-2.5 py-1 text-xs font-medium text-oma-text-subtle">
            Idle
          </span>
        )}
      </div>

      {/* Progress */}
      <div className="hidden w-36 shrink-0 items-center gap-3 lg:flex">
        <div className="h-1.5 flex-1 overflow-hidden rounded-oma-full bg-oma-bg-surface">
          <div
            className="h-full rounded-oma-full bg-gradient-to-r from-oma-jade to-oma-done transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="w-16 text-right text-xs tabular-nums text-oma-text-muted">
          {featuresPassing}/{featuresTotal}
        </span>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// ProjectRowSkeleton — placeholder row while project list is loading
// ---------------------------------------------------------------------------

function ProjectRowSkeleton({ isLast }: { isLast: boolean }) {
  return (
    <div
      className={`flex items-center gap-4 px-5 py-4 ${
        !isLast ? "border-b border-oma-glass-border" : ""
      }`}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-40 animate-pulse rounded bg-oma-bg-surface" />
        <div className="h-3 w-56 animate-pulse rounded bg-oma-bg-surface" />
      </div>
      <div className="hidden h-6 w-16 animate-pulse rounded-oma-full bg-oma-bg-surface sm:block" />
      <div className="hidden w-36 items-center gap-3 lg:flex">
        <div className="h-1.5 flex-1 animate-pulse rounded-oma-full bg-oma-bg-surface" />
        <div className="h-3 w-12 animate-pulse rounded bg-oma-bg-surface" />
      </div>
    </div>
  );
}
