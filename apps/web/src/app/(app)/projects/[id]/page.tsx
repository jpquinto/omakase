"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { KanbanBoard } from "@/components/kanban-board";
import { DependencyGraph } from "@/components/dependency-graph";
import { AgentMissionControl } from "@/components/agent-mission-control";
import { LogViewer } from "@/components/log-viewer";
import { AgentChatPanel } from "@/components/agent-chat-panel";
import { CelebrationOverlay } from "@/components/celebration-overlay";
import { TicketsTable } from "@/components/tickets-table";
import { FeatureDetailPanel } from "@/components/feature-detail-panel";
import { LinearWorkspaceBrowser } from "@/components/linear-workspace-browser";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LiquidTabs,
  LiquidTabsList,
  LiquidTabsTrigger,
  LiquidTabsContent,
} from "@/components/ui/liquid-tabs";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useProject, useFeatureStats, useActiveAgents, useProjectFeatures, useDisconnectLinear } from "@/hooks/use-api";
import { apiFetch } from "@/lib/api-client";
import { ScrollReveal } from "@/components/scroll-reveal";
import { cn } from "@/lib/utils";
import type { AgentRunRole, Feature } from "@omakase/db";

// ---------------------------------------------------------------------------
// Project Detail Page
//
// Tabbed layout showing all aspects of a single project: Kanban board,
// dependency graph, agent mission control, logs, and settings. Uses the
// Omakase liquid glass design system with frosted surfaces and glow accents.
//
// Data is fetched from the orchestrator API via polling hooks.
// ---------------------------------------------------------------------------

type TabId = "kanban" | "tickets" | "graph" | "agents" | "logs" | "settings";

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: "kanban", label: "Kanban" },
  { id: "tickets", label: "Tickets" },
  { id: "graph", label: "Graph" },
  { id: "agents", label: "Agents" },
  { id: "logs", label: "Logs" },
  { id: "settings", label: "Settings" },
];

/** Maps agent role to border color class for the chat modal */
const ROLE_MODAL_BORDER: Record<AgentRunRole, string> = {
  architect: "border-oma-gold/20",
  coder: "border-oma-indigo/20",
  reviewer: "border-oma-secondary/20",
  tester: "border-oma-jade/20",
};

interface ChatTarget {
  runId: string;
  agentName: string;
  agentMascot: string;
  agentRole: AgentRunRole;
  featureName: string;
  isActive: boolean;
  threadId?: string;
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabId>("kanban");
  const [showCelebration, setShowCelebration] = useState(false);
  const [chatTarget, setChatTarget] = useState<ChatTarget | null>(null);

  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [browserOpen, setBrowserOpen] = useState(false);

  // Fetch project data from the API
  const { data: project, isLoading: projectLoading } = useProject(params.id);
  const { data: stats } = useFeatureStats(params.id);
  const { data: activeAgentRuns } = useActiveAgents(params.id);
  const { data: features, refetch: refetchFeatures } = useProjectFeatures(params.id);

  const featuresPassing = stats?.passing ?? 0;
  const featuresTotal = stats?.total ?? 0;
  const activeAgents = activeAgentRuns?.length ?? 0;
  const hasLinearConnection = !!(project?.linearTeamId && project?.linearAccessToken);

  const handleOpenChat = useCallback((target: ChatTarget) => {
    setChatTarget(target);
  }, []);

  // Keyboard shortcut: G toggles between Kanban and Graph
  const handleToggleGraph = useCallback(() => {
    setActiveTab((prev) => (prev === "graph" ? "kanban" : "graph"));
  }, []);

  useKeyboardShortcuts({
    onToggleGraph: handleToggleGraph,
  });

  const progressPercent =
    featuresTotal > 0
      ? Math.round((featuresPassing / featuresTotal) * 100)
      : 0;

  // Show a loading skeleton while the project data is being fetched
  if (projectLoading || !project) {
    return <ProjectDetailSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Celebration overlay */}
      <CelebrationOverlay
        show={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />

      {/* Breadcrumb and project header */}
      <ScrollReveal>
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-oma-text-subtle">
            <Link
              href="/projects"
              className="transition-colors hover:text-oma-primary"
            >
              Projects
            </Link>
            <span>/</span>
            <span className="text-oma-text">{project.name}</span>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-serif text-2xl font-semibold text-oma-text">
                {project.name}
              </h1>
              <p className="mt-1 text-sm text-oma-text-muted">
                {project.description ?? "No description"}
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
                  {featuresPassing}/{featuresTotal}
                </span>
              </div>

              {/* Active agents badge */}
              <div className="glass-primary flex items-center gap-1.5 rounded-oma px-3 py-2">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-oma-progress" />
                <span className="text-xs font-medium text-oma-primary">
                  {activeAgents} agent
                  {activeAgents !== 1 ? "s" : ""}
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
        {/* Gradient separator */}
        <div className="mt-6 h-px w-full bg-gradient-to-r from-oma-primary/40 via-oma-glass-border to-transparent" />
      </ScrollReveal>

      {/* Tabs */}
      <LiquidTabs className="gap-6" value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <ScrollReveal delay={100}>
          <LiquidTabsList>
            {TABS.map((tab) => (
              <LiquidTabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </LiquidTabsTrigger>
            ))}
          </LiquidTabsList>
        </ScrollReveal>

        <LiquidTabsContent value="kanban">
          <KanbanBoard projectId={params.id} />
        </LiquidTabsContent>
        <LiquidTabsContent value="tickets">
          <TicketsTable
            projectId={params.id}
            features={features ?? []}
            onRefetch={refetchFeatures}
            onSelectFeature={setSelectedFeature}
            onBrowseLinear={() => setBrowserOpen(true)}
            hasLinearConnection={hasLinearConnection}
          />
        </LiquidTabsContent>
        <LiquidTabsContent value="graph">
          <DependencyGraph />
        </LiquidTabsContent>
        <LiquidTabsContent value="agents">
          <AgentMissionControl onOpenChat={handleOpenChat} activeChatRunId={chatTarget?.runId ?? null} />
        </LiquidTabsContent>
        <LiquidTabsContent value="logs">
          <LogViewer onOpenChat={handleOpenChat} />
        </LiquidTabsContent>
        <LiquidTabsContent value="settings">
          <SettingsTab
            projectId={params.id}
            projectName={project.name}
            projectDescription={project.description ?? ""}
            maxConcurrency={project.maxConcurrency}
            linearTeamId={project.linearTeamId}
            hasLinearConnection={hasLinearConnection}
            githubRepoOwner={project.repoUrl?.split("/").slice(-2, -1)[0]}
            githubRepoName={project.repoUrl?.split("/").pop()?.replace(".git", "")}
            hasGitHubConnection={!!project.repoUrl}
          />
        </LiquidTabsContent>
      </LiquidTabs>

      {/* Feature detail modal */}
      <FeatureDetailPanel
        feature={selectedFeature}
        allFeatures={features ?? []}
        onClose={() => setSelectedFeature(null)}
        onUpdate={() => { refetchFeatures(); }}
      />

      {/* Linear workspace browser */}
      <LinearWorkspaceBrowser
        projectId={params.id}
        open={browserOpen}
        onClose={() => setBrowserOpen(false)}
        onImportComplete={refetchFeatures}
      />

      {/* Chat modal */}
      <Dialog open={!!chatTarget} onOpenChange={(open) => { if (!open) setChatTarget(null); }}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "glass-lg flex h-[92vh] w-[85vw] max-w-[1100px] flex-col overflow-hidden rounded-oma-lg border bg-oma-bg-elevated p-0 shadow-oma-lg",
            chatTarget ? ROLE_MODAL_BORDER[chatTarget.agentRole] : "border-oma-glass-border",
          )}
        >
          <DialogTitle className="sr-only">
            {chatTarget ? `Chat with ${chatTarget.agentName}` : "Agent Chat"}
          </DialogTitle>
          {chatTarget && (
            <AgentChatPanel
              runId={chatTarget.runId}
              agent={{ name: chatTarget.agentName, mascot: chatTarget.agentMascot, role: chatTarget.agentRole }}
              featureName={chatTarget.featureName}
              projectId={params.id}
              isActive={chatTarget.isActive}
              onClose={() => setChatTarget(null)}
              initialThreadId={chatTarget.threadId}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProjectDetailSkeleton — full-page loading placeholder
// ---------------------------------------------------------------------------

function ProjectDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb skeleton */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <div className="h-3 w-14 animate-pulse rounded bg-oma-bg-surface" />
          <span className="text-xs text-oma-text-subtle">/</span>
          <div className="h-3 w-32 animate-pulse rounded bg-oma-bg-surface" />
        </div>
        <div className="flex items-start justify-between">
          <div>
            <div className="h-7 w-56 animate-pulse rounded-oma bg-oma-bg-surface" />
            <div className="mt-2 h-4 w-80 animate-pulse rounded bg-oma-bg-surface" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-28 animate-pulse rounded-oma bg-oma-bg-surface" />
            <div className="h-9 w-24 animate-pulse rounded-oma bg-oma-bg-surface" />
          </div>
        </div>
      </div>

      {/* Tab bar skeleton */}
      <div className="glass-sm flex overflow-hidden rounded-oma-lg">
        {["Kanban", "Tickets", "Graph", "Agents", "Logs", "Settings"].map((label) => (
          <div
            key={label}
            className="border-r border-oma-glass-border px-6 py-3 last:border-r-0"
          >
            <div className="h-4 w-12 animate-pulse rounded bg-oma-bg-surface" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="h-64 animate-pulse rounded-oma-lg bg-oma-bg-surface" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings Tab
// ---------------------------------------------------------------------------

interface SettingsTabProps {
  projectId: string;
  projectName: string;
  projectDescription: string;
  maxConcurrency: number;
  linearTeamId?: string;
  hasLinearConnection: boolean;
  githubRepoOwner?: string;
  githubRepoName?: string;
  hasGitHubConnection: boolean;
}

function SettingsTab({ projectId, projectName, projectDescription, maxConcurrency, linearTeamId, hasLinearConnection, githubRepoOwner, githubRepoName, hasGitHubConnection }: SettingsTabProps) {
  const [yoloEnabled, setYoloEnabled] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const disconnectLinear = useDisconnectLinear();

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true);
    try {
      await disconnectLinear(projectId);
      setShowDisconnectConfirm(false);
      window.location.reload();
    } catch {
      setDisconnecting(false);
    }
  }, [disconnectLinear, projectId]);

  const [disconnectingGitHub, setDisconnectingGitHub] = useState(false);
  const [showGitHubDisconnectConfirm, setShowGitHubDisconnectConfirm] = useState(false);

  const handleGitHubDisconnect = useCallback(async () => {
    setDisconnectingGitHub(true);
    try {
      // TODO: implement useDisconnectGitHub hook
      setShowGitHubDisconnectConfirm(false);
      window.location.reload();
    } catch {
      setDisconnectingGitHub(false);
    }
  }, [projectId]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="font-serif text-lg font-semibold text-oma-text">
        Project Settings
      </h2>

      {/* Linear Integration */}
      <ScrollReveal>
        <div className="glass rounded-oma-lg p-6">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-oma-text-subtle">
            Linear Integration
          </h3>

          {hasLinearConnection ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-oma-done" />
                  <div>
                    <p className="text-sm font-medium text-oma-text">Connected</p>
                    <p className="text-[11px] text-oma-text-muted">
                      Team ID: {linearTeamId}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDisconnectConfirm(true)}
                  className="rounded-oma bg-oma-secondary/10 px-3 py-1.5 text-xs font-medium text-oma-secondary transition-colors hover:bg-oma-secondary/20"
                >
                  Disconnect
                </button>
              </div>

              {showDisconnectConfirm && (
                <div className="glass-sm rounded-oma border border-oma-secondary/30 p-4">
                  <p className="mb-3 text-sm text-oma-text">
                    Disconnect Linear? Synced features will be kept, but no new updates will be received.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="rounded-oma bg-oma-secondary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-oma-secondary-dim disabled:opacity-50"
                    >
                      {disconnecting ? "Disconnecting..." : "Confirm Disconnect"}
                    </button>
                    <button
                      onClick={() => setShowDisconnectConfirm(false)}
                      className="rounded-oma px-3 py-1.5 text-xs font-medium text-oma-text-muted transition-colors hover:text-oma-text"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-oma-text">Not connected</p>
                <p className="text-[11px] text-oma-text-muted">
                  Connect a Linear workspace to sync tickets
                </p>
              </div>
              <a
                href={`/api/auth/linear?projectId=${projectId}`}
                className="rounded-oma bg-oma-primary px-4 py-2 text-xs font-medium text-white transition-colors duration-200 hover:bg-oma-primary-dim"
              >
                Connect Linear
              </a>
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* GitHub Integration */}
      <ScrollReveal delay={25}>
        <div className="glass rounded-oma-lg p-6">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-oma-text-subtle">
            GitHub Integration
          </h3>

          {hasGitHubConnection ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-oma-done" />
                  <div>
                    <p className="text-sm font-medium text-oma-text">Connected</p>
                    <p className="text-[11px] text-oma-text-muted">
                      {githubRepoOwner}/{githubRepoName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGitHubDisconnectConfirm(true)}
                  className="rounded-oma bg-oma-secondary/10 px-3 py-1.5 text-xs font-medium text-oma-secondary transition-colors hover:bg-oma-secondary/20"
                >
                  Disconnect
                </button>
              </div>

              {showGitHubDisconnectConfirm && (
                <div className="glass-sm rounded-oma border border-oma-secondary/30 p-4">
                  <p className="mb-3 text-sm text-oma-text">
                    Disconnect GitHub? Existing pull requests will be kept, but new PRs won&apos;t be created automatically.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleGitHubDisconnect}
                      disabled={disconnectingGitHub}
                      className="rounded-oma bg-oma-secondary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-oma-secondary-dim disabled:opacity-50"
                    >
                      {disconnectingGitHub ? "Disconnecting..." : "Confirm Disconnect"}
                    </button>
                    <button
                      onClick={() => setShowGitHubDisconnectConfirm(false)}
                      className="rounded-oma px-3 py-1.5 text-xs font-medium text-oma-text-muted transition-colors hover:text-oma-text"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-oma-text">Not connected</p>
                <p className="text-[11px] text-oma-text-muted">
                  Connect a GitHub repository for automated PR creation
                </p>
              </div>
              <a
                href={`/api/auth/github?projectId=${projectId}`}
                className="rounded-oma bg-oma-text px-4 py-2 text-xs font-medium text-oma-bg transition-colors duration-200 hover:bg-oma-text/90"
              >
                Connect GitHub
              </a>
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* General settings */}
      <ScrollReveal delay={75}>
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
                defaultValue={projectName}
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
                defaultValue={projectDescription}
                className="glass-sm w-full resize-none rounded-oma border border-oma-glass-border bg-transparent px-3 py-2.5 text-sm text-oma-text outline-none transition-colors focus:border-oma-primary focus:ring-1 focus:ring-oma-primary/30"
              />
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Agent settings */}
      <ScrollReveal delay={125}>
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
                defaultValue={maxConcurrency}
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
      </ScrollReveal>

      {/* Danger zone */}
      <ScrollReveal delay={225}>
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
      </ScrollReveal>

      {/* Project ID for reference */}
      <p className="text-[10px] font-medium text-oma-text-faint">
        Project ID: {projectId}
      </p>
    </div>
  );
}
