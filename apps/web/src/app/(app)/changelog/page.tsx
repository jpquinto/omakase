"use client";

import { cn } from "@/lib/utils";

const RELEASES = [
  {
    version: "v0.0.9",
    title: "Agent Job Queues",
    changes: {
      added: [
        "Per-agent job queue system — dispatching to a busy agent enqueues instead of rejecting",
        "DynamoDB queue repository with gap-numbered positioning for efficient reordering",
        "Queue manager orchestrator that auto-processes next job when a session completes",
        "Queue API endpoints: list, enqueue, remove, reorder, and cross-agent queue summaries",
        "useAgentQueue hook with 5-second polling and optimistic updates for remove/reorder",
        "Queue depth badge on mission control agent cards showing \"+N queued\" when agents are busy",
        "Agent profile queue list with position display, reorder controls, and remove buttons",
        "Ticket assignment popover shows \"Queue (#N)\" for busy agents instead of disabling them",
        "Ticket row badges showing \"Queued #N\" with agent mascot for features waiting in queue",
      ],
      changed: [
        "Feature assignment endpoint returns HTTP 202 with queue position instead of 409/429 when agent is busy or at capacity",
        "Agent status endpoint includes queueDepth and nextJob preview for each agent",
        "useAgentDispatch hook enqueues jobs for busy agents with success toast instead of throwing errors",
        "Work sessions auto-end when Claude Code subprocess exits, returning agents to idle status",
      ],
      fixed: [
        "Queue processNext resolving project repoUrl and GitHub token so agents work in the correct repo directory",
        "DynamoDB Limit + FilterExpression interaction causing queued jobs to be invisible behind completed items",
        "SSE streaming through nginx — added initial heartbeat comment to flush Bun response headers",
      ],
    },
  },
  {
    version: "v0.0.8",
    title: "Settings & Orchestrator Health",
    changes: {
      added: [
        "Settings page with live orchestrator health status indicator",
        "Orchestrator health polling hook (useOrchestratorHealth) with 15s interval",
        "AUTO_DISPATCH environment variable to disable automatic pipeline dispatch",
      ],
      changed: [
        "Upgraded EC2 instance from t3.small to t3.medium (4GB RAM) to support Claude Code CLI pipelines",
      ],
      fixed: [
        "Orchestrator OOM crash caused by auto-dispatched Claude Code CLI processes exhausting 2GB RAM",
      ],
    },
  },
  {
    version: "v0.0.7",
    title: "Linear Workspace Integration",
    changes: {
      added: [
        "Workspace-level Linear OAuth — connect once, sync all projects",
        "Automatic 1:1 project mapping between Linear and Omakase",
        "Workspaces DynamoDB table with organization lookup GSI",
        "Project sync endpoint to discover and import Linear projects",
        "Webhook routing by Linear project ID instead of team ID",
      ],
      changed: [
        "Linear tokens stored on workspace record instead of per-project",
        "OAuth callback creates workspace and triggers project sync automatically",
        "Feature watcher resolves Linear token from workspace",
        "Ticket sync routes issues by linearProjectId via new GSI",
      ],
      fixed: [
        "OAuth callback handling empty workspace lookup responses",
        "Elysia null serialization returning empty body instead of valid JSON",
      ],
    },
  },
  {
    version: "v0.0.6",
    title: "GitHub Integration & Project Wizard",
    changes: {
      added: [
        "Review_ready feature status and GitHub project fields",
        "GitHub App integration in orchestrator",
        "Project creation wizard with GitHub repo selector",
        "PR notification cards",
        "Workspace file explorer and fullscreen chat enhancements",
        "Resizable panels UI component",
      ],
      changed: [
        "Replaced browser SpeechSynthesis TTS with ElevenLabs voice synthesis",
        "Improved chat input UX: always-visible textarea, voice blob captions, LiquidTabs",
        "Review_ready status displayed across frontend",
      ],
    },
  },
  {
    version: "v0.0.5",
    title: "Voice Chat & Work Sessions",
    changes: {
      added: [
        "Work session enhancements: optional projectId, repoUrl resolution",
        "Voice chat infrastructure: blob visualizer, voice hook, CSS animations",
        "Voice talk mode integrated into chat input and agent chat panel",
        "Voice section in style system showcase",
        "Breadcrumb navigation in app header",
      ],
    },
  },
  {
    version: "v0.0.4",
    title: "Polish & Integrations",
    changes: {
      added: [
        "Weather widget with location-based forecast",
        "Spotify playback controls (play, pause, skip)",
        "New conversation button in fullscreen chat header",
      ],
      changed: [
        "Applied design system tokens consistently across Spotify player and style system",
      ],
      fixed: [
        "SSE reconnect timer cleanup in agent chat hook",
        "Thread selection during streaming",
        "Fullscreen chat welcome screen",
      ],
    },
  },
  {
    version: "v0.0.3",
    title: "Threads, Personalities & Dashboard",
    changes: {
      added: [
        "Agent thread system with DynamoDB data layer",
        "Agent memory and personality system",
        "Message enhancements: thread and quiz support",
        "Agent run stats, activity tracking, and feature bulk operations",
        "Orchestrator stream bus and personality-driven agent responder",
        "Work session manager for Claude Code subprocesses",
        "Quiz handler for in-chat quiz games",
        "Chat, thread, work session, and quiz API endpoints",
        "Linear API routes and improved sync operations",
        "Spotify now-playing integration",
        "Agent profile pages with hero, stats grid, and activity heatmap",
        "Feature detail panel, tickets table, and workspace browser",
        "Global CSS utilities and enhanced style system showcase",
      ],
    },
  },
  {
    version: "v0.0.2",
    title: "Linear Integration & Agent Chat",
    changes: {
      added: [
        "Linear backend integration for bidirectional issue sync",
        "Liquid Glass design system documentation (STYLE_GUIDE.md)",
        "Agent messages data layer for real-time chat",
        "Agent-messages DynamoDB table in infrastructure",
        "Agent chat API endpoints and local execution mode",
        "Agent chat UI with named agents: Miso, Nori, Koji, Toro",
      ],
      changed: [
        "Set Instrument Serif as default heading font",
      ],
    },
  },
  {
    version: "v0.0.1",
    title: "Foundation",
    changes: {
      added: [
        "Next.js 15 + Elysia + DynamoDB tech stack",
        "ECS container entrypoint",
        "CLI configuration for AI session tracking",
        "DynamoDB migration from Convex",
        "Liquid Glass design system",
      ],
      changed: [
        "Renamed project from AutoForge to Omakase",
      ],
    },
  },
];

const CATEGORY_STYLES: Record<string, { label: string; dot: string; text: string }> = {
  added: { label: "Added", dot: "bg-oma-jade", text: "text-oma-jade" },
  changed: { label: "Changed", dot: "bg-oma-gold", text: "text-oma-gold" },
  fixed: { label: "Fixed", dot: "bg-oma-secondary", text: "text-oma-secondary" },
};

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl">
      {/* Hero */}
      <div className="mb-12 animate-oma-fade-up opacity-0" style={{ animationFillMode: "forwards" }}>
        <h1 className="font-serif text-4xl font-semibold text-oma-text md:text-5xl">
          Changelog
        </h1>
        <p className="mt-3 text-base text-oma-text-muted">
          A record of everything shipped — from foundation to the latest features.
        </p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-0 w-px bg-gradient-to-b from-oma-primary/40 via-oma-glass-border to-transparent" />

        <div className="space-y-10">
          {RELEASES.map((release, i) => (
            <div
              key={release.version}
              className="relative pl-10 animate-oma-fade-up opacity-0"
              style={{
                animationDelay: `${(i + 1) * 120}ms`,
                animationFillMode: "forwards",
              }}
            >
              {/* Timeline dot */}
              <div className="absolute left-0 top-1.5 flex size-[23px] items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-oma-primary/20 animate-pulse" style={{ animationDuration: "3s" }} />
                <div className="relative size-2.5 rounded-full bg-oma-primary shadow-[0_0_8px_rgba(244,114,182,0.5)]" />
              </div>

              {/* Release card */}
              <div className="glass rounded-oma-lg p-5 md:p-6 transition-all duration-300 hover:border-oma-glass-border-bright">
                {/* Header */}
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center rounded-oma-full bg-oma-primary/15 px-3 py-1 font-mono text-xs font-semibold text-oma-primary">
                    {release.version}
                  </span>
                  <h2 className="font-serif text-lg font-semibold text-oma-text md:text-xl">
                    {release.title}
                  </h2>
                </div>

                {/* Change categories */}
                <div className="space-y-4">
                  {(Object.entries(release.changes) as [string, string[]][]).map(
                    ([category, items]) => {
                      const style = CATEGORY_STYLES[category];
                      if (!style || items.length === 0) return null;

                      return (
                        <div key={category}>
                          <h3 className={cn("mb-2 text-xs font-semibold uppercase tracking-widest", style.text)}>
                            {style.label}
                          </h3>
                          <ul className="space-y-1.5">
                            {items.map((item, j) => (
                              <li key={j} className="flex items-start gap-2.5 text-sm text-oma-text-muted">
                                <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", style.dot)} />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
