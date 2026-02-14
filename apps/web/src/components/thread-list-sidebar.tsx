"use client";

// Thread List Sidebar — collapsible sidebar for agent conversation threads.

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  MoreHorizontal,
  Pencil,
  Archive,
  ArrowLeft,
  MessageSquare,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AgentThread } from "@omakase/db";

interface ThreadListSidebarProps {
  threads: AgentThread[];
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onCreateThread: () => void;
  onRenameThread: (threadId: string, newTitle: string) => void;
  onArchiveThread: (threadId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** Agent accent border color class, e.g. "border-oma-gold/30" */
  accentBorder?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  /** When set, shows a back link at the top instead of the "Threads" heading */
  backHref?: string;
  /** Label for the back link (default: "Back to Dashboard") */
  backLabel?: string;
}

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  return `${Math.floor(months / 12)}y ago`;
}

export function ThreadListSidebar({
  threads,
  selectedThreadId,
  onSelectThread,
  onCreateThread,
  onRenameThread,
  onArchiveThread,
  collapsed,
  onToggleCollapse,
  accentBorder = "border-oma-glass-border/30",
  hasMore,
  onLoadMore,
  backHref,
  backLabel = "Back to Dashboard",
}: ThreadListSidebarProps) {
  const sorted = [...threads].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );

  if (collapsed) {
    return (
      <div className={cn("flex h-full w-12 flex-col items-center border-r bg-oma-bg-elevated py-3", accentBorder)}>
        <button
          onClick={onToggleCollapse}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-oma text-oma-text-muted",
            "transition-colors hover:bg-oma-bg-surface hover:text-oma-text",
          )}
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full w-[280px] flex-col border-r bg-oma-bg-elevated", accentBorder)}>
      {/* Header */}
      <div className={cn("flex flex-col border-b px-4 py-3 gap-2", accentBorder)}>
        {backHref && (
          <Link
            href={backHref}
            className="group flex items-center gap-1.5 text-xs font-medium text-oma-text-muted transition-colors hover:text-oma-text animate-oma-fade-up"
          >
            <ArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            {backLabel}
          </Link>
        )}
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-sm font-semibold text-oma-text">Threads</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onCreateThread}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-oma text-oma-text-muted",
                "transition-colors hover:bg-oma-primary/10 hover:text-oma-primary",
              )}
              aria-label="New conversation"
            >
              <Plus className="h-4 w-4" />
            </button>
            {!backHref && (
              <button
                onClick={onToggleCollapse}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-oma text-oma-text-muted",
                  "transition-colors hover:bg-oma-bg-surface hover:text-oma-text",
                )}
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto py-2">
        {sorted.length === 0 ? (
          <EmptyState onCreateThread={onCreateThread} />
        ) : (
          <div className="space-y-0.5 px-2">
            {sorted.map((thread) => (
              <ThreadRow
                key={thread.threadId}
                thread={thread}
                isSelected={thread.threadId === selectedThreadId}
                onSelect={() => onSelectThread(thread.threadId)}
                onRename={(newTitle) => onRenameThread(thread.threadId, newTitle)}
                onArchive={() => onArchiveThread(thread.threadId)}
              />
            ))}
            {hasMore && onLoadMore && (
              <button
                onClick={onLoadMore}
                className="mt-1 w-full rounded-oma px-3 py-2 text-center text-xs font-medium text-oma-text-muted transition-colors hover:bg-oma-bg-surface/60 hover:text-oma-text"
              >
                Load older threads
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onCreateThread }: { onCreateThread: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <div className="glass-sm mb-4 flex h-12 w-12 items-center justify-center rounded-oma-lg">
        <MessageSquare className="h-5 w-5 text-oma-text-subtle" />
      </div>
      <p className="mb-1 text-center text-sm font-medium text-oma-text-muted">
        No conversations yet
      </p>
      <p className="mb-4 text-center text-xs text-oma-text-subtle">
        Start a new thread to chat with this agent.
      </p>
      <button
        onClick={onCreateThread}
        className={cn(
          "glass-primary flex items-center gap-2 rounded-oma px-4 py-2",
          "text-xs font-medium text-oma-primary transition-all hover:scale-105",
        )}
      >
        <Plus className="h-3.5 w-3.5" />
        New conversation
      </button>
    </div>
  );
}

function ThreadRow({
  thread,
  isSelected,
  onSelect,
  onRename,
  onArchive,
}: {
  thread: AgentThread;
  isSelected: boolean;
  onSelect: () => void;
  onRename: (newTitle: string) => void;
  onArchive: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(thread.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const startRename = useCallback(() => {
    setEditValue(thread.title);
    setIsEditing(true);
  }, [thread.title]);

  const commitRename = useCallback(() => {
    setIsEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== thread.title) {
      onRename(trimmed);
    } else {
      setEditValue(thread.title);
    }
  }, [editValue, thread.title, onRename]);

  const cancelRename = useCallback(() => {
    setIsEditing(false);
    setEditValue(thread.title);
  }, [thread.title]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelRename();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!isEditing) onSelect();
      }}
      onKeyDown={(e) => {
        if (!isEditing && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group relative flex cursor-pointer flex-col gap-1 rounded-oma px-3 py-2.5 transition-colors",
        isSelected
          ? "glass-primary border border-oma-primary/20 bg-oma-primary/5"
          : "hover:bg-oma-bg-surface/60",
      )}
    >
      {/* Title row */}
      <div className="flex items-center gap-2">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "min-w-0 flex-1 bg-transparent text-sm font-medium text-oma-text",
              "border-b border-oma-primary/40 outline-none",
              "placeholder:text-oma-text-faint",
            )}
            placeholder="Thread title"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-oma-text">
            {thread.title}
          </span>
        )}

        {/* Context menu (visible on hover or when selected) */}
        {!isEditing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-oma-sm text-oma-text-subtle",
                  "opacity-0 transition-opacity group-hover:opacity-100",
                  isSelected && "opacity-100",
                )}
                aria-label="Thread actions"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="glass min-w-[140px] rounded-oma bg-oma-bg-elevated p-1 shadow-oma"
            >
              <DropdownMenuItem
                onClick={() => startRename()}
                className="flex cursor-pointer items-center gap-2 rounded-oma-sm px-3 py-2 text-sm text-oma-text hover:bg-oma-bg-surface/80"
              >
                <Pencil className="h-3.5 w-3.5 text-oma-text-subtle" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onArchive()}
                className="flex cursor-pointer items-center gap-2 rounded-oma-sm px-3 py-2 text-sm text-oma-secondary hover:bg-oma-secondary/10"
              >
                <Archive className="h-3.5 w-3.5" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Metadata row */}
      <div className="flex items-center gap-2 text-[11px] text-oma-text-subtle">
        <span>{formatRelativeTime(thread.lastMessageAt)}</span>
        <span className="text-oma-text-faint">·</span>
        <span>
          {thread.messageCount} {thread.messageCount === 1 ? "msg" : "msgs"}
        </span>
      </div>
    </div>
  );
}
