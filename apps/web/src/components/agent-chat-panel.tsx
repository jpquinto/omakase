"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAgentChat } from "@/hooks/use-agent-chat";
import { cn } from "@/lib/utils";
import type { AgentMessage, AgentRunRole } from "@omakase/db";

// ---------------------------------------------------------------------------
// Agent Chat Panel — Slide-out sidebar for bidirectional agent messaging
//
// Follows the Omakase liquid glass design system: glass surfaces, oma-*
// color tokens, Instrument Serif headings, Outfit body text.
// ---------------------------------------------------------------------------

interface AgentInfo {
  name: string;
  mascot: string;
  role: AgentRunRole;
}

interface AgentChatPanelProps {
  runId: string;
  agent: AgentInfo;
  featureName: string;
  isActive: boolean;
  onClose: () => void;
}

/** Maps agent role to Omakase color classes */
function roleBadgeColor(role: AgentRunRole): string {
  const colors: Record<AgentRunRole, string> = {
    architect: "bg-oma-indigo/20 text-oma-indigo",
    coder: "bg-oma-progress/20 text-oma-progress",
    reviewer: "bg-oma-primary/20 text-oma-primary",
    tester: "bg-oma-jade/20 text-oma-jade",
  };
  return colors[role];
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function AgentChatPanel({ runId, agent, featureName, isActive, onClose }: AgentChatPanelProps) {
  const { messages, sendMessage, error, isConnected } = useAgentChat(runId);
  const [input, setInput] = useState("");
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(0);

  // Auto-scroll to bottom on new messages (unless user scrolled up)
  useEffect(() => {
    if (messages.length > prevMessageCount.current && !isScrolledUp) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCount.current = messages.length;
  }, [messages.length, isScrolledUp]);

  // Detect if user has scrolled up
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    setIsScrolledUp(!atBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setIsScrolledUp(false);
  }, []);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    await sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="glass-lg flex h-full w-[400px] flex-col rounded-l-oma-lg animate-oma-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-oma-glass-border px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            className="glass-sm flex h-10 w-10 items-center justify-center rounded-oma text-xl"
            role="img"
            aria-label={agent.name}
          >
            {agent.mascot}
          </span>
          <div>
            <h3 className="font-serif text-sm font-semibold text-oma-text">
              {agent.name}
            </h3>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                  roleBadgeColor(agent.role),
                )}
              >
                {agent.role}
              </span>
              {isConnected && (
                <span className="flex items-center gap-1 text-[10px] text-oma-done">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-oma-done" />
                  live
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="glass-sm flex h-8 w-8 items-center justify-center rounded-oma text-oma-text-muted transition-colors hover:text-oma-text"
          aria-label="Close chat"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 space-y-1 overflow-y-auto px-4 py-3"
      >
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="max-w-[240px] text-center text-xs text-oma-text-muted">
              Send a message to {agent.name} while they work on{" "}
              <span className="font-medium text-oma-text">{featureName}</span>
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} agent={agent} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* New messages indicator */}
      {isScrolledUp && messages.length > 0 && (
        <div className="flex justify-center px-4 pb-1">
          <button
            onClick={scrollToBottom}
            className="glass-primary rounded-oma-full px-3 py-1 text-[10px] font-medium text-oma-primary transition-all hover:scale-105"
          >
            New messages
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 rounded-oma border border-oma-error/30 bg-oma-error/10 px-3 py-2 text-[11px] text-oma-error">
          {error.message}
        </div>
      )}

      {/* Ended banner */}
      {!isActive && (
        <div className="mx-4 mb-2 rounded-oma border border-oma-glass-border bg-oma-bg-surface/50 px-3 py-2 text-center text-[11px] font-medium text-oma-text-muted">
          This conversation has ended
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-oma-glass-border px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isActive}
            placeholder={isActive ? `Message ${agent.name}...` : "Agent is no longer active"}
            rows={1}
            className={cn(
              "glass-sm flex-1 resize-none rounded-oma border border-oma-glass-border bg-transparent px-3 py-2 text-sm text-oma-text outline-none transition-colors",
              "placeholder:text-oma-text-faint",
              "focus:border-oma-primary focus:ring-1 focus:ring-oma-primary/30",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
          <button
            onClick={handleSend}
            disabled={!isActive || !input.trim()}
            className={cn(
              "glass-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-oma transition-all",
              "text-oma-primary hover:scale-105",
              "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100",
            )}
            aria-label="Send message"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual message rendering
// ---------------------------------------------------------------------------

function ChatMessage({ message, agent }: { message: AgentMessage; agent: AgentInfo }) {
  // Status messages — centered inline notice
  if (message.type === "status") {
    return (
      <div className="flex justify-center py-2">
        <span className="rounded-oma-full bg-oma-bg-surface/50 px-3 py-1 text-[10px] font-medium text-oma-text-subtle">
          {message.content}
        </span>
      </div>
    );
  }

  // Error messages — red accent
  if (message.type === "error") {
    return (
      <div className="my-1 rounded-oma border-l-2 border-oma-error bg-oma-error/5 px-3 py-2">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-oma-error">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M6 3.5V6.5M6 8V8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          Error
        </div>
        <p className="mt-1 text-xs text-oma-text-muted">{message.content}</p>
      </div>
    );
  }

  const isAgent = message.sender === "agent";

  // Agent messages — left-aligned with mascot
  if (isAgent) {
    return (
      <div className="group flex gap-2 py-1.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-oma-sm text-sm glass-sm">
          {agent.mascot}
        </span>
        <div className="min-w-0 max-w-[85%]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-oma-text">{agent.name}</span>
            <span className="text-[10px] text-oma-text-faint opacity-0 transition-opacity group-hover:opacity-100">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
          <div className="mt-0.5 rounded-oma rounded-tl-sm bg-oma-bg-surface/60 px-3 py-2 text-[13px] leading-relaxed text-oma-text">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  // User messages — right-aligned
  return (
    <div className="group flex justify-end gap-2 py-1.5">
      <div className="min-w-0 max-w-[85%]">
        <div className="flex items-center justify-end gap-2">
          <span className="text-[10px] text-oma-text-faint opacity-0 transition-opacity group-hover:opacity-100">
            {formatTimestamp(message.timestamp)}
          </span>
          <span className="text-[11px] font-semibold text-oma-text">You</span>
        </div>
        <div className="mt-0.5 rounded-oma rounded-tr-sm glass-primary px-3 py-2 text-[13px] leading-relaxed text-oma-text">
          {message.content}
        </div>
      </div>
    </div>
  );
}
