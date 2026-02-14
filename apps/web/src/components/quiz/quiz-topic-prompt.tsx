"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, ArrowRight } from "lucide-react";
import type { AgentRunRole } from "@omakase/db";

const AGENT_SUGGESTIONS: Record<string, string[]> = {
  architect: ["Software Architecture", "System Design Patterns", "Distributed Systems"],
  coder: ["JavaScript & TypeScript", "React & Frontend", "Git & Version Control"],
  reviewer: ["Code Review Best Practices", "Security Vulnerabilities", "Clean Code Principles"],
  tester: ["Testing Strategies", "Edge Cases & Bugs", "QA Methodology"],
};

/** Per-agent RGB for ambient glow behind the topic card */
const ROLE_GLOW_RGB: Record<AgentRunRole, string> = {
  architect: "251, 191, 36",
  coder: "129, 140, 248",
  reviewer: "248, 113, 113",
  tester: "110, 231, 183",
};

const ROLE_CHIP: Record<AgentRunRole, string> = {
  architect: "hover:border-oma-gold/40 hover:shadow-[0_0_12px_rgba(251,191,36,0.1)]",
  coder: "hover:border-oma-indigo/40 hover:shadow-[0_0_12px_rgba(129,140,248,0.1)]",
  reviewer: "hover:border-oma-secondary/40 hover:shadow-[0_0_12px_rgba(248,113,113,0.1)]",
  tester: "hover:border-oma-jade/40 hover:shadow-[0_0_12px_rgba(110,231,183,0.1)]",
};

const ROLE_SUBMIT: Record<AgentRunRole, string> = {
  architect: "bg-oma-gold/15 text-oma-gold hover:bg-oma-gold/25 hover:shadow-[0_0_16px_rgba(251,191,36,0.15)]",
  coder: "bg-oma-indigo/15 text-oma-indigo hover:bg-oma-indigo/25 hover:shadow-[0_0_16px_rgba(129,140,248,0.15)]",
  reviewer: "bg-oma-secondary/15 text-oma-secondary hover:bg-oma-secondary/25 hover:shadow-[0_0_16px_rgba(248,113,113,0.15)]",
  tester: "bg-oma-jade/15 text-oma-jade hover:bg-oma-jade/25 hover:shadow-[0_0_16px_rgba(110,231,183,0.15)]",
};

interface QuizTopicPromptProps {
  role: AgentRunRole;
  onSelectTopic: (topic: string) => void;
  disabled?: boolean;
}

export function QuizTopicPrompt({ role, onSelectTopic, disabled }: QuizTopicPromptProps) {
  const [customTopic, setCustomTopic] = useState("");
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = AGENT_SUGGESTIONS[role] ?? ["General Programming", "Web Development", "Computer Science"];
  const glowRgb = ROLE_GLOW_RGB[role];

  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => inputRef.current?.focus(), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative mt-4">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -inset-4 -z-10 opacity-60"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, rgba(${glowRgb}, 0.08) 0%, transparent 70%)`,
          filter: "blur(20px)",
        }}
      />

      <div className={cn(
        "glass rounded-oma-lg p-5 transition-all duration-700",
        mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      )}>
        {/* Section label */}
        <p className="mb-3 font-serif text-xs tracking-widest text-oma-text-subtle uppercase">
          Choose a topic
        </p>

        {/* Suggestion chips — staggered entrance */}
        <div className="flex flex-wrap gap-2">
          {suggestions.map((topic, i) => (
            <button
              key={topic}
              onClick={() => onSelectTopic(topic)}
              disabled={disabled}
              className={cn(
                "glass-sm rounded-oma-full px-4 py-2 text-sm text-oma-text-muted transition-all duration-300",
                "hover:-translate-y-0.5 hover:text-oma-text",
                ROLE_CHIP[role],
                "disabled:opacity-40 disabled:pointer-events-none",
                "animate-oma-fade-up opacity-0",
              )}
              style={{ animationDelay: `${200 + i * 120}ms`, animationFillMode: "forwards" }}
            >
              {topic}
            </button>
          ))}
        </div>

        {/* Divider with faded gradient */}
        <div className="my-4 h-px w-full" style={{
          background: `linear-gradient(to right, transparent, rgba(${glowRgb}, 0.2), transparent)`,
        }} />

        {/* Custom topic input — glass-lg container */}
        <div
          className="animate-oma-fade-up opacity-0"
          style={{ animationDelay: "550ms", animationFillMode: "forwards" }}
        >
          <div className={cn(
            "glass-sm flex items-center gap-3 rounded-oma px-4 py-3",
            "transition-all duration-300",
            "focus-within:border-oma-glass-border-bright focus-within:shadow-oma-sm",
          )}>
            <Sparkles className="h-4 w-4 shrink-0 text-oma-text-subtle" />
            <input
              ref={inputRef}
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customTopic.trim()) {
                  onSelectTopic(customTopic.trim());
                }
              }}
              disabled={disabled}
              placeholder="Or type any topic..."
              className="flex-1 bg-transparent text-sm text-oma-text outline-none placeholder:text-oma-text-faint disabled:opacity-50"
            />
            <button
              onClick={() => customTopic.trim() && onSelectTopic(customTopic.trim())}
              disabled={disabled || !customTopic.trim()}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-oma transition-all duration-200",
                ROLE_SUBMIT[role],
                "disabled:opacity-0 disabled:scale-90",
              )}
              aria-label="Start quiz"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
