"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { AgentRunRole, QuizQuestion } from "@omakase/db";

const ROLE_PROGRESS_BG: Record<AgentRunRole, string> = {
  architect: "bg-oma-gold",
  coder: "bg-oma-indigo",
  reviewer: "bg-oma-secondary",
  tester: "bg-oma-jade",
};

const ROLE_PROGRESS_TEXT: Record<AgentRunRole, string> = {
  architect: "text-oma-gold",
  coder: "text-oma-indigo",
  reviewer: "text-oma-secondary",
  tester: "text-oma-jade",
};

const ROLE_OPTION_SELECTED: Record<AgentRunRole, string> = {
  architect: "bg-oma-gold/8 shadow-[0_0_20px_rgba(251,191,36,0.12)]",
  coder: "bg-oma-indigo/8 shadow-[0_0_20px_rgba(129,140,248,0.12)]",
  reviewer: "bg-oma-secondary/8 shadow-[0_0_20px_rgba(248,113,113,0.12)]",
  tester: "bg-oma-jade/8 shadow-[0_0_20px_rgba(110,231,183,0.12)]",
};

const ROLE_LABEL_SELECTED: Record<AgentRunRole, string> = {
  architect: "bg-oma-gold/20 text-oma-gold border-oma-gold/30",
  coder: "bg-oma-indigo/20 text-oma-indigo border-oma-indigo/30",
  reviewer: "bg-oma-secondary/20 text-oma-secondary border-oma-secondary/30",
  tester: "bg-oma-jade/20 text-oma-jade border-oma-jade/30",
};

const OPTION_LABELS = ["A", "B", "C", "D"];

interface QuizQuestionCardProps {
  question: QuizQuestion;
  role: AgentRunRole;
  onAnswer: (answerIndex: number) => void;
  disabled?: boolean;
}

export function QuizQuestionCard({ question, role, onAnswer, disabled }: QuizQuestionCardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const locked = disabled || selected !== null;

  const handleSelect = (index: number) => {
    if (locked) return;
    setSelected(index);
    onAnswer(index);
  };

  // Progress dots
  const dots = Array.from({ length: question.total }, (_, i) => i);

  return (
    <div className="mt-4 w-full animate-oma-fade-up">
      {/* Header: progress dots + difficulty badge */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {dots.map((i) => (
            <div
              key={i}
              className={cn(
                "h-2 rounded-full transition-all duration-500",
                i <= question.index ? "w-5" : "w-2",
                i < question.index && ROLE_PROGRESS_BG[role],
                i === question.index && cn(ROLE_PROGRESS_BG[role], "animate-pulse"),
                i > question.index && "bg-oma-bg-surface",
              )}
            />
          ))}
          <span className={cn("ml-2 text-xs font-medium tabular-nums", ROLE_PROGRESS_TEXT[role])}>
            {question.index + 1}/{question.total}
          </span>
        </div>

        <span className="glass-sm rounded-oma-full px-2.5 py-1 text-[10px] font-medium tracking-wider text-oma-text-subtle uppercase">
          {question.difficulty}
        </span>
      </div>

      {/* Question text */}
      <p className="mb-4 font-serif text-[15px] font-medium leading-relaxed text-oma-text">
        {question.text}
      </p>

      {/* Answer options */}
      <div className="space-y-2">
        {question.options.map((option, i) => {
          const isSelected = selected === i;
          const isFaded = selected !== null && !isSelected;

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={locked}
              className={cn(
                "group flex w-full items-start gap-3 rounded-oma px-4 py-3.5 text-left transition-all duration-300 cursor-pointer",
                isSelected
                  ? cn("glass-sm", ROLE_OPTION_SELECTED[role])
                  : "glass-sm hover:bg-oma-bg-surface/60 hover:-translate-y-px hover:shadow-oma-sm",
                isFaded && "opacity-30 scale-[0.98]",
                "disabled:cursor-default",
                "animate-oma-fade-up opacity-0",
              )}
              style={{ animationDelay: `${150 + i * 80}ms`, animationFillMode: "forwards" }}
            >
              <span className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300",
                isSelected
                  ? ROLE_LABEL_SELECTED[role]
                  : "bg-oma-bg-surface text-oma-text-muted group-hover:text-oma-text",
              )}>
                {OPTION_LABELS[i]}
              </span>

              <span className={cn(
                "pt-0.5 text-sm leading-relaxed transition-colors duration-200",
                isSelected ? "text-oma-text" : "text-oma-text-muted group-hover:text-oma-text",
              )}>
                {option.replace(/^[A-D]\)\s*/, "")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
