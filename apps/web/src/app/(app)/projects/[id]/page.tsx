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
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Project Detail Page
//
// Tabbed layout showing all aspects of a single project: Kanban board,
// dependency graph, agent mission control, logs, and settings. Uses the
// Omakase liquid glass design system with frosted surfaces and glow accents.
//
// Mock data will be replaced with orchestrator API hooks once wired:
//   import { useProject, useProjectFeatures } from "@/hooks/use-api";
//   const { data: project } = useProject(id);
//   const { data: features } = useProjectFeatures(id);
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
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-oma-text-subtle">
          <Link
            href="/projects"
            className="transition-colors hover:text-oma-primary"
          >
            Projects
          </Link>
          <span>/</span>
          <span className="text-oma-text">{MOCK_PROJECT.name}</span>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-oma-text">
              {MOCK_PROJECT.name}
            </h1>
            <p className="mt-1 text-sm text-oma-text-muted">
              {MOCK_PROJECT.description}
            </p>
          </div>

          {/* Stats badges */}
          <div className="flex items-center gap-3">
            {/* Progress badge */}
            <div className="glass-sm flex items-center gap-2.5 rounded-oma px-3 py-2">
              <div className="h-1.5 w-20 overflow-hidden rounded-oma-full bg-oma-bg-surface">
                <div
                  className="h-full rounded-oma-full bg-oma-done transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-medium text-oma-text">
                {MOCK_PROJECT.featuresPassing}/{MOCK_PROJECT.featuresTotal}
              </span>
            </div>

            {/* Active agents badge */}
            <div className="glass-primary flex items-center gap-1.5 rounded-oma px-3 py-2">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-oma-progress" />
              <span className="text-xs font-medium text-oma-primary">
                {MOCK_PROJECT.activeAgents} agent
                {MOCK_PROJECT.activeAgents !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Celebrate button (for demo) */}
            <button
              onClick={() => setShowCelebration(true)}
              className="rounded-oma bg-gradient-to-r from-oma-gold to-oma-gold-soft px-3 py-2 text-xs font-medium text-white shadow-oma-sm transition-all duration-200 hover:shadow-oma-glow-gold hover:brightness-110"
            >
              Celebrate
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="glass-sm flex overflow-hidden rounded-oma-lg">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative border-r border-oma-glass-border px-6 py-3 text-sm font-medium tracking-wide transition-all duration-200 last:border-r-0",
                isActive
                  ? "glass-primary text-oma-primary"
                  : "text-oma-text-muted hover:bg-white/[0.04] hover:text-oma-text",
              )}
            >
              {tab.label}
              {/* Active tab bottom indicator: gradient accent line */}
              {isActive && (
                <span className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-oma-primary to-oma-primary-soft" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="animate-oma-fade-up">
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
  const [yoloEnabled, setYoloEnabled] = useState(false);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="font-serif text-lg font-semibold text-oma-text">
        Project Settings
      </h2>

      {/* General settings */}
      <div className="glass rounded-oma-lg p-6">
        <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-oma-text-subtle">
          General
        </h3>

        <div className="space-y-4">
          {/* Project name */}
          <div>
            <label
              htmlFor="project-name"
              className="mb-1.5 block text-xs font-medium text-oma-text-muted"
            >
              Project Name
            </label>
            <input
              id="project-name"
              type="text"
              defaultValue={MOCK_PROJECT.name}
              className="glass-sm w-full rounded-oma border border-oma-glass-border bg-transparent px-3 py-2.5 text-sm text-oma-text outline-none transition-colors focus:border-oma-primary focus:ring-1 focus:ring-oma-primary/30"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="project-desc"
              className="mb-1.5 block text-xs font-medium text-oma-text-muted"
            >
              Description
            </label>
            <textarea
              id="project-desc"
              rows={3}
              defaultValue={MOCK_PROJECT.description}
              className="glass-sm w-full resize-none rounded-oma border border-oma-glass-border bg-transparent px-3 py-2.5 text-sm text-oma-text outline-none transition-colors focus:border-oma-primary focus:ring-1 focus:ring-oma-primary/30"
            />
          </div>
        </div>
      </div>

      {/* Agent settings */}
      <div className="glass rounded-oma-lg p-6">
        <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-oma-text-subtle">
          Agent Configuration
        </h3>

        <div className="space-y-4">
          {/* Max concurrency */}
          <div>
            <label
              htmlFor="max-concurrency"
              className="mb-1.5 block text-xs font-medium text-oma-text-muted"
            >
              Max Concurrency
            </label>
            <input
              id="max-concurrency"
              type="number"
              min={1}
              max={5}
              defaultValue={3}
              className="glass-sm w-24 rounded-oma border border-oma-glass-border bg-transparent px-3 py-2.5 text-sm text-oma-text outline-none transition-colors focus:border-oma-primary focus:ring-1 focus:ring-oma-primary/30"
            />
            <p className="mt-1.5 text-[11px] text-oma-text-muted">
              Maximum number of concurrent coding agents (1-5)
            </p>
          </div>

          {/* YOLO mode toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-oma-text">YOLO Mode</p>
              <p className="text-[11px] text-oma-text-muted">
                Skip testing for rapid prototyping
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={yoloEnabled}
              onClick={() => setYoloEnabled(!yoloEnabled)}
              className={cn(
                "relative flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-oma-full border border-oma-glass-border transition-colors duration-200",
                yoloEnabled
                  ? "bg-oma-primary/20 border-oma-primary/40"
                  : "bg-oma-bg-surface",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none block h-4 w-4 rounded-full shadow-oma-sm transition-transform duration-200",
                  yoloEnabled
                    ? "translate-x-[22px] bg-oma-primary"
                    : "translate-x-[3px] bg-oma-text-subtle",
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="glass rounded-oma-lg border border-oma-secondary/30 p-6">
        <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-oma-secondary">
          Danger Zone
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-oma-text">
              Archive Project
            </p>
            <p className="text-[11px] text-oma-text-muted">
              Archive this project and stop all agents
            </p>
          </div>
          <button className="rounded-oma bg-oma-secondary px-4 py-2 text-xs font-medium text-white transition-colors duration-200 hover:bg-oma-secondary-dim">
            Archive
          </button>
        </div>
      </div>

      {/* Project ID for reference */}
      <p className="text-[10px] font-medium text-oma-text-faint">
        Project ID: {projectId}
      </p>
    </div>
  );
}
