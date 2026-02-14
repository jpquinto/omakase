"use client";

import { cn } from "@/lib/utils";
import { Trophy, RotateCcw, Check, X, Sparkles } from "lucide-react";
import type { AgentRunRole, QuizMetadata } from "@omakase/db";

const ROLE_GLOW_RGB: Record<AgentRunRole, string> = {
  architect: "251, 191, 36",
  coder: "129, 140, 248",
  reviewer: "248, 113, 113",
  tester: "110, 231, 183",
};

const ROLE_ACCENT: Record<AgentRunRole, string> = {
  architect: "text-oma-gold",
  coder: "text-oma-indigo",
  reviewer: "text-oma-secondary",
  tester: "text-oma-jade",
};

const ROLE_TROPHY_GLOW: Record<AgentRunRole, string> = {
  architect: "shadow-[0_0_24px_rgba(251,191,36,0.25)]",
  coder: "shadow-[0_0_24px_rgba(129,140,248,0.25)]",
  reviewer: "shadow-[0_0_24px_rgba(248,113,113,0.25)]",
  tester: "shadow-[0_0_24px_rgba(110,231,183,0.25)]",
};

const ROLE_TROPHY_BG: Record<AgentRunRole, string> = {
  architect: "bg-oma-gold/10",
  coder: "bg-oma-indigo/10",
  reviewer: "bg-oma-secondary/10",
  tester: "bg-oma-jade/10",
};

interface QuizResultsProps {
  metadata: QuizMetadata;
  role: AgentRunRole;
  onPlayAgain?: () => void;
}

export function QuizResults({ metadata, role, onPlayAgain }: QuizResultsProps) {
  const { results } = metadata;
  if (!results) return null;

  const glowRgb = ROLE_GLOW_RGB[role];
  const percentage = Math.round((results.score / results.total) * 100);
  const isPerfect = results.score === results.total;

  return (
    <div className="relative mt-4 animate-oma-scale-in">
      {/* Celebration glow for high scores */}
      {results.score >= 4 && (
        <div
          className="pointer-events-none absolute -inset-6 -z-10 animate-oma-breathe"
          style={{
            background: `radial-gradient(circle at 50% 40%, rgba(${glowRgb}, 0.12) 0%, transparent 65%)`,
            filter: "blur(24px)",
          }}
        />
      )}

      {/* Main results card */}
      <div className="glass glass-edge rounded-oma-lg overflow-hidden">
        {/* Score section */}
        <div className="relative px-6 pt-6 pb-5 text-center">
          {/* Trophy with glow */}
          <div
            className="animate-oma-fade-up opacity-0"
            style={{ animationDelay: "100ms", animationFillMode: "forwards" }}
          >
            <div className={cn(
              "mx-auto flex h-14 w-14 items-center justify-center rounded-full",
              ROLE_TROPHY_BG[role],
              ROLE_TROPHY_GLOW[role],
            )}>
              <Trophy className={cn("h-7 w-7", ROLE_ACCENT[role])} />
            </div>
          </div>

          {/* Score */}
          <div
            className="mt-4 animate-oma-fade-up opacity-0"
            style={{ animationDelay: "250ms", animationFillMode: "forwards" }}
          >
            <p className={cn(
              "font-serif text-4xl font-bold tracking-tight tabular-nums",
              ROLE_ACCENT[role],
            )}>
              {results.score}<span className="text-oma-text-subtle">/{results.total}</span>
            </p>
            <p className="mt-1 text-sm text-oma-text-muted">{percentage}% correct</p>
          </div>

          {/* Rating pill */}
          <div
            className="mt-3 animate-oma-fade-up opacity-0"
            style={{ animationDelay: "400ms", animationFillMode: "forwards" }}
          >
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-oma-full px-4 py-1.5 text-sm font-medium",
              isPerfect && "bg-oma-success/15 text-oma-success shadow-[0_0_16px_rgba(74,222,128,0.1)]",
              results.score === 4 && "bg-oma-gold/15 text-oma-gold",
              results.score === 3 && "bg-oma-info/15 text-oma-info",
              results.score <= 2 && "bg-oma-bg-surface text-oma-text-muted",
            )}>
              {isPerfect && <Sparkles className="h-3.5 w-3.5" />}
              {results.rating}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-6 h-px" style={{
          background: `linear-gradient(to right, transparent, rgba(${glowRgb}, 0.2), transparent)`,
        }} />

        {/* Breakdown section */}
        <div className="px-6 py-4">
          <p className="mb-2.5 text-[11px] font-medium tracking-wider text-oma-text-subtle uppercase">
            Question breakdown
          </p>
          <div className="flex gap-2">
            {results.breakdown.map((item, i) => (
              <div
                key={i}
                className={cn(
                  "glass-sm flex h-9 w-9 items-center justify-center rounded-oma transition-all",
                  "animate-oma-scale-in opacity-0",
                  item.correct
                    ? "border-oma-success/20 text-oma-success"
                    : "border-oma-error/20 text-oma-error",
                )}
                style={{ animationDelay: `${500 + i * 80}ms`, animationFillMode: "forwards" }}
                title={`Q${i + 1}: ${item.correct ? "Correct" : "Incorrect"}`}
              >
                {item.correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </div>
            ))}
          </div>
        </div>

        {/* Play again */}
        {onPlayAgain && (
          <div className="border-t border-oma-glass-border px-6 py-4">
            <button
              onClick={onPlayAgain}
              className={cn(
                "glass-sm flex w-full items-center justify-center gap-2 rounded-oma py-2.5 text-sm font-medium text-oma-text transition-all duration-300",
                "hover:border-oma-glass-border-bright hover:shadow-oma-sm hover:-translate-y-px",
              )}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
