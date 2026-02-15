"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ROLE_PALETTE, WELCOME_GLOW } from "@/lib/chat-constants";
import type { AgentInfo } from "@/lib/chat-constants";
import { Mic, Speech } from "lucide-react";

// ---------------------------------------------------------------------------
// ChatInput — textarea + send button + TTS toggle + mic button
// ---------------------------------------------------------------------------

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  canSend: boolean;
  isWorkMode: boolean;
  agent: AgentInfo;
  hasActiveWorkSession: boolean;
  showWelcome: boolean;
  hasMessages: boolean;
  error: Error | null;
  // Voice chat props
  voiceSupported?: boolean;
  isTalkMode?: boolean;
  isListening?: boolean;
  isSpeaking?: boolean;
  transcript?: string;
  voiceError?: string | null;
  onToggleTalkMode?: () => void;
  onStartListening?: () => void;
  onStopListening?: () => string;
  onStopSpeaking?: () => void;
  onVoiceSend?: (text: string) => void;
}

export function ChatInput({
  input,
  setInput,
  onSend,
  onKeyDown,
  canSend,
  isWorkMode,
  agent,
  hasActiveWorkSession,
  showWelcome,
  hasMessages,
  error,
  voiceSupported = false,
  isTalkMode = false,
  isListening = false,
  isSpeaking: _isSpeaking = false,
  transcript = "",
  voiceError,
  onToggleTalkMode,
  onStartListening,
  onStopListening,
  onStopSpeaking: _onStopSpeaking,
  onVoiceSend,
}: ChatInputProps) {
  const palette = ROLE_PALETTE[agent.role];
  const glowRgb = WELCOME_GLOW[agent.role];

  // Hold-to-talk timer — short press = toggle, long press = push-to-talk
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldingRef = useRef(false);
  const [, setIsHolding] = useState(false);

  const handleMicDown = useCallback(() => {
    if (!canSend || !onStartListening) return;
    isHoldingRef.current = false;

    holdTimerRef.current = setTimeout(() => {
      // Long press — push-to-talk mode
      isHoldingRef.current = true;
      setIsHolding(true);
      onStartListening();
    }, 200);
  }, [canSend, onStartListening]);

  const handleMicUp = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (isHoldingRef.current) {
      // Release from push-to-talk — stop and send
      setIsHolding(false);
      isHoldingRef.current = false;
      if (onStopListening && onVoiceSend) {
        const text = onStopListening();
        if (text) onVoiceSend(text);
      }
    } else if (!isListening) {
      // Short tap — start listening (tap-to-toggle)
      onStartListening?.();
    } else {
      // Short tap while listening — stop and send (tap-to-toggle)
      if (onStopListening && onVoiceSend) {
        const text = onStopListening();
        if (text) onVoiceSend(text);
      }
    }
  }, [isListening, onStartListening, onStopListening, onVoiceSend]);

  // Clean transcript for display (remove interim markers)
  const displayTranscript = transcript.replace(/\[/g, "").replace(/\]/g, "");

  return (
    <>
      {error && (
        <div className="mx-6 mb-3 rounded-oma border border-oma-error/30 bg-oma-error/10 px-4 py-2.5 text-sm text-oma-error">
          {error.message}
        </div>
      )}

      {voiceError && (
        <div className="mx-6 mb-3 rounded-oma border border-oma-warning/30 bg-oma-warning/10 px-4 py-2.5 text-sm text-oma-warning">
          {voiceError}
        </div>
      )}

      {isWorkMode && !hasActiveWorkSession && hasMessages && (
        <div className={cn("mx-6 mb-3 rounded-oma border bg-oma-bg-surface/50 px-4 py-2.5 text-center text-sm font-medium text-oma-text-muted", palette.border)}>
          Work session ended. Start a new thread to begin another session.
        </div>
      )}

      {!canSend && !showWelcome && hasMessages && (
        <div className={cn("mx-6 mb-3 rounded-oma border bg-oma-bg-surface/50 px-4 py-2.5 text-center text-sm font-medium text-oma-text-muted", palette.border)}>
          No active agent run. Start a new run to continue this conversation.
        </div>
      )}

      {/* Input area — hidden during welcome state */}
      <div className={cn(
        "border-t px-3 py-3 transition-all duration-500 md:px-6 md:py-4",
        palette.border,
        showWelcome && "opacity-0 pointer-events-none",
      )}>
        {/* Listening overlay — shown when mic is active */}
        {isListening && (
          <div
            className={cn(
              "mb-3 flex items-center gap-3 rounded-oma-lg border px-4 py-3",
              palette.border,
              "border-opacity-60 glass-sm",
            )}
          >
            {/* Waveform bars */}
            <div className="flex items-center gap-[3px]">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="inline-block w-[3px] rounded-full origin-bottom"
                  style={{
                    backgroundColor: `rgba(${glowRgb}, 0.8)`,
                    animation: `voice-bar 0.8s ease-in-out ${i * 0.12}s infinite`,
                    height: "16px",
                  }}
                />
              ))}
            </div>
            <span className="flex-1 text-sm text-oma-text-muted italic truncate">
              {displayTranscript || "Listening..."}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* TTS toggle — left of input */}
          {voiceSupported && onToggleTalkMode && (
            <button
              onClick={onToggleTalkMode}
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-oma-lg transition-all duration-300",
                isTalkMode
                  ? "glass text-oma-text shadow-oma-sm"
                  : "text-oma-text-muted hover:text-oma-text",
              )}
              aria-label={isTalkMode ? "Disable voice responses" : "Enable voice responses"}
              title={isTalkMode ? "Disable voice responses" : "Enable voice responses"}
            >
              <Speech className={cn("h-4.5 w-4.5", !isTalkMode && "opacity-50")} />
            </button>
          )}

          {/* Text input — always visible */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={!canSend}
            placeholder={
              isWorkMode
                ? hasActiveWorkSession
                  ? `Send a follow-up to ${agent.name}...`
                  : `Start a work session with ${agent.name}...`
                : canSend
                  ? `Message ${agent.name}...`
                  : "Agent is no longer active"
            }
            rows={1}
            className={cn(
              "glass-sm flex-1 resize-none rounded-oma-lg border bg-transparent px-4 py-3 text-base text-oma-text outline-none transition-colors",
              palette.border,
              "placeholder:text-oma-text-faint",
              "focus:border-oma-primary focus:ring-1 focus:ring-oma-primary/30",
              isWorkMode && "focus:border-oma-jade focus:ring-oma-jade/30",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />

          {/* Mic button — hold-to-talk or tap-to-toggle */}
          {voiceSupported && (
            <div className="relative">
              {/* Ripple rings when listening */}
              {isListening && (
                <>
                  <span
                    className="pointer-events-none absolute inset-0 rounded-oma-lg"
                    style={{
                      backgroundColor: `rgba(${glowRgb}, 0.2)`,
                      animation: "voice-ripple 1.5s ease-out infinite",
                    }}
                  />
                  <span
                    className="pointer-events-none absolute inset-0 rounded-oma-lg"
                    style={{
                      backgroundColor: `rgba(${glowRgb}, 0.15)`,
                      animation: "voice-ripple 1.5s ease-out 0.5s infinite",
                    }}
                  />
                </>
              )}

              <button
                onMouseDown={handleMicDown}
                onMouseUp={handleMicUp}
                onMouseLeave={() => {
                  if (holdTimerRef.current) {
                    clearTimeout(holdTimerRef.current);
                    holdTimerRef.current = null;
                  }
                  if (isHoldingRef.current) {
                    setIsHolding(false);
                    isHoldingRef.current = false;
                    if (onStopListening && onVoiceSend) {
                      const text = onStopListening();
                      if (text) onVoiceSend(text);
                    }
                  }
                }}
                onTouchStart={handleMicDown}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleMicUp();
                }}
                disabled={!canSend}
                className={cn(
                  "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-oma-lg transition-all duration-300",
                  isListening
                    ? "scale-110"
                    : "hover:scale-105",
                  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100",
                )}
                style={isListening ? {
                  backgroundColor: `rgba(${glowRgb}, 0.2)`,
                  color: `rgb(${glowRgb})`,
                  animation: "voice-glow-breathe 1.5s ease-in-out infinite",
                  "--voice-color": `rgba(${glowRgb}, 0.3)`,
                } as React.CSSProperties : {
                  color: `rgba(${glowRgb}, 0.6)`,
                }}
                aria-label={isListening ? "Stop listening" : "Start listening"}
                title="Hold to talk, tap to toggle"
              >
                <Mic className={cn("h-5 w-5", !isListening && "opacity-70")} />
              </button>
            </div>
          )}

          {/* Send button */}
          <button
            onClick={onSend}
            disabled={!canSend || !input.trim()}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-oma-lg transition-all",
              isWorkMode
                ? "glass bg-oma-jade/10 text-oma-jade hover:scale-105"
                : "glass-primary text-oma-primary hover:scale-105",
              "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100",
            )}
            aria-label="Send message"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path
                d="M14.5 1.5L7 9M14.5 1.5L10 14.5L7 9M14.5 1.5L1.5 6L7 9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
