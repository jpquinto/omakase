"use client";

import { useState, useRef, useEffect } from "react";

// ---------------------------------------------------------------------------
// Log Viewer Component
//
// Terminal-style log viewer with a dark background, monospace font, agent
// filtering, and auto-scroll behavior. Uses the Omakase liquid glass design
// system with frosted glass filter bar and deep terminal area.
// ---------------------------------------------------------------------------

interface LogEntry {
  id: string;
  timestamp: string;
  agentIndex: number;
  agentName: string;
  message: string;
  level: "info" | "warn" | "error" | "success";
}

const MOCK_LOGS: LogEntry[] = [
  { id: "l1", timestamp: "14:23:01", agentIndex: 1, agentName: "Spark", message: "Starting feature analysis for Database Schema", level: "info" },
  { id: "l2", timestamp: "14:23:03", agentIndex: 1, agentName: "Spark", message: "Reading app specification...", level: "info" },
  { id: "l3", timestamp: "14:23:08", agentIndex: 2, agentName: "Fizz", message: "Claimed feature: Shopping Cart", level: "success" },
  { id: "l4", timestamp: "14:23:12", agentIndex: 1, agentName: "Spark", message: "Creating SQLAlchemy models for 5 tables", level: "info" },
  { id: "l5", timestamp: "14:23:15", agentIndex: 4, agentName: "Hoot", message: "Running test suite for User Authentication", level: "info" },
  { id: "l6", timestamp: "14:23:18", agentIndex: 2, agentName: "Fizz", message: "Installing dependencies: zustand, @tanstack/react-query", level: "info" },
  { id: "l7", timestamp: "14:23:22", agentIndex: 4, agentName: "Hoot", message: "WARNING: 2 tests flaky, retrying...", level: "warn" },
  { id: "l8", timestamp: "14:23:25", agentIndex: 1, agentName: "Spark", message: "Database Schema marked as passing", level: "success" },
  { id: "l9", timestamp: "14:23:28", agentIndex: 2, agentName: "Fizz", message: "Error: Cannot find module './CartContext'", level: "error" },
  { id: "l10", timestamp: "14:23:30", agentIndex: 2, agentName: "Fizz", message: "Creating CartContext provider...", level: "info" },
  { id: "l11", timestamp: "14:23:35", agentIndex: 4, agentName: "Hoot", message: "All 12 tests passing for User Authentication", level: "success" },
  { id: "l12", timestamp: "14:23:38", agentIndex: 3, agentName: "Octo", message: "Reviewing code changes for Database Schema", level: "info" },
  { id: "l13", timestamp: "14:23:42", agentIndex: 2, agentName: "Fizz", message: "Shopping Cart component compiled successfully", level: "info" },
  { id: "l14", timestamp: "14:23:45", agentIndex: 3, agentName: "Octo", message: "Code review complete: 0 issues found", level: "success" },
  { id: "l15", timestamp: "14:23:48", agentIndex: 2, agentName: "Fizz", message: "Running lint check...", level: "info" },
];

/** Agent filter options derived from mock data */
const AGENT_FILTERS = [
  { index: 0, label: "All" },
  { index: 1, label: "Spark" },
  { index: 2, label: "Fizz" },
  { index: 3, label: "Octo" },
  { index: 4, label: "Hoot" },
];

/** Maps log level to an Omakase text color for terminal display */
function levelColor(level: LogEntry["level"]): string {
  const colors: Record<LogEntry["level"], string> = {
    info: "text-oma-text-muted",
    warn: "text-oma-warning",
    error: "text-oma-error",
    success: "text-oma-done",
  };
  return colors[level];
}

/** Maps agent index to an Omakase accent color for the agent tag */
function agentColor(index: number): string {
  const colors: Record<number, string> = {
    1: "text-oma-info",
    2: "text-oma-indigo",
    3: "text-oma-gold",
    4: "text-oma-jade",
  };
  return colors[index] ?? "text-oma-text-subtle";
}

export function LogViewer() {
  const [activeFilter, setActiveFilter] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredLogs =
    activeFilter === 0
      ? MOCK_LOGS
      : MOCK_LOGS.filter((log) => log.agentIndex === activeFilter);

  // Auto-scroll to bottom when filter changes or new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs.length, activeFilter]);

  return (
    <div className="glass flex flex-col overflow-hidden rounded-oma-lg">
      {/* Filter bar */}
      <div className="flex items-center gap-2 border-b border-oma-glass-border bg-oma-bg-surface/50 px-4 py-2.5">
        <span className="text-xs font-medium uppercase tracking-wider text-oma-text-subtle">
          Filter:
        </span>
        {AGENT_FILTERS.map((filter) => (
          <button
            key={filter.index}
            onClick={() => setActiveFilter(filter.index)}
            className={`px-2.5 py-1 text-xs font-medium transition-colors ${
              activeFilter === filter.index
                ? "glass-primary rounded-oma-sm text-oma-primary"
                : "glass-sm rounded-oma-sm text-oma-text-muted hover:text-oma-text"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Terminal log area */}
      <div
        ref={scrollRef}
        className="h-96 overflow-y-auto rounded-b-oma-lg bg-oma-bg-deep px-4 py-3 font-mono text-[13px] leading-relaxed"
      >
        {filteredLogs.map((log) => (
          <div key={log.id} className="flex gap-2 py-0.5">
            {/* Timestamp */}
            <span className="shrink-0 text-oma-text-faint">{log.timestamp}</span>

            {/* Agent tag */}
            <span className={`shrink-0 font-bold ${agentColor(log.agentIndex)}`}>
              [{log.agentName}]
            </span>

            {/* Message */}
            <span className={levelColor(log.level)}>{log.message}</span>
          </div>
        ))}

        {filteredLogs.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <span className="text-oma-text-faint">No log entries for this filter.</span>
          </div>
        )}
      </div>
    </div>
  );
}
