"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Folder,
  Bot,
  Palette,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  MessageSquareDashed,
  User,
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
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
  const [chatTarget, setChatTarget] = useState<ChatTarget | null>(null);

  // Detect chat page route: /agents/[name]/chat
  const chatRouteMatch = useMemo(() => {
    const match = pathname.match(/^\/agents\/(\w+)\/chat/);
    return match ? match[1] : null;
  }, [pathname]);

  const isOnChatPage = !!chatRouteMatch;

  const handleOpenChat = useCallback((target: ChatTarget) => {
    if (isOnChatPage) {
      // Navigate to different agent's chat page
      const targetId = AGENTS.find((a) => a.name === target.agentName)?.id;
      if (targetId) {
        router.push(`/agents/${targetId}/chat`);
      }
    } else {
      setChatTarget(target);
    }
  }, [isOnChatPage, router]);

  return (
    <div className="flex min-h-screen bg-oma-bg font-sans">
      {/* ── Animated gradient blobs ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <svg className="absolute h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="blob-blur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="80" />
            </filter>
          </defs>
          {/* Sakura pink blob — top-left drift */}
          <ellipse
            cx="20%"
            cy="25%"
            rx="22%"
            ry="18%"
            fill="rgba(244, 114, 182, 0.08)"
            filter="url(#blob-blur)"
            style={{ animation: "oma-blob-drift-1 25s ease-in-out infinite" }}
          />
          {/* Indigo blob — top-right drift */}
          <ellipse
            cx="75%"
            cy="20%"
            rx="18%"
            ry="22%"
            fill="rgba(129, 140, 248, 0.07)"
            filter="url(#blob-blur)"
            style={{ animation: "oma-blob-drift-2 30s ease-in-out infinite" }}
          />
          {/* Gold blob — center drift */}
          <ellipse
            cx="55%"
            cy="55%"
            rx="20%"
            ry="16%"
            fill="rgba(251, 191, 36, 0.05)"
            filter="url(#blob-blur)"
            style={{ animation: "oma-blob-drift-3 28s ease-in-out infinite" }}
          />
          {/* Beni red blob — bottom-left drift */}
          <ellipse
            cx="30%"
            cy="75%"
            rx="16%"
            ry="20%"
            fill="rgba(248, 113, 113, 0.06)"
            filter="url(#blob-blur)"
            style={{ animation: "oma-blob-drift-4 32s ease-in-out infinite" }}
          />
          {/* Jade blob — bottom-right drift */}
          <ellipse
            cx="80%"
            cy="70%"
            rx="14%"
            ry="18%"
            fill="rgba(110, 231, 183, 0.05)"
            filter="url(#blob-blur)"
            style={{ animation: "oma-blob-drift-1 35s ease-in-out infinite reverse" }}
          />
        </svg>
      </div>

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "glass-lg fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center px-4">
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            {/* Sakura dot logo */}
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
              <div className="absolute inset-0 animate-oma-glow-pulse rounded-full bg-oma-primary/20" />
              <div className="relative h-5 w-5 rounded-full bg-gradient-to-br from-oma-primary to-oma-primary-dim" />
            </div>
            {!collapsed && (
              <span className="animate-oma-blur-in font-serif text-xl font-semibold tracking-tight text-oma-text opacity-0">
                Omakase
              </span>
            )}
          </Link>
        </div>

        {/* ── Sidebar content: cross-fade between normal and chat ── */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Normal sidebar content */}
          <div
            className={cn(
              "flex flex-1 flex-col transition-all duration-500",
              isOnChatPage && !collapsed
                ? "pointer-events-none -translate-x-4 opacity-0"
                : "translate-x-0 opacity-100",
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
                        {!collapsed && <span>{item.label}</span>}
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
              {!collapsed && (
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-oma-text-subtle">
                  Agents
                </p>
              )}
              <div className={cn("space-y-1.5", collapsed && "space-y-2")}>
                {AGENTS.map((agent, i) => (
                  <AgentStatusCard
                    key={agent.id}
                    agent={agent}
                    collapsed={collapsed}
                    index={i}
                    onOpenChat={handleOpenChat}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Chat sidebar content (overlaid) */}
          {isOnChatPage && !collapsed && (
            <div
              className={cn(
                "absolute inset-0 flex flex-col transition-all duration-500",
                "translate-x-0 opacity-100",
              )}
            >
              <ChatSidebar agentName={chatRouteMatch} collapsed={collapsed} />
            </div>
          )}
        </div>

        {/* Collapse toggle + user (always visible) */}
        <div className="space-y-2 p-3">
          {/* User row with theme toggle */}
          <div className={cn(
            "flex items-center",
            collapsed ? "flex-col gap-2" : "gap-3"
          )}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-oma-primary to-oma-secondary text-xs font-bold text-white">
              U
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-oma-text">
                  User
                </p>
                <p className="truncate text-xs text-oma-text-subtle">
                  Developer
                </p>
              </div>
            )}
            <ThemeToggle />
          </div>

          {/* Collapse button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="glass-sm flex w-full items-center justify-center rounded-oma-sm py-1.5 text-oma-text-subtle transition-all duration-200 hover:bg-white/[0.06] hover:text-oma-text"
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
          "flex flex-1 flex-col transition-all duration-300",
          collapsed ? "pl-16" : "pl-60"
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between px-6 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            {/* Breadcrumb-like current section */}
            <span className="text-xs font-medium uppercase tracking-widest text-oma-text-subtle">
              {NAV_ITEMS.find(
                (item) =>
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/")
              )?.label ?? "Dashboard"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <WeatherWidget />
            <SpotifyNowPlaying />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8">{children}</main>
      </div>

      {/* Agent chat modal */}
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
