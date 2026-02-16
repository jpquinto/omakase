"use client";

import { useState } from "react";
import { Activity, Server, Clock, RefreshCw, Settings2, BookOpen } from "lucide-react";
import { useOrchestratorHealth } from "@/hooks/use-api";
import { DocsSection } from "@/components/docs-section";
import { cn } from "@/lib/utils";

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

const TABS = [
  { id: "general" as const, label: "General", icon: Settings2 },
  { id: "docs" as const, label: "Documentation", icon: BookOpen },
];

type TabId = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const { data: health, isLoading, error, refetch } = useOrchestratorHealth();

  const isConnected = !!health && !error;

  return (
    <div className="animate-oma-fade-up">
      {/* Page heading + tabs */}
      <div className={cn("mx-auto", activeTab === "docs" ? "max-w-5xl" : "max-w-3xl")}>
        <div className="mb-6">
          <h1 className="mb-2 font-serif text-2xl font-bold tracking-tight text-oma-text md:text-3xl">
            Settings
          </h1>
          <p className="text-sm text-oma-text-muted">
            System configuration and documentation
          </p>
        </div>

        {/* Tab bar */}
        <div className="mb-8 flex gap-1 rounded-oma-lg bg-oma-bg-surface/50 p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 rounded-oma px-4 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "glass bg-oma-bg-elevated text-oma-text shadow-oma-sm"
                    : "text-oma-text-muted hover:text-oma-text",
                )}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "general" && (
        <div className="mx-auto max-w-3xl">
          <GeneralTab
            health={health}
            isLoading={isLoading}
            isConnected={isConnected}
            error={error}
            refetch={refetch}
          />
        </div>
      )}

      {activeTab === "docs" && (
        <div className="mx-auto max-w-5xl">
          <DocsSection />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// General Tab (existing orchestrator health)
// ---------------------------------------------------------------------------

function GeneralTab({
  health,
  isLoading,
  isConnected,
  error,
  refetch,
}: {
  health: { uptime: number; timestamp: string } | undefined;
  isLoading: boolean;
  isConnected: boolean;
  error: unknown;
  refetch: () => void;
}) {
  return (
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

          <div className="rounded-oma bg-oma-bg-surface/50 px-3.5 py-3">
            <div className="mb-1 flex items-center gap-1.5 text-oma-text-subtle">
              <Clock className="size-3" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Uptime
              </span>
            </div>
            <p className="font-mono text-xs text-oma-text-muted">
              {isConnected ? formatUptime(health!.uptime) : "—"}
            </p>
          </div>

          <div className="rounded-oma bg-oma-bg-surface/50 px-3.5 py-3">
            <div className="mb-1 flex items-center gap-1.5 text-oma-text-subtle">
              <RefreshCw className="size-3" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Last checked
              </span>
            </div>
            <p className="font-mono text-xs text-oma-text-muted">
              {isConnected
                ? new Date(health!.timestamp).toLocaleTimeString()
                : error
                  ? "Failed"
                  : "—"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
