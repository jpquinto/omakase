"use client";

// ---------------------------------------------------------------------------
// Agent Profile Page
//
// Displays a detailed view of a single agent: hero section with personality
// info, performance stats, activity heatmap, and recent pipeline runs. Data
// is fetched via polling hooks that gracefully handle loading/error states.
// ---------------------------------------------------------------------------

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Loader2, MessageSquare, ExternalLink, GitPullRequest } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentProfileHero } from "@/components/agent-profile-hero";
import { AgentStatsGrid } from "@/components/agent-stats-grid";
import { ScrollReveal } from "@/components/scroll-reveal";
import { CalendarHeatmap } from "@/components/calendar-heatmap";
import {
  useAgentProfile,
  useAgentStats,
  useAgentActivity,
  useAgentRuns,
} from "@/hooks/use-api";
import { useAgentThreads } from "@/hooks/use-agent-threads";

// ---------------------------------------------------------------------------
// Agent visual metadata (mascot, colors) — not fetched from the API since
// these are hardcoded design tokens tied to the 4 fixed agents.
// ---------------------------------------------------------------------------

const AGENT_META: Record<
  string,
  {
    mascot: string;
    displayName: string;
    role: string;
    color: string;
    accentColor: string;
    heatmapColor: string;
    /** Token name (without "text-" prefix) passed to AgentStatsGrid */
    statsAccentColor: string;
  }
> = {
  miso: {
    mascot: "\u{1F35C}",
    displayName: "Miso",
    role: "Architect",
    color: "from-oma-gold/20 to-oma-gold/5",
    accentColor: "text-oma-gold",
    heatmapColor: "oma-gold",
    statsAccentColor: "oma-gold",
  },
  nori: {
    mascot: "\u{1F359}",
    displayName: "Nori",
    role: "Coder",
    color: "from-oma-indigo/20 to-oma-indigo/5",
    accentColor: "text-oma-indigo",
    heatmapColor: "oma-indigo",
    statsAccentColor: "oma-indigo",
  },
  koji: {
    mascot: "\u{1F376}",
    displayName: "Koji",
    role: "Reviewer",
    color: "from-oma-secondary/20 to-oma-secondary/5",
    accentColor: "text-oma-secondary",
    heatmapColor: "oma-primary",
    statsAccentColor: "oma-secondary",
  },
  toro: {
    mascot: "\u{1F363}",
    displayName: "Toro",
    role: "Tester",
    color: "from-oma-jade/20 to-oma-jade/5",
    accentColor: "text-oma-jade",
    heatmapColor: "oma-jade",
    statsAccentColor: "oma-jade",
  },
};

// ---------------------------------------------------------------------------
// Helper: relative time for run timestamps
// ---------------------------------------------------------------------------

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;

  if (Number.isNaN(diffMs) || diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "0s";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) {
    const rem = seconds % 60;
    return rem > 0 ? `${minutes}m ${rem}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

// ---------------------------------------------------------------------------
// Placeholder ticket data for the Resolved Tickets table
// ---------------------------------------------------------------------------

interface AgentTicket {
  id: string;
  title: string;
  project: string;
  priority: "urgent" | "high" | "medium" | "low";
  status: "merged" | "passing" | "in_review";
  linesChanged: number;
  duration: number; // ms
  resolvedAt: string;
}

const MOCK_TICKETS: Record<string, AgentTicket[]> = {
  miso: [
    { id: "OMA-142", title: "Design auth system architecture", project: "omakase-web", priority: "high", status: "merged", linesChanged: 0, duration: 185000, resolvedAt: "2026-02-13T14:22:00Z" },
    { id: "OMA-138", title: "Plan database migration strategy", project: "omakase-web", priority: "urgent", status: "merged", linesChanged: 0, duration: 240000, resolvedAt: "2026-02-12T09:15:00Z" },
    { id: "OMA-155", title: "Spec out notification service", project: "omakase-api", priority: "medium", status: "passing", linesChanged: 0, duration: 320000, resolvedAt: "2026-02-11T16:45:00Z" },
    { id: "OMA-129", title: "Review caching layer design", project: "omakase-web", priority: "high", status: "merged", linesChanged: 0, duration: 150000, resolvedAt: "2026-02-10T11:30:00Z" },
  ],
  nori: [
    { id: "OMA-143", title: "Implement JWT token refresh", project: "omakase-web", priority: "high", status: "merged", linesChanged: 247, duration: 480000, resolvedAt: "2026-02-13T16:05:00Z" },
    { id: "OMA-151", title: "Add WebSocket reconnection logic", project: "omakase-api", priority: "urgent", status: "in_review", linesChanged: 189, duration: 360000, resolvedAt: "2026-02-13T10:20:00Z" },
    { id: "OMA-139", title: "Build kanban drag-and-drop", project: "omakase-web", priority: "high", status: "merged", linesChanged: 412, duration: 720000, resolvedAt: "2026-02-12T14:55:00Z" },
    { id: "OMA-134", title: "Create DynamoDB repository layer", project: "omakase-api", priority: "medium", status: "merged", linesChanged: 356, duration: 540000, resolvedAt: "2026-02-11T09:10:00Z" },
    { id: "OMA-128", title: "Fix race condition in pipeline", project: "omakase-api", priority: "urgent", status: "merged", linesChanged: 83, duration: 195000, resolvedAt: "2026-02-10T17:40:00Z" },
  ],
  koji: [
    { id: "OMA-144", title: "Review auth implementation PR", project: "omakase-web", priority: "high", status: "merged", linesChanged: 0, duration: 290000, resolvedAt: "2026-02-13T17:30:00Z" },
    { id: "OMA-140", title: "Review kanban component PR", project: "omakase-web", priority: "medium", status: "merged", linesChanged: 12, duration: 380000, resolvedAt: "2026-02-12T16:00:00Z" },
    { id: "OMA-135", title: "Review DynamoDB layer PR", project: "omakase-api", priority: "high", status: "merged", linesChanged: 8, duration: 210000, resolvedAt: "2026-02-11T11:25:00Z" },
  ],
  toro: [
    { id: "OMA-145", title: "E2E tests for auth flow", project: "omakase-web", priority: "high", status: "passing", linesChanged: 320, duration: 600000, resolvedAt: "2026-02-13T18:15:00Z" },
    { id: "OMA-141", title: "Integration tests for kanban", project: "omakase-web", priority: "medium", status: "merged", linesChanged: 275, duration: 450000, resolvedAt: "2026-02-12T17:20:00Z" },
    { id: "OMA-136", title: "Unit tests for DynamoDB repos", project: "omakase-api", priority: "high", status: "merged", linesChanged: 510, duration: 380000, resolvedAt: "2026-02-11T13:50:00Z" },
    { id: "OMA-130", title: "Load test pipeline concurrency", project: "omakase-api", priority: "low", status: "merged", linesChanged: 145, duration: 720000, resolvedAt: "2026-02-10T15:00:00Z" },
  ],
};

const PRIORITY_STYLES: Record<AgentTicket["priority"], string> = {
  urgent: "bg-oma-error/15 text-oma-error",
  high: "bg-oma-warning/15 text-oma-warning",
  medium: "bg-oma-info/15 text-oma-info",
  low: "bg-oma-text/[0.08] text-oma-text-subtle",
};

const TICKET_STATUS_STYLES: Record<AgentTicket["status"], { className: string; label: string }> = {
  merged: { className: "text-oma-success", label: "Merged" },
  passing: { className: "text-oma-done", label: "Passing" },
  in_review: { className: "text-oma-info", label: "In Review" },
};

// ---------------------------------------------------------------------------
// Skeleton Components
// ---------------------------------------------------------------------------

function HeroSkeleton() {
  return (
    <div className="animate-pulse rounded-oma-lg border border-oma-glass-border/50 bg-oma-bg-elevated p-10">
      <div className="flex flex-col items-center gap-4">
        <div className="h-20 w-20 rounded-full bg-oma-bg-surface" />
        <div className="h-10 w-48 rounded-oma bg-oma-bg-surface" />
        <div className="h-6 w-24 rounded-oma-full bg-oma-bg-surface" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-6 w-20 rounded-oma-full bg-oma-bg-surface"
            />
          ))}
        </div>
        <div className="h-4 w-72 rounded bg-oma-bg-surface" />
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="animate-pulse glass rounded-oma-sm p-4"
        >
          <div className="mb-3 h-3 w-20 rounded bg-oma-bg-surface" />
          <div className="h-8 w-16 rounded bg-oma-bg-surface" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Run Status Badge
// ---------------------------------------------------------------------------

function RunStatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ComponentType<{ className?: string }>; className: string; label: string }> = {
    completed: {
      icon: CheckCircle2,
      className: "bg-oma-success/15 text-oma-success border-oma-success/20",
      label: "Completed",
    },
    failed: {
      icon: XCircle,
      className: "bg-oma-error/15 text-oma-error border-oma-error/20",
      label: "Failed",
    },
    running: {
      icon: Loader2,
      className: "bg-oma-info/15 text-oma-info border-oma-info/20",
      label: "Running",
    },
  };

  const { icon: Icon, className, label } = config[status] ?? {
    icon: Clock,
    className: "bg-oma-bg-surface text-oma-text-subtle border-oma-glass-border",
    label: status,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-oma-full border px-2.5 py-0.5 text-[11px] font-medium",
        className,
      )}
    >
      <Icon className={cn("size-3", status === "running" && "animate-spin")} />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AgentProfilePage() {
  const params = useParams<{ name: string }>();
  const name = params.name;
  const meta = AGENT_META[name];

  const { data: profile, isLoading: profileLoading } = useAgentProfile(name);
  const { data: stats, isLoading: statsLoading } = useAgentStats(name);
  const { data: activity, isLoading: activityLoading } = useAgentActivity(name);
  const { data: runs, isLoading: runsLoading } = useAgentRuns(name);
  // Threads across all projects
  const { threads } = useAgentThreads(name, null);

  // If the agent name is not recognized, show an error state
  if (!meta) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="mb-4 font-serif text-2xl text-oma-text">
          Agent not found
        </p>
        <Link
          href="/agents"
          className="text-sm text-oma-text-muted transition-colors hover:text-oma-text"
        >
          Back to all agents
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/agents"
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-oma-text-muted transition-colors hover:text-oma-text"
      >
        <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-1" />
        All Agents
      </Link>

      {/* 1. Hero Section */}
      {profileLoading ? (
        <HeroSkeleton />
      ) : (
        <AgentProfileHero
          agentName={name}
          displayName={profile?.displayName ?? meta.displayName}
          mascot={meta.mascot}
          role={meta.role}
          traits={profile?.traits ?? []}
          communicationStyle={profile?.communicationStyle ?? ""}
          color={meta.color}
          accentColor={meta.accentColor}
        />
      )}

      {/* Gradient separator */}
      <div className="h-px w-full bg-gradient-to-r from-oma-primary/40 via-oma-glass-border to-transparent" />

      {/* 2. Stats Grid */}
      <ScrollReveal variant="fade-up" delay={100}>
        {statsLoading ? (
          <StatsSkeleton />
        ) : stats ? (
          <AgentStatsGrid
            totalRuns={stats.totalRuns}
            successRate={stats.successRate}
            avgDurationMs={stats.avgDurationMs}
            lastRunAt={stats.lastRunAt}
            accentColor={meta.statsAccentColor}
          />
        ) : (
          <AgentStatsGrid
            totalRuns={0}
            successRate={0}
            avgDurationMs={0}
            lastRunAt={null}
            accentColor={meta.statsAccentColor}
          />
        )}
      </ScrollReveal>

      {/* 3. Activity Heatmap */}
      <ScrollReveal variant="fade-up" delay={200}>
        <section>
          <h2 className="mb-4 font-serif text-xl font-semibold text-oma-text">
            Activity
          </h2>
          <div className="glass rounded-oma p-5 transition-all duration-300 hover:shadow-oma hover:border-oma-glass-border-bright">
            {activityLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-oma-text-subtle" />
              </div>
            ) : (
              <CalendarHeatmap
                data={activity ?? []}
                colorClass={meta.heatmapColor}
                totalLabel="pipeline runs in the last year"
              />
            )}
          </div>
        </section>
      </ScrollReveal>

      {/* 4. Resolved Tickets */}
      <ScrollReveal variant="fade-up" delay={250}>
        <section>
          <h2 className="mb-4 font-serif text-xl font-semibold text-oma-text">
            Resolved Tickets
          </h2>

          {(() => {
            const tickets = MOCK_TICKETS[name] ?? [];
            if (tickets.length === 0) {
              return (
                <div className="glass rounded-oma p-8 text-center">
                  <p className="text-sm text-oma-text-muted">
                    No tickets resolved yet.
                  </p>
                </div>
              );
            }

            return (
              <div className="glass overflow-hidden rounded-oma">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_120px_80px_80px_90px_90px] gap-3 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-oma-text-subtle">
                  <span>Ticket</span>
                  <span>Project</span>
                  <span>Priority</span>
                  <span>Status</span>
                  <span className="text-right">Changes</span>
                  <span className="text-right">Resolved</span>
                </div>

                {/* Table rows */}
                <div className="divide-y divide-white/[0.04]">
                  {tickets.map((ticket, i) => {
                    const statusInfo = TICKET_STATUS_STYLES[ticket.status];
                    return (
                      <div
                        key={ticket.id}
                        className={cn(
                          "group/ticket grid grid-cols-[1fr_120px_80px_80px_90px_90px] items-center gap-3 px-5 py-3.5",
                          "transition-all duration-200 hover:bg-white/[0.02]",
                          "animate-oma-fade-up opacity-0",
                        )}
                        style={{ animationDelay: `${i * 60}ms`, animationFillMode: "forwards" }}
                      >
                        {/* Ticket ID + Title */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={cn("shrink-0 font-mono text-xs font-medium", meta.accentColor)}>
                            {ticket.id}
                          </span>
                          <span className="truncate text-sm text-oma-text">
                            {ticket.title}
                          </span>
                          <ExternalLink className="size-3 shrink-0 text-oma-text-faint opacity-0 transition-opacity group-hover/ticket:opacity-100" />
                        </div>

                        {/* Project */}
                        <span className="truncate text-xs text-oma-text-muted">
                          {ticket.project}
                        </span>

                        {/* Priority */}
                        <span className={cn(
                          "inline-flex w-fit items-center rounded-oma-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          PRIORITY_STYLES[ticket.priority],
                        )}>
                          {ticket.priority}
                        </span>

                        {/* Status */}
                        <span className={cn("flex items-center gap-1.5 text-xs font-medium", statusInfo.className)}>
                          {ticket.status === "merged" && <GitPullRequest className="size-3" />}
                          {ticket.status === "passing" && <CheckCircle2 className="size-3" />}
                          {ticket.status === "in_review" && <Clock className="size-3" />}
                          {statusInfo.label}
                        </span>

                        {/* Lines changed */}
                        <span className="text-right font-mono text-xs text-oma-text-muted">
                          {ticket.linesChanged > 0 ? `+${ticket.linesChanged}` : "\u2014"}
                        </span>

                        {/* Resolved time */}
                        <span className="text-right text-xs text-oma-text-faint">
                          {formatRelativeTime(ticket.resolvedAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </section>
      </ScrollReveal>

      {/* 5. Conversations */}
      {threads.length > 0 && (
        <ScrollReveal variant="fade-up" delay={350}>
          <section>
            <h2 className="mb-4 font-serif text-xl font-semibold text-oma-text">
              Conversations
            </h2>
            <div className="space-y-2">
              {threads.slice(0, 10).map((thread, i) => (
                <div
                  key={thread.threadId}
                  className={cn(
                    "group/thread glass rounded-oma p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-oma hover:border-oma-glass-border-bright",
                    "animate-oma-fade-up opacity-0",
                  )}
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: "forwards" }}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="size-4 text-oma-text-subtle" />
                    <span className="flex-1 truncate text-sm font-medium text-oma-text">
                      {thread.title}
                    </span>
                    <span className="text-xs text-oma-text-faint">
                      {thread.messageCount} {thread.messageCount === 1 ? "msg" : "msgs"}
                    </span>
                    <span className="text-xs text-oma-text-faint">
                      {formatRelativeTime(thread.lastMessageAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>
      )}

      {/* 6. Recent Runs */}
      <ScrollReveal variant="fade-up" delay={300}>
        <section>
          <h2 className="mb-4 font-serif text-xl font-semibold text-oma-text">
            Recent Runs
          </h2>

          {runsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="animate-pulse glass rounded-oma p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-20 rounded-oma-full bg-oma-bg-surface" />
                    <div className="h-4 w-32 rounded bg-oma-bg-surface" />
                    <div className="ml-auto h-4 w-16 rounded bg-oma-bg-surface" />
                  </div>
                </div>
              ))}
            </div>
          ) : runs && runs.length > 0 ? (
            <div className="space-y-3">
              {runs.map((run, i) => (
                <div
                  key={run.id}
                  className={cn(
                    "group/run glass rounded-oma p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-oma hover:border-oma-glass-border-bright",
                    "animate-oma-fade-up opacity-0",
                  )}
                  style={{
                    animationDelay: `${i * 80}ms`,
                    animationFillMode: "forwards",
                  }}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Status Badge */}
                    <RunStatusBadge status={run.status} />

                    {/* Role */}
                    <span className="text-xs font-medium uppercase tracking-wider text-oma-text-subtle">
                      {run.role}
                    </span>

                    {/* Output summary (truncated) */}
                    {run.outputSummary && (
                      <span className="hidden truncate text-sm text-oma-text-muted md:block md:max-w-xs lg:max-w-md">
                        {run.outputSummary}
                      </span>
                    )}

                    {/* Error message */}
                    {run.errorMessage && (
                      <span className="hidden truncate text-sm text-oma-error/80 md:block md:max-w-xs">
                        {run.errorMessage}
                      </span>
                    )}

                    {/* Right side: duration + time */}
                    <div className="ml-auto flex items-center gap-3 text-xs text-oma-text-faint">
                      {run.durationMs != null && (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {formatDuration(run.durationMs)}
                        </span>
                      )}
                      <span>{formatRelativeTime(run.startedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass rounded-oma p-8 text-center">
              <p className="text-sm text-oma-text-muted">
                No runs yet. This agent hasn&apos;t been dispatched.
              </p>
            </div>
          )}
        </section>
      </ScrollReveal>
    </div>
  );
}
