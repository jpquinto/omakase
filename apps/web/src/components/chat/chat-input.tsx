"use client";

import { cn } from "@/lib/utils";
import { ROLE_PALETTE } from "@/lib/chat-constants";
import type { AgentInfo } from "@/lib/chat-constants";

// ---------------------------------------------------------------------------
// ChatInput — textarea + send button + status banners
// ---------------------------------------------------------------------------

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  canSend: boolean;
  isWorkMode: boolean;
  agent: AgentInfo;
  hasActiveWorkSession: boolean;
  showWelcome: boolean;
  hasMessages: boolean;
  error: Error | null;
}

export function ChatInput({
  input,
  setInput,
  onSend,
  onKeyDown,
  canSend,
  isWorkMode,
  agent,
  hasActiveWorkSession,
  showWelcome,
  hasMessages,
  error,
}: ChatInputProps) {
  const palette = ROLE_PALETTE[agent.role];

  return (
    <>
      {error && (
        <div className="mx-6 mb-3 rounded-oma border border-oma-error/30 bg-oma-error/10 px-4 py-2.5 text-sm text-oma-error">
          {error.message}
        </div>
      )}

      {isWorkMode && !hasActiveWorkSession && hasMessages && (
        <div className={cn("mx-6 mb-3 rounded-oma border bg-oma-bg-surface/50 px-4 py-2.5 text-center text-sm font-medium text-oma-text-muted", palette.border)}>
          Work session ended. Start a new thread to begin another session.
        </div>
      )}

      {!canSend && !showWelcome && hasMessages && (
        <div className={cn("mx-6 mb-3 rounded-oma border bg-oma-bg-surface/50 px-4 py-2.5 text-center text-sm font-medium text-oma-text-muted", palette.border)}>
          No active agent run. Start a new run to continue this conversation.
        </div>
      )}

      {/* Input area — hidden during welcome state */}
      <div className={cn(
        "border-t px-6 py-4 transition-all duration-500",
        palette.border,
        showWelcome && "opacity-0 pointer-events-none",
      )}>
        <div className="flex items-end gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={!canSend}
            placeholder={
              isWorkMode
                ? hasActiveWorkSession
                  ? `Send a follow-up to ${agent.name}...`
                  : `Start a work session with ${agent.name}...`
                : canSend
                  ? `Message ${agent.name}...`
                  : "Agent is no longer active"
            }
            rows={1}
            className={cn(
              "glass-sm flex-1 resize-none rounded-oma-lg border bg-transparent px-4 py-3 text-base text-oma-text outline-none transition-colors",
              palette.border,
              "placeholder:text-oma-text-faint",
              "focus:border-oma-primary focus:ring-1 focus:ring-oma-primary/30",
              isWorkMode && "focus:border-oma-jade focus:ring-oma-jade/30",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
          <button
            onClick={onSend}
            disabled={!canSend || !input.trim()}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-oma-lg transition-all",
              isWorkMode
                ? "glass bg-oma-jade/10 text-oma-jade hover:scale-105"
                : "glass-primary text-oma-primary hover:scale-105",
              "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100",
            )}
            aria-label="Send message"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path
                d="M14.5 1.5L7 9M14.5 1.5L10 14.5L7 9M14.5 1.5L1.5 6L7 9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
