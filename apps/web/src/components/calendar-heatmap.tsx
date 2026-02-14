"use client";

// ---------------------------------------------------------------------------
// Calendar Heatmap Component
//
// GitHub-style contribution calendar. Accepts real activity data and renders
// a 52-week grid with 5 intensity levels. Supports custom color themes via
// the `colorClass` prop to match different agent accent colors.
// ---------------------------------------------------------------------------

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface CalendarHeatmapProps {
  /** Array of { date, count } entries representing daily activity. */
  data: { date: string; count: number }[];
  /**
   * Base color class prefix for intensity levels. Accepts an Omakase color
   * token name (e.g. "oma-primary", "oma-indigo", "oma-jade") or any
   * Tailwind color class prefix. Defaults to "oma-primary".
   */
  colorClass?: string;
  /** Label displayed after the total count. Defaults to "contributions in the last year". */
  totalLabel?: string;
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

/**
 * Converts a flat array of { date, count } to a 52x7 grid of intensity
 * levels (0–4). Missing dates default to level 0.
 */
function buildHeatmapGrid(
  data: { date: string; count: number }[],
): { grid: number[][]; total: number } {
  // Build a lookup map from date string to count
  const countMap = new Map<string, number>();
  let total = 0;

  for (const entry of data) {
    countMap.set(entry.date, (countMap.get(entry.date) ?? 0) + entry.count);
    total += entry.count;
  }

  // Determine the max count to normalize into 4 levels
  const maxCount = Math.max(...Array.from(countMap.values()), 1);

  // Build 52 weeks x 7 days, starting ~1 year ago from today
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 52 * 7 + 1);

  // Align to the previous Monday so weeks start consistently
  const dayOfWeek = startDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startDate.setDate(startDate.getDate() + mondayOffset);

  const grid: number[][] = [];
  const cursor = new Date(startDate);

  for (let w = 0; w < 52; w++) {
    const week: number[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = cursor.toISOString().split("T")[0];
      const count = countMap.get(dateStr) ?? 0;

      // Normalize count to 0–4 level
      let level = 0;
      if (count > 0) {
        const ratio = count / maxCount;
        if (ratio <= 0.25) level = 1;
        else if (ratio <= 0.5) level = 2;
        else if (ratio <= 0.75) level = 3;
        else level = 4;
      }

      week.push(level);
      cursor.setDate(cursor.getDate() + 1);
    }
    grid.push(week);
  }

  return { grid, total };
}

/**
 * Returns an array of 5 Tailwind class strings for levels 0–4, parameterized
 * by the provided color class prefix.
 */
function getLevelClasses(colorClass: string): string[] {
  return [
    "bg-white/[0.06]",                                               // 0 — empty
    `bg-${colorClass}/20`,                                         // 1 — low
    `bg-${colorClass}/40`,                                         // 2 — medium
    `bg-${colorClass}/65`,                                         // 3 — high
    `bg-${colorClass} shadow-[0_0_6px_rgba(244,114,182,0.3)]`,     // 4 — max
  ];
}

/**
 * Predefined level classes for known Omakase color tokens. Using explicit
 * classes ensures Tailwind can detect them at build time (dynamic class
 * interpolation is not supported by Tailwind's JIT compiler).
 */
const KNOWN_LEVEL_CLASSES: Record<string, string[]> = {
  "oma-primary": [
    "bg-white/[0.06]",
    "bg-oma-primary/20",
    "bg-oma-primary/40",
    "bg-oma-primary/65",
    "bg-oma-primary shadow-[0_0_6px_rgba(244,114,182,0.3)]",
  ],
  "oma-indigo": [
    "bg-white/[0.06]",
    "bg-oma-indigo/20",
    "bg-oma-indigo/40",
    "bg-oma-indigo/65",
    "bg-oma-indigo shadow-[0_0_6px_rgba(129,140,248,0.3)]",
  ],
  "oma-jade": [
    "bg-white/[0.06]",
    "bg-oma-jade/20",
    "bg-oma-jade/40",
    "bg-oma-jade/65",
    "bg-oma-jade shadow-[0_0_6px_rgba(110,231,183,0.3)]",
  ],
  "oma-info": [
    "bg-white/[0.06]",
    "bg-oma-info/20",
    "bg-oma-info/40",
    "bg-oma-info/65",
    "bg-oma-info shadow-[0_0_6px_rgba(56,189,248,0.3)]",
  ],
  "oma-secondary": [
    "bg-white/[0.06]",
    "bg-oma-secondary/20",
    "bg-oma-secondary/40",
    "bg-oma-secondary/65",
    "bg-oma-secondary shadow-[0_0_6px_rgba(248,113,113,0.3)]",
  ],
  "oma-gold": [
    "bg-white/[0.06]",
    "bg-oma-gold/20",
    "bg-oma-gold/40",
    "bg-oma-gold/65",
    "bg-oma-gold shadow-[0_0_6px_rgba(251,191,36,0.3)]",
  ],
};

export function CalendarHeatmap({
  data,
  colorClass = "oma-primary",
  totalLabel = "contributions in the last year",
}: CalendarHeatmapProps) {
  const { grid, total } = useMemo(() => buildHeatmapGrid(data), [data]);

  // Use predefined classes when available for Tailwind JIT compatibility,
  // otherwise fall back to dynamic interpolation
  const levelClasses =
    KNOWN_LEVEL_CLASSES[colorClass] ?? getLevelClasses(colorClass);

  // Determine the hover ring color based on the color class
  const hoverRingClass =
    colorClass === "oma-primary"
      ? "hover:ring-oma-primary/40"
      : colorClass === "oma-indigo"
        ? "hover:ring-oma-indigo/40"
        : colorClass === "oma-jade"
          ? "hover:ring-oma-jade/40"
          : colorClass === "oma-info"
            ? "hover:ring-oma-info/40"
            : colorClass === "oma-secondary"
              ? "hover:ring-oma-secondary/40"
              : colorClass === "oma-gold"
                ? "hover:ring-oma-gold/40"
                : "hover:ring-oma-primary/40";

  return (
    <div className="space-y-3">
      {/* Header with total */}
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-oma-text-muted">
          <span className="font-medium text-oma-text">{total}</span>{" "}
          {totalLabel}
        </p>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="inline-flex gap-[3px]">
          {/* Day-of-week labels */}
          <div className="mr-3 flex flex-col gap-[3px] pt-[22px]">
            {DAY_LABELS.map((label, i) => (
              <div
                key={i}
                className="flex h-[11px] items-center text-[9px] leading-none text-oma-text-faint"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {grid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {/* Month label on the first week of each month */}
              <div className="h-[18px]">
                {wi % 4 === 0 && wi / 4 < 12 && (
                  <span className="text-[9px] leading-none text-oma-text-faint">
                    {MONTH_LABELS[Math.floor(wi / 4.33)]}
                  </span>
                )}
              </div>
              {week.map((level, di) => (
                <div
                  key={di}
                  className={cn(
                    "h-[11px] w-[11px] rounded-[2px] transition-all duration-150 hover:scale-150 hover:ring-1",
                    hoverRingClass,
                    levelClasses[level],
                  )}
                  title={`Level ${level}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5">
        <span className="text-[10px] text-oma-text-faint">Less</span>
        {levelClasses.map((cls, i) => (
          <div
            key={i}
            className={cn("h-[11px] w-[11px] rounded-[2px]", cls)}
          />
        ))}
        <span className="text-[10px] text-oma-text-faint">More</span>
      </div>
    </div>
  );
}
