"use client";

import Link from "next/link";
import { useProjects, useFeatureStats, useActiveAgents } from "@/hooks/use-api";
import { ScrollReveal } from "@/components/scroll-reveal";
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
  const { data: projects, isLoading, error } = useProjects(CURRENT_USER_ID);

  return (
    <div>
      {/* Page header */}
      <ScrollReveal>
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-serif text-2xl font-semibold text-oma-text">
            Projects
          </h1>
          <button className="rounded-oma bg-gradient-to-r from-oma-primary to-oma-primary-dim px-5 py-2.5 text-sm font-medium text-white shadow-oma-sm transition-all duration-200 hover:shadow-oma-glow-primary hover:brightness-110">
            + New Project
          </button>
        </div>
        {/* Gradient separator */}
        <div className="mt-6 h-px w-full bg-gradient-to-r from-oma-primary/40 via-oma-glass-border to-transparent" />
      </ScrollReveal>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="glass rounded-oma-lg p-6 text-center">
          <p className="text-sm text-oma-error">
            Failed to load projects. Please try again later.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && projects && projects.length === 0 && (
        <div className="glass rounded-oma-lg p-12 text-center">
          <p className="text-sm text-oma-text-muted">
            No projects yet. Create your first project to get started.
          </p>
        </div>
      )}

      {/* Project grid */}
      {!isLoading && projects && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project, i) => (
            <ScrollReveal key={project.id} delay={i * 100} duration={600}>
              <ProjectCard project={project} />
            </ScrollReveal>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProjectCard — fetches its own stats so the list renders immediately
// ---------------------------------------------------------------------------

function ProjectCard({ project }: { project: Project }) {
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
      className="glass glass-edge glass-hover block rounded-oma-lg p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-oma-glow-primary hover:scale-[1.01]"
    >
      {/* Card header */}
      <div className="mb-4 flex items-start justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-oma-text">
          {project.name}
        </h2>

        {/* Active agents badge */}
        {activeAgents > 0 ? (
          <span className="glass-primary inline-flex items-center gap-1.5 rounded-oma-full px-2.5 py-1 text-xs font-medium text-oma-primary">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-oma-progress" />
            {activeAgents} agent
            {activeAgents > 1 ? "s" : ""}
          </span>
        ) : (
          <span className="glass-sm inline-flex items-center rounded-oma-full px-2.5 py-1 text-xs font-medium text-oma-text-subtle">
            Idle
          </span>
        )}
      </div>

      {/* Description */}
      <p className="mb-5 text-sm leading-relaxed text-oma-text-muted">
        {project.description ?? "No description"}
      </p>

      {/* Progress section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-oma-text">
            {featuresPassing}/{featuresTotal} passing
          </span>
          <span className="text-oma-text-muted">
            {progressPercent}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full overflow-hidden rounded-oma-full bg-oma-bg-surface">
          <div
            className="h-full rounded-oma-full bg-gradient-to-r from-oma-jade to-oma-done transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// ProjectCardSkeleton — placeholder while project list is loading
// ---------------------------------------------------------------------------

function ProjectCardSkeleton() {
  return (
    <div className="glass rounded-oma-lg p-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="h-5 w-40 animate-pulse rounded-oma bg-oma-bg-surface" />
        <div className="h-6 w-16 animate-pulse rounded-oma-full bg-oma-bg-surface" />
      </div>
      {/* Description */}
      <div className="mb-5 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-oma-bg-surface" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-oma-bg-surface" />
      </div>
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 animate-pulse rounded bg-oma-bg-surface" />
          <div className="h-3 w-8 animate-pulse rounded bg-oma-bg-surface" />
        </div>
        <div className="h-2 w-full animate-pulse rounded-oma-full bg-oma-bg-surface" />
      </div>
    </div>
  );
}
