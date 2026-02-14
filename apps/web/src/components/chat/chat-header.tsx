"use client";

import { cn } from "@/lib/utils";
import { ROLE_PALETTE } from "@/lib/chat-constants";
import type { AgentInfo } from "@/lib/chat-constants";
import { Square, Gamepad2, Maximize2 } from "lucide-react";
import type { AgentThread } from "@omakase/db";

// ---------------------------------------------------------------------------
// ChatHeader — agent header bar for modal and fullscreen variants
// ---------------------------------------------------------------------------

interface ChatHeaderProps {
  agent: AgentInfo;
  isWorkMode: boolean;
  isConnected: boolean;
  hasMessages: boolean;
  selectedThread: AgentThread | undefined;
  editingTitle: boolean;
  titleValue: string;
  titleInputRef: React.RefObject<HTMLInputElement | null>;
  onTitleChange: (value: string) => void;
  onStartEditTitle: () => void;
  onCommitTitleRename: () => void;
  onCancelTitleRename: () => void;
  hasActiveWorkSession: boolean;
  endWorkSession: () => void;
  gameMenuOpen: boolean;
  onToggleGameMenu: () => void;
  onLaunchQuiz: () => void;
  /** "modal" shows close (X) button; "fullscreen" shows expand link */
  variant?: "modal" | "fullscreen";
  onClose?: () => void;
  /** URL for the full-screen chat page (shown in modal variant) */
  fullscreenHref?: string;
  onNavigateFullscreen?: () => void;
}

export function ChatHeader({
  agent,
  isWorkMode,
  isConnected,
  hasMessages,
  selectedThread,
  editingTitle,
  titleValue,
  titleInputRef,
  onTitleChange,
  onStartEditTitle,
  onCommitTitleRename,
  onCancelTitleRename,
  hasActiveWorkSession,
  endWorkSession,
  gameMenuOpen,
  onToggleGameMenu,
  onLaunchQuiz,
  variant = "modal",
  onClose,
  fullscreenHref,
  onNavigateFullscreen,
}: ChatHeaderProps) {
  const palette = ROLE_PALETTE[agent.role];

  return (
    <div className={cn(
      "relative flex items-center justify-between border-b px-6 py-4",
      palette.border,
    )}>
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-r", palette.headerGradient)} />

      <div className="relative flex items-center gap-4">
        <span
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-oma-lg text-2xl transition-shadow duration-300",
            palette.glow,
          )}
          role="img"
          aria-label={agent.name}
        >
          {agent.mascot}
        </span>
        <div>
          <h3 className="font-serif text-lg font-semibold text-oma-text">
            {agent.name}
          </h3>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                palette.badge,
              )}
            >
              {agent.role}
            </span>
            {hasMessages && (
              <span
                className={cn(
                  "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                  isWorkMode
                    ? "bg-oma-jade/20 text-oma-jade"
                    : "bg-oma-bg-surface text-oma-text-subtle",
                )}
              >
                {isWorkMode ? "Work" : "Chat"}
              </span>
            )}
            {isConnected && (
              <span className="flex items-center gap-1 text-xs text-oma-done">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-oma-done" />
                live
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Game menu + Thread title (editable) + end session + close */}
      <div className="relative flex items-center gap-3">
        {/* Game menu — chat mode only */}
        {!isWorkMode && (
          <div className="relative">
            <button
              onClick={onToggleGameMenu}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-oma text-oma-text-muted transition-all hover:text-oma-text",
                gameMenuOpen && "bg-oma-bg-surface text-oma-text",
              )}
              aria-label="Games"
              title="Games"
            >
              <Gamepad2 className="h-4.5 w-4.5" />
            </button>
            {gameMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={onToggleGameMenu} />
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-oma-lg border border-oma-glass-border bg-oma-bg-elevated p-2 shadow-oma-lg animate-oma-scale-in">
                  <button
                    onClick={onLaunchQuiz}
                    className="flex w-full items-center gap-3 rounded-oma px-3 py-2.5 text-left text-sm transition-colors hover:bg-oma-bg-surface"
                  >
                    <span className="text-lg">🧠</span>
                    <div>
                      <p className="font-medium text-oma-text">Quiz Game</p>
                      <p className="text-xs text-oma-text-muted">5 questions on any topic</p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {hasActiveWorkSession && (
          <button
            onClick={endWorkSession}
            className="flex items-center gap-1.5 rounded-oma px-3 py-1.5 text-xs font-medium text-oma-error transition-all hover:bg-oma-error/10"
          >
            <Square className="h-3 w-3" />
            End Session
          </button>
        )}
        {selectedThread && (
          <div className="text-right">
            {editingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={titleValue}
                onChange={(e) => onTitleChange(e.target.value)}
                onBlur={onCommitTitleRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); onCommitTitleRename(); }
                  if (e.key === "Escape") { onCancelTitleRename(); }
                }}
                className="w-40 bg-transparent text-right text-sm text-oma-text border-b border-oma-primary/40 outline-none"
              />
            ) : (
              <button
                onClick={onStartEditTitle}
                className="text-sm text-oma-text-muted transition-colors hover:text-oma-text"
                title="Click to rename"
              >
                {selectedThread.title}
              </button>
            )}
          </div>
        )}

        {/* Full-screen link (modal only) */}
        {variant === "modal" && fullscreenHref && onNavigateFullscreen && (
          <button
            onClick={onNavigateFullscreen}
            className="glass-sm flex h-9 w-9 items-center justify-center rounded-oma text-oma-text-muted transition-colors hover:text-oma-text"
            aria-label="Open full screen"
            title="Open full screen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}

        {/* Close button (modal only) */}
        {variant === "modal" && onClose && (
          <button
            onClick={onClose}
            className="glass-sm flex h-9 w-9 items-center justify-center rounded-oma text-oma-text-muted transition-colors hover:text-oma-text"
            aria-label="Close chat"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M1 1L15 15M15 1L1 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
