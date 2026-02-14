"use client";

import { cn } from "@/lib/utils";
import { Check, X, Lightbulb } from "lucide-react";
import type { AgentRunRole, QuizMetadata } from "@omakase/db";

const OPTION_LABELS = ["A", "B", "C", "D"];

const ROLE_SCORE_TEXT: Record<AgentRunRole, string> = {
  architect: "text-oma-gold",
  coder: "text-oma-indigo",
  reviewer: "text-oma-secondary",
  tester: "text-oma-jade",
};

interface QuizAnswerResultProps {
  metadata: QuizMetadata;
  role: AgentRunRole;
}

export function QuizAnswerResult({ metadata, role }: QuizAnswerResultProps) {
  const { question, selectedAnswer, correctAnswer, isCorrect, explanation } = metadata;
  if (!question || selectedAnswer == null || correctAnswer == null) return null;

  return (
    <div className="mt-4 animate-oma-fade-up">
      {/* Result banner */}
      <div className={cn(
        "glass-edge flex items-center gap-3 rounded-oma-lg px-4 py-3",
        isCorrect
          ? "bg-oma-success/6 border border-oma-success/20"
          : "bg-oma-error/6 border border-oma-error/20",
      )}>
        {/* Animated icon */}
        <div className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full animate-oma-scale-in",
          isCorrect
            ? "bg-oma-success/15 text-oma-success shadow-[0_0_12px_rgba(74,222,128,0.15)]"
            : "bg-oma-error/15 text-oma-error shadow-[0_0_12px_rgba(248,113,113,0.15)]",
        )}>
          {isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </div>

        <div className="flex-1">
          <p className={cn(
            "text-sm font-semibold",
            isCorrect ? "text-oma-success" : "text-oma-error",
          )}>
            {isCorrect ? "Correct!" : "Not quite"}
          </p>
        </div>

        {/* Running score */}
        {metadata.score && (
          <div className="text-right">
            <p className={cn("font-serif text-lg font-bold tabular-nums", ROLE_SCORE_TEXT[role])}>
              {metadata.score.correct}/{metadata.score.total}
            </p>
          </div>
        )}
      </div>

      {/* Compact option review — only show selected + correct */}
      <div className="mt-3 space-y-1.5">
        {question.options.map((option, i) => {
          const isSelected = i === selectedAnswer;
          const isCorrectOption = i === correctAnswer;
          const isRelevant = isSelected || isCorrectOption;

          if (!isRelevant) return null;

          return (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 rounded-oma px-3.5 py-2.5 text-sm transition-all",
                isCorrectOption && "glass-sm border-oma-success/25",
                isSelected && !isCorrect && "glass-sm border-oma-error/25",
              )}
            >
              <span className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px]",
                isCorrectOption && "bg-oma-success/15 text-oma-success",
                isSelected && !isCorrect && "bg-oma-error/15 text-oma-error",
              )}>
                {isCorrectOption ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              </span>
              <span className={cn(
                "text-sm",
                isCorrectOption ? "text-oma-text" : "text-oma-text-muted",
              )}>
                <span className="mr-1.5 font-medium text-oma-text-subtle">{OPTION_LABELS[i]}.</span>
                {option.replace(/^[A-D]\)\s*/, "")}
              </span>
            </div>
          );
        })}
      </div>

      {/* Explanation — glass card with lightbulb */}
      {explanation && (
        <div className="mt-3 glass-sm rounded-oma p-3.5 animate-oma-blur-in" style={{ animationDelay: "200ms" }}>
          <div className="flex gap-2.5">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-oma-gold" />
            <p className="text-xs leading-relaxed text-oma-text-muted">
              {explanation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
