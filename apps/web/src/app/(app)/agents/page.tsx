"use client";

// ---------------------------------------------------------------------------
// Agents Listing Page
//
// Displays the fixed team of 4 AI agents in a responsive card grid. Each card
// links to the agent's detailed profile page and uses the agent's signature
// color for visual identity. Cards animate in with staggered delays.
// ---------------------------------------------------------------------------

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/scroll-reveal";

const AGENTS = [
  {
    id: "miso",
    name: "Miso",
    mascot: "\u{1F35C}",
    role: "Architect",
    color: "from-oma-gold/20 to-oma-gold/5",
    accentColor: "text-oma-gold",
    borderColor: "border-oma-gold/30",
    persona:
      "Meditative planner who obsessively maps every dependency before a single line of code is written.",
  },
  {
    id: "nori",
    name: "Nori",
    mascot: "\u{1F359}",
    role: "Coder",
    color: "from-oma-indigo/20 to-oma-indigo/5",
    accentColor: "text-oma-indigo",
    borderColor: "border-oma-indigo/30",
    persona:
      "High-energy speedrunner who writes code at breakneck pace and treats every feature like a competitive sprint.",
  },
  {
    id: "koji",
    name: "Koji",
    mascot: "\u{1F376}",
    role: "Reviewer",
    color: "from-oma-secondary/20 to-oma-secondary/5",
    accentColor: "text-oma-secondary",
    borderColor: "border-oma-secondary/30",
    persona:
      "Warm but exacting curator who appreciates aesthetic code and refuses to let anything sloppy pass review.",
  },
  {
    id: "toro",
    name: "Toro",
    mascot: "\u{1F363}",
    role: "Tester",
    color: "from-oma-jade/20 to-oma-jade/5",
    accentColor: "text-oma-jade",
    borderColor: "border-oma-jade/30",
    persona:
      "Chaos gremlin and bug hunter who narrates test runs like a sports commentator and loves finding edge cases.",
  },
];

export default function AgentsPage() {
  return (
    <div>
      {/* Page Hero */}
      <ScrollReveal>
        <div className="mb-12 text-center">
          <h1 className="mb-3 font-serif text-4xl font-bold tracking-tight text-oma-text sm:text-5xl">
            The Team
          </h1>
          <p className="text-base text-oma-text-muted">
            Meet the agents behind Omakase
          </p>
          {/* Gradient separator */}
          <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-oma-primary/40 to-transparent" />
        </div>
      </ScrollReveal>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {AGENTS.map((agent, i) => (
          <Link
            key={agent.id}
            href={`/agents/${agent.id}`}
            className={cn(
              "group relative overflow-hidden rounded-oma-lg",
              "bg-gradient-to-br",
              agent.color,
              "border border-oma-glass-border/50 hover:border-oma-glass-border-bright",
              "transition-all duration-300 hover:shadow-oma-lg hover:-translate-y-1",
              "animate-oma-fade-up opacity-0",
            )}
            style={{
              animationDelay: `${i * 120 + 100}ms`,
              animationFillMode: "forwards",
            }}
          >
            {/* Hover shimmer */}
            <div className="pointer-events-none absolute inset-0 -translate-x-full opacity-0 transition-opacity duration-500 group-hover:animate-[shimmer_2s_ease-in-out] group-hover:opacity-100 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

            <div className="relative flex flex-col items-center px-6 pb-6 pt-8">
              {/* Mascot */}
              <span className="mb-4 block text-6xl transition-transform duration-300 group-hover:scale-110">
                {agent.mascot}
              </span>

              {/* Name */}
              <h2 className="mb-1.5 font-serif text-2xl font-bold text-oma-text">
                {agent.name}
              </h2>

              {/* Role Badge */}
              <span
                className={cn(
                  "mb-4 inline-block rounded-oma-full px-3 py-1 text-xs font-semibold uppercase tracking-wider",
                  "glass-sm",
                  agent.accentColor,
                )}
              >
                {agent.role}
              </span>

              {/* Persona excerpt */}
              <p className="mb-5 line-clamp-2 text-center text-sm leading-relaxed text-oma-text-muted">
                {agent.persona}
              </p>

              {/* "View Profile" arrow */}
              <div className="flex items-center gap-1.5 text-xs font-medium text-oma-text-subtle transition-colors duration-200 group-hover:text-oma-text">
                <span>View Profile</span>
                <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
