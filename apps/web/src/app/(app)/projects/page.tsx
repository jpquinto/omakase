"use client";

import Link from "next/link";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Mock data representing projects. Will be replaced with Convex useQuery once
// the backend is fully wired:
//   import { useQuery } from "convex/react";
//   import { api } from "@omakase/convex/convex/_generated/api";
//   const projects = useQuery(api.projects.list);
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
        <h1 className="text-3xl font-black tracking-tight text-neo-foreground">
          Projects
        </h1>
        <button className="neo-btn rounded-none bg-neo-primary px-5 py-2.5 text-sm text-neo-primary-foreground">
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
              className="neo-card block rounded-none p-6 transition-transform hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#000000]"
            >
              {/* Card header */}
              <div className="mb-4 flex items-start justify-between">
                <h2 className="text-lg font-black tracking-tight text-neo-foreground">
                  {project.name}
                </h2>

                {/* Active agents badge */}
                {project.activeAgents > 0 ? (
                  <span className="neo-border inline-flex items-center gap-1 rounded-none bg-neo-progress px-2 py-0.5 text-xs font-bold text-neo-foreground">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-neo-foreground" />
                    {project.activeAgents} agent{project.activeAgents > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="neo-border inline-flex items-center rounded-none bg-neo-muted px-2 py-0.5 text-xs font-bold text-neo-muted-foreground">
                    Idle
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="mb-5 text-sm text-neo-muted-foreground leading-relaxed">
                {project.description}
              </p>

              {/* Progress section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-neo-foreground">
                    {project.featuresPassing}/{project.featuresTotal} passing
                  </span>
                  <span className="text-neo-muted-foreground">
                    {progressPercent}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="neo-border h-3 w-full overflow-hidden rounded-none bg-neo-muted">
                  <div
                    className="h-full bg-neo-done transition-all duration-500 ease-out"
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
