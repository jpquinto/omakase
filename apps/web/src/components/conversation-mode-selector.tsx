"use client";

import { cn } from "@/lib/utils";
import { MessageCircle, Terminal } from "lucide-react";
import type { AgentThreadMode } from "@omakase/db";

interface ConversationModeSelectorProps {
  mode: AgentThreadMode;
  onModeChange: (mode: AgentThreadMode) => void;
  disabled?: boolean;
}

export function ConversationModeSelector({ mode, onModeChange, disabled }: ConversationModeSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-oma-full glass-sm p-1">
      <button
        onClick={() => onModeChange("chat")}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 rounded-oma-full px-4 py-2 text-sm font-medium transition-all duration-200",
          mode === "chat"
            ? "bg-oma-primary/20 text-oma-primary shadow-sm"
            : "text-oma-text-muted hover:text-oma-text",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <MessageCircle className="h-4 w-4" />
        Chat
      </button>
      <button
        onClick={() => onModeChange("work")}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 rounded-oma-full px-4 py-2 text-sm font-medium transition-all duration-200",
          mode === "work"
            ? "bg-oma-jade/20 text-oma-jade shadow-sm"
            : "text-oma-text-muted hover:text-oma-text",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <Terminal className="h-4 w-4" />
        Work
      </button>
    </div>
  );
}
