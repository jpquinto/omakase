"use client";

import Link from "next/link";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Mock data representing projects. Will be replaced with orchestrator API
// hooks once the backend is fully wired:
//   import { useProjects } from "@/hooks/use-api";
//   const { data: projects } = useProjects(userId);
// ---------------------------------------------------------------------------

interface MockProject {
  id: string;
  name: string;
  description: string;
  status: "active" | "archived";
  featuresPassing: number;
  featuresTotal: number;
  activeAgents: number;
}

const MOCK_PROJECTS: MockProject[] = [
  {
    id: "proj_1",
    name: "E-Commerce Platform",
    description: "Full-stack e-commerce app with auth, cart, and payments",
    status: "active",
    featuresPassing: 7,
    featuresTotal: 12,
    activeAgents: 3,
  },
  {
    id: "proj_2",
    name: "Analytics Dashboard",
    description: "Real-time analytics dashboard with charts and filters",
    status: "active",
    featuresPassing: 4,
    featuresTotal: 8,
    activeAgents: 1,
  },
  {
    id: "proj_3",
    name: "Chat Application",
    description: "WebSocket-based chat app with rooms and file sharing",
    status: "active",
    featuresPassing: 2,
    featuresTotal: 10,
    activeAgents: 0,
  },
];

export default function ProjectsPage() {
  const [projects] = useState<MockProject[]>(MOCK_PROJECTS);

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-oma-text">
          Projects
        </h1>
        <button className="rounded-oma bg-gradient-to-r from-oma-primary to-oma-primary-dim px-5 py-2.5 text-sm font-medium text-white shadow-oma-sm transition-all duration-200 hover:shadow-oma-glow-primary hover:brightness-110">
          + New Project
        </button>
      </div>

      {/* Project grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => {
          const progressPercent =
            project.featuresTotal > 0
              ? Math.round(
                  (project.featuresPassing / project.featuresTotal) * 100,
                )
              : 0;

          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="glass glass-edge glass-hover block rounded-oma-lg p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-oma-glow-primary hover:scale-[1.01]"
            >
              {/* Card header */}
              <div className="mb-4 flex items-start justify-between">
                <h2 className="text-lg font-semibold tracking-tight text-oma-text">
                  {project.name}
                </h2>

                {/* Active agents badge */}
                {project.activeAgents > 0 ? (
                  <span className="glass-primary inline-flex items-center gap-1.5 rounded-oma-full px-2.5 py-1 text-xs font-medium text-oma-primary">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-oma-progress" />
                    {project.activeAgents} agent
                    {project.activeAgents > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="glass-sm inline-flex items-center rounded-oma-full px-2.5 py-1 text-xs font-medium text-oma-text-subtle">
                    Idle
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="mb-5 text-sm leading-relaxed text-oma-text-muted">
                {project.description}
              </p>

              {/* Progress section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-oma-text">
                    {project.featuresPassing}/{project.featuresTotal} passing
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
        })}
      </div>
    </div>
  );
}
