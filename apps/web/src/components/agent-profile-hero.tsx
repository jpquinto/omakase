"use client";

// ---------------------------------------------------------------------------
// Agent Profile Hero
//
// Full-width hero section for agent profile pages. Displays the agent's mascot
// emoji, display name, role badge, personality traits, and communication style
// with a gradient background matched to the agent's color.
// ---------------------------------------------------------------------------

import { cn } from "@/lib/utils";

export interface AgentProfileHeroProps {
  /** Internal agent name (e.g. "miso") */
  agentName: string;
  /** Display name shown in the hero (e.g. "Miso") */
  displayName: string;
  /** Mascot emoji for the agent */
  mascot: string;
  /** Agent role (e.g. "Architect") */
  role: string;
  /** Personality trait tags */
  traits: string[];
  /** Short communication style description */
  communicationStyle: string;
  /** Tailwind gradient color classes (e.g. "from-indigo-500/20 to-indigo-600/10") */
  color: string;
  /** Accent text color class for the role badge (e.g. "text-indigo-400") */
  accentColor: string;
}

export function AgentProfileHero({
  displayName,
  mascot,
  role,
  traits,
  communicationStyle,
  color,
  accentColor,
}: AgentProfileHeroProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-oma-lg",
        "bg-gradient-to-br",
        color,
        "border border-oma-glass-border/50",
        "animate-oma-fade-up opacity-0",
      )}
      style={{ animationFillMode: "forwards" }}
    >
      {/* Decorative radial glow behind the mascot */}
      <div
        className={cn(
          "pointer-events-none absolute -top-20 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full opacity-20 blur-3xl",
          // Reuse the gradient direction colors for the glow
          "bg-gradient-to-b",
          color,
        )}
      />

      {/* Shimmer sweep animation */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />

      <div className="relative flex flex-col items-center px-8 pb-8 pt-10 text-center sm:pb-10 sm:pt-14">
        {/* Mascot */}
        <div className="relative mb-5">
          {/* Subtle pulsing ring behind the mascot */}
          <span className="absolute inset-0 scale-150 animate-oma-breathe rounded-full bg-white/[0.03]" />
          <span
            className="relative block animate-oma-float text-7xl sm:text-8xl"
            role="img"
            aria-label={`${displayName} mascot`}
          >
            {mascot}
          </span>
        </div>

        {/* Display Name */}
        <h1 className="mb-2 font-serif text-4xl font-bold tracking-tight text-oma-text sm:text-5xl">
          {displayName}
        </h1>

        {/* Role Badge */}
        <div
          className={cn(
            "mb-5 inline-flex items-center gap-1.5 rounded-oma-full px-4 py-1.5",
            "glass-sm",
            accentColor,
          )}
        >
          <span className="text-sm font-semibold uppercase tracking-wider">
            {role}
          </span>
        </div>

        {/* Personality Traits */}
        {traits.length > 0 && (
          <div className="mb-5 flex flex-wrap justify-center gap-2">
            {traits.map((trait) => (
              <span
                key={trait}
                className={cn(
                  "rounded-oma-full px-3 py-1 text-xs font-medium",
                  "glass",
                  "text-oma-text-muted transition-colors duration-200 hover:text-oma-text",
                )}
              >
                {trait}
              </span>
            ))}
          </div>
        )}

        {/* Communication Style */}
        {communicationStyle && (
          <p className="max-w-lg text-sm leading-relaxed text-oma-text-muted">
            {communicationStyle}
          </p>
        )}
      </div>
    </div>
  );
}
