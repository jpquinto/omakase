"use client";

// ---------------------------------------------------------------------------
// Agent Stats Grid
//
// Displays four key performance metrics in a responsive grid of glass cards.
// Each card features hover lift, colored glow, shimmer sweep, and staggered
// fade-up entrance animation. An optional `accentColor` prop tints the icon
// and hover glow to match the parent agent's color palette.
// ---------------------------------------------------------------------------

import { Activity, CheckCircle, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Accent color mappings — maps oma-* token names to Tailwind utility classes
// for the stat card icon and the hover glow shadow.
// ---------------------------------------------------------------------------

const ACCENT_ICON_CLASSES: Record<string, string> = {
  "oma-gold": "text-oma-gold/70 group-hover/card:text-oma-gold",
  "oma-indigo": "text-oma-indigo/70 group-hover/card:text-oma-indigo",
  "oma-secondary": "text-oma-secondary/70 group-hover/card:text-oma-secondary",
  "oma-jade": "text-oma-jade/70 group-hover/card:text-oma-jade",
  "oma-primary": "text-oma-primary/70 group-hover/card:text-oma-primary",
};

const ACCENT_GLOW_CLASSES: Record<string, string> = {
  "oma-gold": "hover:shadow-[0_0_20px_rgba(251,191,36,0.1)]",
  "oma-indigo": "hover:shadow-[0_0_20px_rgba(129,140,248,0.1)]",
  "oma-secondary": "hover:shadow-[0_0_20px_rgba(248,113,113,0.1)]",
  "oma-jade": "hover:shadow-[0_0_20px_rgba(110,231,183,0.1)]",
  "oma-primary": "hover:shadow-[0_0_20px_rgba(244,114,182,0.1)]",
};

export interface AgentStatsGridProps {
  /** Total number of pipeline runs */
  totalRuns: number;
  /** Success rate as a percentage (0-100) */
  successRate: number;
  /** Average run duration in milliseconds */
  avgDurationMs: number;
  /** ISO timestamp of the last run, or null if never run */
  lastRunAt: string | null;
  /** Optional accent color token (e.g. "oma-gold") for icon tint and hover glow */
  accentColor?: string;
}

/** Format milliseconds into a human-readable duration (e.g. "4m 12s"). */
function formatDuration(ms: number): string {
  if (ms <= 0) return "0s";

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  return `${seconds}s`;
}

/** Format an ISO timestamp as a relative time string (e.g. "2 hours ago"). */
function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;

  if (Number.isNaN(diffMs) || diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  delay: number;
  /** Optional accent color token (e.g. "oma-gold") */
  accentColor?: string;
}

function StatCard({ label, value, icon: Icon, delay, accentColor }: StatCardProps) {
  const iconColorClass = accentColor
    ? ACCENT_ICON_CLASSES[accentColor] ?? "text-oma-text-faint"
    : "text-oma-text-faint";

  const glowClass = accentColor
    ? ACCENT_GLOW_CLASSES[accentColor] ?? ""
    : "";

  return (
    <div
      className={cn(
        "group/card relative overflow-hidden glass rounded-oma p-5",
        "border border-oma-glass-border/50",
        "transition-all duration-300 cursor-default",
        "hover:-translate-y-1.5 hover:shadow-oma-lg hover:border-oma-glass-border-bright",
        glowClass,
        "animate-oma-fade-up opacity-0",
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      {/* Shimmer sweep on hover */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-700 group-hover/card:translate-x-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

      {/* Content */}
      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-oma-text-subtle">
            {label}
          </p>
          <div className="relative">
            <Icon
              className={cn(
                "size-4 transition-all duration-300 group-hover/card:scale-110",
                iconColorClass,
              )}
            />
          </div>
        </div>
        <p className="font-serif text-3xl font-bold text-oma-text">{value}</p>
      </div>
    </div>
  );
}

export function AgentStatsGrid({
  totalRuns,
  successRate,
  avgDurationMs,
  lastRunAt,
  accentColor,
}: AgentStatsGridProps) {
  const stats: Omit<StatCardProps, "delay" | "accentColor">[] = [
    {
      label: "Total Runs",
      value: totalRuns.toLocaleString(),
      icon: Zap,
    },
    {
      label: "Success Rate",
      value: `${successRate.toFixed(1)}%`,
      icon: CheckCircle,
    },
    {
      label: "Avg Duration",
      value: formatDuration(avgDurationMs),
      icon: Clock,
    },
    {
      label: "Last Active",
      value: lastRunAt ? formatRelativeTime(lastRunAt) : "Never",
      icon: Activity,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <StatCard
          key={stat.label}
          {...stat}
          delay={i * 100 + 100}
          accentColor={accentColor}
        />
      ))}
    </div>
  );
}
