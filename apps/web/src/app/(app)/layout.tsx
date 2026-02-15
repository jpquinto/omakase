"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Folder,
  Bot,
  Palette,
  BarChart3,
  Settings,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  MessageSquareDashed,
  User,
  Menu,
  X,
} from "lucide-react";
import { useState, useCallback, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useProject } from "@/hooks/use-api";
import { ThemeToggle } from "@/components/theme-toggle";
import { AgentChatPanel } from "@/components/agent-chat-panel";
import { ThreadListSidebar } from "@/components/thread-list-sidebar";
import { useAgentThreads } from "@/hooks/use-agent-threads";
import { ROLE_PALETTE } from "@/lib/chat-constants";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { SpotifyNowPlaying } from "@/components/spotify-now-playing";
import { WeatherWidget } from "@/components/weather-widget";
import type { AgentRunRole } from "@omakase/db";

const NAV_ITEMS = [
  { href: "/projects", label: "Projects", icon: Folder },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/style-system", label: "Style System", icon: Palette },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/changelog", label: "Changelog", icon: ScrollText },
];

const AGENTS = [
  { id: "miso", name: "Miso", mascot: "\uD83C\uDF5C", role: "Architect", status: "running" as const, glow: "bg-oma-gold/40", pingColor: "bg-oma-gold/20" },
  { id: "nori", name: "Nori", mascot: "\uD83C\uDF59", role: "Coder", status: "running" as const, glow: "bg-oma-indigo/40", pingColor: "bg-oma-indigo/20" },
  { id: "koji", name: "Koji", mascot: "\uD83C\uDF76", role: "Reviewer", status: "idle" as const, glow: "bg-oma-secondary/40", pingColor: "bg-oma-secondary/20" },
  { id: "toro", name: "Toro", mascot: "\uD83C\uDF63", role: "Tester", status: "running" as const, glow: "bg-oma-jade/40", pingColor: "bg-oma-jade/20" },
];

/** Maps sidebar role labels to AgentRunRole type */
const ROLE_MAP: Record<string, AgentRunRole> = {
  Architect: "architect",
  Coder: "coder",
  Reviewer: "reviewer",
  Tester: "tester",
};

const AGENT_ROLE_MAP: Record<string, AgentRunRole> = {
  miso: "architect",
  nori: "coder",
  koji: "reviewer",
  toro: "tester",
};

const ROLE_MODAL_BORDER: Record<AgentRunRole, string> = {
  architect: "border-oma-gold/20",
  coder: "border-oma-indigo/20",
  reviewer: "border-oma-secondary/20",
  tester: "border-oma-jade/20",
};

interface ChatTarget {
  agentName: string;
  agentMascot: string;
  agentRole: AgentRunRole;
}

function AgentStatusCard({ agent, collapsed, index, onOpenChat }: {
  agent: typeof AGENTS[number];
  collapsed: boolean;
  index: number;
  onOpenChat: (target: ChatTarget) => void;
}) {
  const isRunning = agent.status === "running";

  return (
    <div
      className={cn(
        "group/agent relative overflow-hidden rounded-oma-sm transition-all duration-300",
        "hover:-translate-y-0.5",
        "active:translate-y-0",
        "animate-oma-fade-up opacity-0",
      )}
      style={{ animationDelay: `${index * 100 + 200}ms`, animationFillMode: "forwards" }}
    >
      {/* Blurred gradient background blob */}
      <div
        className={cn(
          "pointer-events-none absolute -inset-4 blur-2xl transition-opacity duration-300",
          "group-hover/agent:opacity-40",
          isRunning ? "opacity-20" : "opacity-10",
          agent.glow,
        )}
      />

      {/* Running shimmer effect */}
      {isRunning && (
        <div
          className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_2.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent"
          style={{ animationDelay: `${index * 400}ms` }}
        />
      )}

      {/* Clickable card → full-screen chat */}
      <Link
        href={`/agents/${agent.id}/chat`}
        className={cn(
          "relative flex items-center gap-2.5",
          collapsed ? "justify-center p-2" : "px-3 py-2"
        )}
      >
        {/* Mascot with pulse ring */}
        <div className="relative flex shrink-0 items-center justify-center">
          {isRunning && (
            <span
              className={cn("absolute inset-0 animate-ping rounded-full", agent.pingColor)}
              style={{ animationDuration: "2s", animationDelay: `${index * 300}ms` }}
            />
          )}
          <span className={cn(
            "relative text-base transition-transform duration-300 group-hover/agent:scale-125",
            isRunning && "animate-[bounce_3s_ease-in-out_infinite]",
          )}
            style={isRunning ? { animationDelay: `${index * 200}ms` } : undefined}
          >
            {agent.mascot}
          </span>
        </div>

        {/* Info (only when expanded) */}
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-semibold text-oma-text transition-colors duration-200 group-hover/agent:text-white">
                {agent.name}
              </span>
              {/* Status dot */}
              <span className={cn(
                "inline-block size-1.5 rounded-full",
                isRunning
                  ? "bg-oma-success shadow-[0_0_6px_rgba(110,231,183,0.5)] animate-pulse"
                  : "bg-oma-text-subtle"
              )} />
            </div>
            <span className="text-[10px] font-medium text-oma-text-subtle transition-colors duration-200 group-hover/agent:text-oma-text-muted">
              {agent.role}
            </span>
          </div>
        )}

        {/* Action buttons — always visible (expanded only) */}
        {!collapsed && (
          <div className="flex items-center gap-0.5">
            {/* Popup chat modal */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenChat({
                  agentName: agent.name,
                  agentMascot: agent.mascot,
                  agentRole: ROLE_MAP[agent.role],
                });
              }}
              className={cn(
                "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-oma-sm",
                "text-oma-text-subtle transition-all duration-200",
                "hover:bg-oma-primary/10 hover:text-oma-primary",
              )}
              aria-label={`Quick chat with ${agent.name}`}
              title="Popup chat"
            >
              <MessageSquareDashed className="size-3" />
            </button>
            {/* Agent profile */}
            <Link
              href={`/agents/${agent.id}`}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-oma-sm",
                "text-oma-text-subtle transition-all duration-200",
                "hover:bg-oma-primary/10 hover:text-oma-primary",
              )}
              aria-label={`${agent.name} profile`}
              title="Profile"
            >
              <User className="size-3" />
            </Link>
          </div>
        )}

        {/* Collapsed: status dot overlay */}
        {collapsed && (
          <span className={cn(
            "absolute -right-0.5 -top-0.5 size-2 rounded-full border border-oma-bg-elevated",
            isRunning
              ? "bg-oma-success shadow-[0_0_6px_rgba(110,231,183,0.5)] animate-pulse"
              : "bg-oma-text-subtle"
          )} />
        )}
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Breadcrumb — resolves pathname segments into labeled, linked breadcrumbs
// ---------------------------------------------------------------------------

interface BreadcrumbSegment {
  label: string;
  href: string;
}

function useBreadcrumbs(pathname: string): BreadcrumbSegment[] {
  return useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) return [{ label: "Dashboard", href: "/" }];

    const segments: BreadcrumbSegment[] = [];

    // First segment — match to NAV_ITEMS
    const navItem = NAV_ITEMS.find((item) => item.href === `/${parts[0]}`);
    segments.push({
      label: navItem?.label ?? parts[0].replace(/-/g, " "),
      href: `/${parts[0]}`,
    });

    // Remaining segments
    for (let i = 1; i < parts.length; i++) {
      const segment = parts[i];
      const href = "/" + parts.slice(0, i + 1).join("/");

      if (parts[0] === "agents") {
        // Resolve agent name from AGENTS constant
        const agent = AGENTS.find((a) => a.id === segment);
        if (agent) {
          segments.push({ label: agent.name, href });
          continue;
        }
      }

      // For project IDs, the ProjectBreadcrumbLabel component will handle display
      // For all other segments, prettify the slug
      segments.push({
        label: segment.replace(/-/g, " "),
        href,
      });
    }

    return segments;
  }, [pathname]);
}

/** Resolves a project ID to its name for breadcrumb display */
function ProjectBreadcrumbLabel({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId);
  return <>{project?.name ?? projectId}</>;
}

// ---------------------------------------------------------------------------
// Chat Sidebar — shown when on /agents/[name]/chat routes
// ---------------------------------------------------------------------------

function ChatSidebar({ agentName, collapsed }: { agentName: string; collapsed: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedThreadId = searchParams.get("thread");
  const agentRole = AGENT_ROLE_MAP[agentName];
  const palette = agentRole ? ROLE_PALETTE[agentRole] : undefined;

  const { threads, createThread, updateThread, hasMore, loadMore } = useAgentThreads(agentName, null);

  const handleSelectThread = useCallback((threadId: string) => {
    router.replace(`/agents/${agentName}/chat?thread=${threadId}`, { scroll: false });
  }, [agentName, router]);

  const handleCreateThread = useCallback(async () => {
    try {
      const thread = await createThread();
      router.replace(`/agents/${agentName}/chat?thread=${thread.threadId}`, { scroll: false });
    } catch {
      // Silently handle — the UI will show empty state
    }
  }, [createThread, agentName, router]);

  const handleRenameThread = useCallback(async (threadId: string, newTitle: string) => {
    await updateThread(threadId, { title: newTitle });
  }, [updateThread]);

  const handleArchiveThread = useCallback(async (threadId: string) => {
    await updateThread(threadId, { status: "archived" });
    if (selectedThreadId === threadId) {
      const remaining = threads.filter((t) => t.threadId !== threadId);
      if (remaining.length > 0) {
        router.replace(`/agents/${agentName}/chat?thread=${remaining[0].threadId}`, { scroll: false });
      } else {
        router.replace(`/agents/${agentName}/chat`, { scroll: false });
      }
    }
  }, [updateThread, selectedThreadId, threads, agentName, router]);

  if (collapsed) {
    return null; // Collapsed state handled by parent
  }

  return (
    <ThreadListSidebar
      threads={threads}
      selectedThreadId={selectedThreadId}
      onSelectThread={handleSelectThread}
      onCreateThread={handleCreateThread}
      onRenameThread={handleRenameThread}
      onArchiveThread={handleArchiveThread}
      collapsed={false}
      onToggleCollapse={() => {}}
      accentBorder={palette?.border}
      hasMore={hasMore}
      onLoadMore={loadMore}
      backHref={`/agents/${agentName}`}
      backLabel="Back to Profile"
    />
  );
}

// ---------------------------------------------------------------------------
// Main Layout
// ---------------------------------------------------------------------------

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [chatTarget, setChatTarget] = useState<ChatTarget | null>(null);

  const breadcrumbs = useBreadcrumbs(pathname);

  // Detect chat page route: /agents/[name]/chat
  const chatRouteMatch = useMemo(() => {
    const match = pathname.match(/^\/agents\/(\w+)\/chat/);
    return match ? match[1] : null;
  }, [pathname]);

  const isOnChatPage = !!chatRouteMatch;

  // Auto-close mobile drawer on navigation
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  const handleOpenChat = useCallback((target: ChatTarget) => {
    setMobileDrawerOpen(false);
    if (isOnChatPage) {
      const targetId = AGENTS.find((a) => a.name === target.agentName)?.id;
      if (targetId) {
        router.push(`/agents/${targetId}/chat`);
      }
    } else {
      setChatTarget(target);
    }
  }, [isOnChatPage, router]);

  // On mobile, sidebar is always expanded (never collapsed icon mode)
  const sidebarCollapsed = collapsed; // Only applies on desktop (md+)

  return (
    <div className="flex min-h-dvh bg-oma-bg font-sans md:min-h-screen">
      {/* ── Animated gradient blobs ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <svg className="absolute h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="blob-blur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="80" />
            </filter>
          </defs>
          <ellipse cx="20%" cy="25%" rx="22%" ry="18%" fill="rgba(244, 114, 182, 0.08)" filter="url(#blob-blur)" style={{ animation: "oma-blob-drift-1 25s ease-in-out infinite" }} />
          <ellipse cx="75%" cy="20%" rx="18%" ry="22%" fill="rgba(129, 140, 248, 0.07)" filter="url(#blob-blur)" style={{ animation: "oma-blob-drift-2 30s ease-in-out infinite" }} />
          <ellipse cx="55%" cy="55%" rx="20%" ry="16%" fill="rgba(251, 191, 36, 0.05)" filter="url(#blob-blur)" style={{ animation: "oma-blob-drift-3 28s ease-in-out infinite" }} />
          <ellipse cx="30%" cy="75%" rx="16%" ry="20%" fill="rgba(248, 113, 113, 0.06)" filter="url(#blob-blur)" style={{ animation: "oma-blob-drift-4 32s ease-in-out infinite" }} />
          <ellipse cx="80%" cy="70%" rx="14%" ry="18%" fill="rgba(110, 231, 183, 0.05)" filter="url(#blob-blur)" style={{ animation: "oma-blob-drift-1 35s ease-in-out infinite reverse" }} />
        </svg>
      </div>

      {/* ── Mobile backdrop overlay ── */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "glass-lg fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300",
          // Mobile: drawer behavior — off-screen by default, slide in when open
          mobileDrawerOpen ? "translate-x-0" : "-translate-x-full",
          "w-60 md:translate-x-0",
          // Desktop: respect collapsed state
          "md:z-40",
          sidebarCollapsed && "md:w-16"
        )}
      >
        {/* Logo + mobile close */}
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
              <div className="absolute inset-0 animate-oma-glow-pulse rounded-full bg-oma-primary/20" />
              <div className="relative h-5 w-5 rounded-full bg-gradient-to-br from-oma-primary to-oma-primary-dim" />
            </div>
            {!sidebarCollapsed && (
              <span className="animate-oma-blur-in font-serif text-xl font-semibold tracking-tight text-oma-text opacity-0">
                Omakase
              </span>
            )}
            {/* On mobile, always show title (sidebar always expanded on mobile) */}
            {sidebarCollapsed && (
              <span className="animate-oma-blur-in font-serif text-xl font-semibold tracking-tight text-oma-text opacity-0 md:hidden">
                Omakase
              </span>
            )}
          </Link>
          {/* Mobile close button */}
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="flex size-10 items-center justify-center rounded-oma-sm text-oma-text-subtle transition-colors hover:text-oma-text md:hidden"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* ── Sidebar content: cross-fade between normal and chat ── */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Normal sidebar content */}
          <div
            className={cn(
              "flex flex-1 flex-col transition-all duration-500",
              isOnChatPage && !sidebarCollapsed
                ? "pointer-events-none -translate-x-4 opacity-0"
                : "translate-x-0 opacity-100",
              // On mobile (drawer), chat sidebar also fades if on chat page
              isOnChatPage && "max-md:pointer-events-none max-md:-translate-x-4 max-md:opacity-0",
              !isOnChatPage && "max-md:translate-x-0 max-md:opacity-100",
            )}
          >
            {/* Navigation */}
            <nav className="px-2 py-4">
              <ul className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex items-center gap-3 rounded-oma-sm px-3 py-2.5 text-sm font-medium transition-all duration-200",
                          "min-h-[44px] md:min-h-0", // Touch-friendly on mobile
                          isActive
                            ? "glass-primary text-oma-primary"
                            : "text-oma-text-muted hover:bg-white/[0.04] hover:text-oma-text"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "size-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                            isActive && "text-oma-primary"
                          )}
                        />
                        {/* On mobile, always show labels (expanded). On desktop, respect collapsed */}
                        {!sidebarCollapsed && <span>{item.label}</span>}
                        {sidebarCollapsed && <span className="md:hidden">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Agent status cards */}
            <div className="px-2 py-3">
              {!sidebarCollapsed && (
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-oma-text-subtle">
                  Agents
                </p>
              )}
              {/* On mobile, always show "Agents" label */}
              {sidebarCollapsed && (
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-oma-text-subtle md:hidden">
                  Agents
                </p>
              )}
              <div className={cn("space-y-1.5", sidebarCollapsed && "md:space-y-2")}>
                {AGENTS.map((agent, i) => (
                  <AgentStatusCard
                    key={agent.id}
                    agent={agent}
                    collapsed={sidebarCollapsed}
                    index={i}
                    onOpenChat={handleOpenChat}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Chat sidebar content (overlaid) */}
          {isOnChatPage && (
            <div
              className={cn(
                "absolute inset-0 flex flex-col transition-all duration-500",
                !sidebarCollapsed ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-4 opacity-0",
                // On mobile, always show chat sidebar when on chat page
                "max-md:translate-x-0 max-md:opacity-100 max-md:pointer-events-auto",
              )}
            >
              <ChatSidebar agentName={chatRouteMatch!} collapsed={false} />
            </div>
          )}
        </div>

        {/* Collapse toggle + user (always visible) */}
        <div className="space-y-2 p-3">
          {/* User row with theme toggle */}
          <div className={cn(
            "flex items-center",
            sidebarCollapsed ? "flex-col gap-2 max-md:flex-row max-md:gap-3" : "gap-3"
          )}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-oma-primary to-oma-secondary text-xs font-bold text-white">
              U
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-oma-text">User</p>
                <p className="truncate text-xs text-oma-text-subtle">Developer</p>
              </div>
            )}
            {/* On mobile, always show user info */}
            {sidebarCollapsed && (
              <div className="hidden min-w-0 flex-1 max-md:block">
                <p className="truncate text-sm font-medium text-oma-text">User</p>
                <p className="truncate text-xs text-oma-text-subtle">Developer</p>
              </div>
            )}
            <ThemeToggle />
          </div>

          {/* Collapse button — hidden on mobile (sidebar is always expanded on mobile) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="glass-sm hidden w-full items-center justify-center rounded-oma-sm py-1.5 text-oma-text-subtle transition-all duration-200 hover:bg-white/[0.06] hover:text-oma-text md:flex"
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div
        className={cn(
          "flex flex-1 flex-col overflow-x-hidden transition-all duration-300",
          // Mobile: no sidebar offset (sidebar is overlay drawer)
          "pl-0",
          // Desktop: offset by sidebar width
          sidebarCollapsed ? "md:pl-16" : "md:pl-60"
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between px-4 backdrop-blur-xl md:px-6">
          {/* Left: hamburger (mobile) + breadcrumbs */}
          <div className="flex items-center gap-3">
            {/* Hamburger menu — mobile only */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="flex size-10 items-center justify-center rounded-oma-sm text-oma-text-muted transition-colors hover:text-oma-text md:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>

            {/* Mobile: show only last breadcrumb as page title */}
            <span className="text-sm font-medium capitalize text-oma-text md:hidden">
              {breadcrumbs.length > 0 && (() => {
                const last = breadcrumbs[breadcrumbs.length - 1];
                const isProjectId = breadcrumbs.length > 1 && pathname.startsWith("/projects/");
                if (isProjectId && breadcrumbs.length === 2) {
                  return <ProjectBreadcrumbLabel projectId={last.label} />;
                }
                return last.label;
              })()}
            </span>

            {/* Desktop: full breadcrumbs */}
            <nav className="hidden items-center gap-2 md:flex" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, i) => {
                const isLast = i === breadcrumbs.length - 1;
                const isProjectId = i === 1 && pathname.startsWith("/projects/");
                return (
                  <span key={crumb.href} className="flex items-center gap-2">
                    {i > 0 && (
                      <span className="text-[10px] text-oma-text-subtle/50">/</span>
                    )}
                    {isLast ? (
                      <span className="text-xs font-medium uppercase tracking-widest text-oma-text-muted">
                        {isProjectId ? (
                          <ProjectBreadcrumbLabel projectId={crumb.label} />
                        ) : (
                          crumb.label
                        )}
                      </span>
                    ) : (
                      <Link
                        href={crumb.href}
                        className="text-xs font-medium uppercase tracking-widest text-oma-text-subtle transition-colors duration-200 hover:text-oma-text"
                      >
                        {isProjectId ? (
                          <ProjectBreadcrumbLabel projectId={crumb.label} />
                        ) : (
                          crumb.label
                        )}
                      </Link>
                    )}
                  </span>
                );
              })}
            </nav>
          </div>

          {/* Right: widgets — hidden on mobile */}
          <div className="hidden items-center gap-3 md:flex">
            <WeatherWidget />
            <SpotifyNowPlaying />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>

      {/* Agent chat modal */}
      <Dialog open={!!chatTarget} onOpenChange={(open) => { if (!open) setChatTarget(null); }}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "glass-lg flex flex-col overflow-hidden border bg-oma-bg-elevated p-0 shadow-oma-lg",
            // Mobile: full-screen
            "h-[100dvh] w-screen max-w-none rounded-none",
            // Desktop: centered dialog
            "md:h-[92vh] md:w-[85vw] md:max-w-[1100px] md:rounded-oma-lg",
            chatTarget ? ROLE_MODAL_BORDER[chatTarget.agentRole] : "border-oma-glass-border",
          )}
        >
          <DialogTitle className="sr-only">
            {chatTarget ? `Chat with ${chatTarget.agentName}` : "Agent Chat"}
          </DialogTitle>
          {chatTarget && (
            <AgentChatPanel
              runId={`chat-${chatTarget.agentRole}`}
              agent={{ name: chatTarget.agentName, mascot: chatTarget.agentMascot, role: chatTarget.agentRole }}
              featureName="General"
              projectId={null}
              isActive={false}
              onClose={() => setChatTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
