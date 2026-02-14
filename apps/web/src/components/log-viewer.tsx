"use client";

import { useState, useRef, useEffect } from "react";

// ---------------------------------------------------------------------------
// Log Viewer Component
//
// Terminal-style log viewer with a dark background, monospace font, agent
// filtering, and auto-scroll behavior. Designed to mirror the logging
// experience from the existing Omakase UI.
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

/** Maps log level to text color for terminal display */
function levelColor(level: LogEntry["level"]): string {
  const colors: Record<LogEntry["level"], string> = {
    info: "text-gray-300",
    warn: "text-yellow-400",
    error: "text-red-400",
    success: "text-green-400",
  };
  return colors[level];
}

/** Maps agent index to a color for the agent tag */
function agentColor(index: number): string {
  const colors: Record<number, string> = {
    1: "text-cyan-400",
    2: "text-purple-400",
    3: "text-orange-400",
    4: "text-emerald-400",
  };
  return colors[index] ?? "text-gray-400";
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
    <div className="neo-card flex flex-col overflow-hidden rounded-none">
      {/* Filter bar */}
      <div className="flex items-center gap-2 border-b-2 border-neo-border bg-neo-muted px-4 py-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-neo-muted-foreground">
          Filter:
        </span>
        {AGENT_FILTERS.map((filter) => (
          <button
            key={filter.index}
            onClick={() => setActiveFilter(filter.index)}
            className={`neo-border rounded-none px-2.5 py-1 text-xs font-bold transition-colors ${
              activeFilter === filter.index
                ? "bg-neo-foreground text-white"
                : "bg-white text-neo-foreground hover:bg-neo-muted"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Terminal log area */}
      <div
        ref={scrollRef}
        className="h-96 overflow-y-auto bg-[#0a0a0a] px-4 py-3 font-mono text-[13px] leading-relaxed"
      >
        {filteredLogs.map((log) => (
          <div key={log.id} className="flex gap-2 py-0.5">
            {/* Timestamp */}
            <span className="shrink-0 text-gray-600">{log.timestamp}</span>

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
            <span className="text-gray-600">No log entries for this filter.</span>
          </div>
        )}
      </div>
    </div>
  );
}
