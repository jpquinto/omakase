"use client";

import { MessageCircle, Terminal } from "lucide-react";
import type { AgentThreadMode } from "@omakase/db";
import {
  LiquidTabs,
  LiquidTabsList,
  LiquidTabsTrigger,
} from "@/components/ui/liquid-tabs";

interface ConversationModeSelectorProps {
  mode: AgentThreadMode;
  onModeChange: (mode: AgentThreadMode) => void;
  disabled?: boolean;
}

export function ConversationModeSelector({ mode, onModeChange, disabled }: ConversationModeSelectorProps) {
  return (
    <LiquidTabs
      value={mode}
      onValueChange={(v) => onModeChange(v as AgentThreadMode)}
      className="flex-col-0 gap-0"
    >
      <LiquidTabsList>
        <LiquidTabsTrigger value="chat" disabled={disabled}>
          <MessageCircle />
          Chat
        </LiquidTabsTrigger>
        <LiquidTabsTrigger value="work" disabled={disabled}>
          <Terminal />
          Work
        </LiquidTabsTrigger>
      </LiquidTabsList>
    </LiquidTabs>
  );
}
