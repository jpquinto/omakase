"use client";

import { Activity, Server, Clock, RefreshCw } from "lucide-react";
import { useOrchestratorHealth } from "@/hooks/use-api";

const ORCHESTRATOR_URL =
  process.env.NEXT_PUBLIC_ORCHESTRATOR_URL ?? "http://localhost:8080";

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(" ");
}

export default function SettingsPage() {
  const { data: health, isLoading, error, refetch } = useOrchestratorHealth();

  const isConnected = !!health && !error;

  return (
    <div className="mx-auto max-w-3xl animate-oma-fade-up">
      {/* Page heading */}
      <div className="mb-10">
        <h1 className="mb-2 font-serif text-2xl font-bold tracking-tight text-oma-text md:text-3xl">
          Settings
        </h1>
        <p className="text-sm text-oma-text-muted">
          System configuration and connection status
        </p>
      </div>

      {/* Orchestrator Status Card */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-oma-text-subtle">
          Orchestrator
        </h2>
        <div className="glass rounded-oma-lg border border-oma-glass-border p-5">
          {/* Status header row */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server className="size-4 text-oma-text-muted" />
              <span className="text-sm font-medium text-oma-text">
                Connection Status
              </span>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-oma p-1.5 text-oma-text-subtle transition-colors hover:bg-oma-bg-surface hover:text-oma-text"
              title="Refresh"
            >
              <RefreshCw className="size-3.5" />
            </button>
          </div>

          {/* Status indicator */}
          <div className="mb-5 flex items-center gap-2.5">
            {isLoading ? (
              <>
                <span className="inline-block size-2.5 animate-pulse rounded-full bg-oma-text-subtle" />
                <span className="text-sm text-oma-text-muted">
                  Checking...
                </span>
              </>
            ) : isConnected ? (
              <>
                <span className="inline-block size-2.5 animate-pulse rounded-full bg-oma-done" />
                <span className="text-sm font-medium text-oma-done">
                  Connected
                </span>
              </>
            ) : (
              <>
                <span className="inline-block size-2.5 rounded-full bg-oma-fail" />
                <span className="text-sm font-medium text-oma-fail">
                  Unreachable
                </span>
              </>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Endpoint */}
            <div className="rounded-oma bg-oma-bg-surface/50 px-3.5 py-3">
              <div className="mb-1 flex items-center gap-1.5 text-oma-text-subtle">
                <Activity className="size-3" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Endpoint
                </span>
              </div>
              <p className="truncate font-mono text-xs text-oma-text-muted">
                {ORCHESTRATOR_URL}
              </p>
            </div>

            {/* Uptime */}
            <div className="rounded-oma bg-oma-bg-surface/50 px-3.5 py-3">
              <div className="mb-1 flex items-center gap-1.5 text-oma-text-subtle">
                <Clock className="size-3" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Uptime
                </span>
              </div>
              <p className="font-mono text-xs text-oma-text-muted">
                {isConnected ? formatUptime(health.uptime) : "—"}
              </p>
            </div>

            {/* Last checked */}
            <div className="rounded-oma bg-oma-bg-surface/50 px-3.5 py-3">
              <div className="mb-1 flex items-center gap-1.5 text-oma-text-subtle">
                <RefreshCw className="size-3" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Last checked
                </span>
              </div>
              <p className="font-mono text-xs text-oma-text-muted">
                {isConnected
                  ? new Date(health.timestamp).toLocaleTimeString()
                  : error
                    ? "Failed"
                    : "—"}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
