"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { KanbanBoard } from "@/components/kanban-board";
import { DependencyGraph } from "@/components/dependency-graph";
import { AgentMissionControl } from "@/components/agent-mission-control";
import { LogViewer } from "@/components/log-viewer";
import { CelebrationOverlay } from "@/components/celebration-overlay";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

// ---------------------------------------------------------------------------
// Project Detail Page
//
// Tabbed layout showing all aspects of a single project: Kanban board,
// dependency graph, agent mission control, logs, and settings. Uses the
// neobrutalism design system with bold tab borders and status colors.
//
// Mock data will be replaced with Convex queries once wired:
//   import { useQuery } from "convex/react";
//   import { api } from "@autoforge/convex/convex/_generated/api";
//   const project = useQuery(api.projects.get, { id });
// ---------------------------------------------------------------------------

type TabId = "kanban" | "graph" | "agents" | "logs" | "settings";

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: "kanban", label: "Kanban" },
  { id: "graph", label: "Graph" },
  { id: "agents", label: "Agents" },
  { id: "logs", label: "Logs" },
  { id: "settings", label: "Settings" },
];

/** Mock project metadata */
const MOCK_PROJECT = {
  name: "E-Commerce Platform",
  description: "Full-stack e-commerce app with auth, cart, and payments",
  featuresPassing: 7,
  featuresTotal: 12,
  activeAgents: 3,
  status: "active" as const,
};

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabId>("kanban");
  const [showCelebration, setShowCelebration] = useState(false);

  // Keyboard shortcut: G toggles between Kanban and Graph
  const handleToggleGraph = useCallback(() => {
    setActiveTab((prev) => (prev === "graph" ? "kanban" : "graph"));
  }, []);

  useKeyboardShortcuts({
    onToggleGraph: handleToggleGraph,
  });

  const progressPercent =
    MOCK_PROJECT.featuresTotal > 0
      ? Math.round(
          (MOCK_PROJECT.featuresPassing / MOCK_PROJECT.featuresTotal) * 100,
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Celebration overlay */}
      <CelebrationOverlay
        show={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />

      {/* Breadcrumb and project header */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-bold text-neo-muted-foreground">
          <Link href="/projects" className="hover:text-neo-foreground">
            Projects
          </Link>
          <span>/</span>
          <span className="text-neo-foreground">{MOCK_PROJECT.name}</span>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-neo-foreground">
              {MOCK_PROJECT.name}
            </h1>
            <p className="mt-1 text-sm text-neo-muted-foreground">
              {MOCK_PROJECT.description}
            </p>
          </div>

          {/* Stats badges */}
          <div className="flex items-center gap-3">
            {/* Progress badge */}
            <div className="neo-card flex items-center gap-2 rounded-none px-3 py-2">
              <div className="neo-border h-2.5 w-20 overflow-hidden rounded-none bg-neo-muted">
                <div
                  className="h-full bg-neo-done"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-black text-neo-foreground">
                {MOCK_PROJECT.featuresPassing}/{MOCK_PROJECT.featuresTotal}
              </span>
            </div>

            {/* Active agents badge */}
            <div className="neo-card flex items-center gap-1.5 rounded-none bg-neo-progress px-3 py-2">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-neo-foreground" />
              <span className="text-xs font-black text-neo-foreground">
                {MOCK_PROJECT.activeAgents} agent{MOCK_PROJECT.activeAgents !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Celebrate button (for demo) */}
            <button
              onClick={() => setShowCelebration(true)}
              className="neo-btn rounded-none bg-neo-accent px-3 py-2 text-xs text-neo-foreground"
            >
              Celebrate
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="neo-border flex overflow-hidden bg-neo-card">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative border-r-2 border-neo-border px-6 py-3 text-sm font-black uppercase tracking-wider transition-colors last:border-r-0 ${
                isActive
                  ? "bg-neo-foreground text-white"
                  : "bg-neo-card text-neo-foreground hover:bg-neo-muted"
              }`}
            >
              {tab.label}
              {/* Active tab bottom indicator */}
              {isActive && (
                <span className="absolute bottom-0 left-0 h-[3px] w-full bg-neo-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="animate-[fade-in_0.15s_ease-out]">
        {activeTab === "kanban" && <KanbanBoard />}
        {activeTab === "graph" && <DependencyGraph />}
        {activeTab === "agents" && <AgentMissionControl />}
        {activeTab === "logs" && <LogViewer />}
        {activeTab === "settings" && <SettingsTab projectId={params.id} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings Tab (inline for now, can be extracted later)
// ---------------------------------------------------------------------------

function SettingsTab({ projectId }: { projectId: string }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-lg font-black tracking-tight text-neo-foreground">
        Project Settings
      </h2>

      {/* General settings */}
      <div className="neo-card rounded-none p-6">
        <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-neo-foreground">
          General
        </h3>

        <div className="space-y-4">
          {/* Project name */}
          <div>
            <label
              htmlFor="project-name"
              className="mb-1 block text-xs font-bold text-neo-muted-foreground"
            >
              Project Name
            </label>
            <input
              id="project-name"
              type="text"
              defaultValue={MOCK_PROJECT.name}
              className="neo-border w-full rounded-none bg-white px-3 py-2 text-sm font-semibold text-neo-foreground outline-none focus:shadow-[3px_3px_0px_#6366f1]"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="project-desc"
              className="mb-1 block text-xs font-bold text-neo-muted-foreground"
            >
              Description
            </label>
            <textarea
              id="project-desc"
              rows={3}
              defaultValue={MOCK_PROJECT.description}
              className="neo-border w-full resize-none rounded-none bg-white px-3 py-2 text-sm font-semibold text-neo-foreground outline-none focus:shadow-[3px_3px_0px_#6366f1]"
            />
          </div>
        </div>
      </div>

      {/* Agent settings */}
      <div className="neo-card rounded-none p-6">
        <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-neo-foreground">
          Agent Configuration
        </h3>

        <div className="space-y-4">
          {/* Max concurrency */}
          <div>
            <label
              htmlFor="max-concurrency"
              className="mb-1 block text-xs font-bold text-neo-muted-foreground"
            >
              Max Concurrency
            </label>
            <input
              id="max-concurrency"
              type="number"
              min={1}
              max={5}
              defaultValue={3}
              className="neo-border w-24 rounded-none bg-white px-3 py-2 text-sm font-semibold text-neo-foreground outline-none focus:shadow-[3px_3px_0px_#6366f1]"
            />
            <p className="mt-1 text-[11px] text-neo-muted-foreground">
              Maximum number of concurrent coding agents (1-5)
            </p>
          </div>

          {/* YOLO mode */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-neo-foreground">YOLO Mode</p>
              <p className="text-[11px] text-neo-muted-foreground">
                Skip testing for rapid prototyping
              </p>
            </div>
            <div className="neo-border flex h-6 w-11 cursor-pointer items-center rounded-none bg-neo-muted px-0.5">
              <div className="h-4 w-4 rounded-none bg-neo-foreground transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="neo-card rounded-none border-neo-fail p-6" style={{ borderColor: "#f87171" }}>
        <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-neo-fail">
          Danger Zone
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-neo-foreground">Archive Project</p>
            <p className="text-[11px] text-neo-muted-foreground">
              Archive this project and stop all agents
            </p>
          </div>
          <button className="neo-btn rounded-none bg-neo-fail px-4 py-2 text-xs text-white">
            Archive
          </button>
        </div>
      </div>

      {/* Project ID for reference */}
      <p className="text-[10px] font-bold text-neo-muted-foreground">
        Project ID: {projectId}
      </p>
    </div>
  );
}
