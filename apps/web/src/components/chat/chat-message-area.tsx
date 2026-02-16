"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ROLE_PALETTE, WELCOME_GLOW, formatTimestamp } from "@/lib/chat-constants";
import type { AgentInfo } from "@/lib/chat-constants";
import { Streamdown } from "streamdown";
import { QuizTopicPrompt } from "@/components/quiz/quiz-topic-prompt";
import { QuizQuestionCard } from "@/components/quiz/quiz-question-card";
import { QuizAnswerResult } from "@/components/quiz/quiz-answer-result";
import { QuizResults } from "@/components/quiz/quiz-results";
import { VoiceBlob } from "@/components/chat/voice-blob";
import type { AgentMessage, QuizMetadata } from "@omakase/db";

// ---------------------------------------------------------------------------
// ChatMessageArea — scrollable message list with streaming + thinking
// ---------------------------------------------------------------------------

interface ChatMessageAreaProps {
  messages: AgentMessage[];
  streamingContent: string;
  isThinking: boolean;
  isWorkMode: boolean;
  agent: AgentInfo;
  showWelcome: boolean;
  isScrolledUp: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  onScrollToBottom: () => void;
  onQuizTopicSelect: (topic: string, gameId: string) => void;
  onQuizAnswer: (answerIndex: number, gameId: string) => void;
  onPlayAgain: () => void;
  /** Slot for welcome overlay rendered above the messages */
  welcomeOverlay?: React.ReactNode;
  /** Whether TTS is currently speaking an agent response */
  isSpeaking?: boolean;
  /** Called to stop TTS playback */
  onStopSpeaking?: () => void;
}

export function ChatMessageArea({
  messages,
  streamingContent,
  isThinking,
  isWorkMode,
  agent,
  showWelcome,
  isScrolledUp,
  scrollRef,
  bottomRef,
  onScroll,
  onScrollToBottom,
  onQuizTopicSelect,
  onQuizAnswer,
  onPlayAgain,
  welcomeOverlay,
  isSpeaking = false,
  onStopSpeaking,
}: ChatMessageAreaProps) {
  const glowRgb = WELCOME_GLOW[agent.role];
  return (
    <>
      <div className="relative flex-1 overflow-hidden">
        {/* Welcome overlay slot */}
        {welcomeOverlay}

        {/* Voice blob overlay — shown during TTS playback */}
        <VoiceBlob
          active={isSpeaking}
          colorRgb={glowRgb}
          mascot={agent.mascot}
          onStop={onStopSpeaking}
          caption={
            streamingContent ||
            (isSpeaking
              ? messages.filter((m) => m.sender === "agent").at(-1)?.content
              : undefined)
          }
        />

        {/* Chat messages (scrollable) */}
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className={cn(
            "h-full space-y-2 overflow-y-auto px-3 py-3 transition-all duration-500 md:px-6 md:py-4",
            showWelcome && "opacity-0 pointer-events-none",
          )}
        >
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              agent={agent}
              onQuizTopicSelect={onQuizTopicSelect}
              onQuizAnswer={onQuizAnswer}
              onPlayAgain={onPlayAgain}
            />
          ))}

          {isThinking && <ThinkingIndicator agent={agent} isWorkMode={isWorkMode} />}

          {!isThinking && streamingContent && (
            <div className="group flex gap-3 py-2">
              <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-oma text-lg">
                {agent.mascot}
              </span>
              <div className="min-w-0 max-w-[88%]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-oma-text">{agent.name}</span>
                  {isSpeaking && <SpeakingIndicator role={agent.role} />}
                </div>
                <div className="mt-1 text-sm leading-relaxed text-oma-text">
                  <AgentContent content={streamingContent} mode="streaming" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {isScrolledUp && messages.length > 0 && (
        <div className="flex justify-center px-6 pb-2">
          <button
            onClick={onScrollToBottom}
            className="glass-primary rounded-oma-full px-4 py-1.5 text-xs font-medium text-oma-primary transition-all hover:scale-105"
          >
            New messages
          </button>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Thinking indicator
// ---------------------------------------------------------------------------

function ThinkingIndicator({ agent, isWorkMode }: { agent: AgentInfo; isWorkMode?: boolean }) {
  const palette = ROLE_PALETTE[agent.role];
  return (
    <div className="flex gap-3 py-2">
      <span className={cn(
        "mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-oma text-lg animate-[bounce_2s_ease-in-out_infinite]",
        palette.glow,
      )}>
        {agent.mascot}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-oma-text">{agent.name}</span>
          <span className="text-[11px] text-oma-text-subtle">{isWorkMode ? "is working" : "is thinking"}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className={cn("inline-block h-2 w-2 rounded-full opacity-60 animate-[pulse_1.4s_ease-in-out_infinite]", palette.dot)} />
          <span className={cn("inline-block h-2 w-2 rounded-full opacity-60 animate-[pulse_1.4s_ease-in-out_infinite]", palette.dot)} style={{ animationDelay: "0.2s" }} />
          <span className={cn("inline-block h-2 w-2 rounded-full opacity-60 animate-[pulse_1.4s_ease-in-out_infinite]", palette.dot)} style={{ animationDelay: "0.4s" }} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual message rendering
// ---------------------------------------------------------------------------

function ChatMessage({ message, agent, onQuizTopicSelect, onQuizAnswer, onPlayAgain }: {
  message: AgentMessage;
  agent: AgentInfo;
  onQuizTopicSelect?: (topic: string, gameId: string) => void;
  onQuizAnswer?: (answerIndex: number, gameId: string) => void;
  onPlayAgain?: () => void;
}) {
  if (message.type === "status") {
    return (
      <div className="flex justify-center py-3">
        <span className="rounded-oma-full bg-oma-bg-surface/50 px-4 py-1.5 text-xs font-medium text-oma-text-subtle">
          {message.content}
        </span>
      </div>
    );
  }

  if (message.type === "error") {
    return (
      <div className="my-2 rounded-oma-lg border-l-2 border-oma-error bg-oma-error/5 px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-medium text-oma-error">
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M6 3.5V6.5M6 8V8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          Error
        </div>
        <p className="mt-1.5 text-sm text-oma-text-muted">{message.content}</p>
      </div>
    );
  }

  const isAgent = message.sender === "agent";
  const isQuiz = message.type === "quiz";
  const quizMeta = message.metadata as QuizMetadata | undefined;

  if (isAgent) {
    return (
      <div className="group flex gap-3 py-2">
        <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-oma text-lg">
          {agent.mascot}
        </span>
        <div className={cn("min-w-0", isQuiz ? "max-w-full flex-1" : "max-w-[88%]")}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-oma-text">{agent.name}</span>
            {isQuiz && (
              <span className="rounded-oma-full bg-oma-bg-surface px-2 py-0.5 text-[10px] font-medium text-oma-text-subtle">
                Quiz
              </span>
            )}
            <span className="text-[11px] text-oma-text-faint opacity-0 transition-opacity group-hover:opacity-100">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
          {message.content && (
            <div className="mt-1 text-sm leading-relaxed text-oma-text">
              <AgentContent content={message.content} mode="static" />
            </div>
          )}
          {/* Quiz interactive components */}
          {isQuiz && quizMeta?.phase === "topic_prompt" && onQuizTopicSelect && (
            <QuizTopicPrompt
              role={agent.role}
              onSelectTopic={(topic) => onQuizTopicSelect(topic, quizMeta.gameId)}
            />
          )}
          {isQuiz && quizMeta?.phase === "question" && quizMeta.question && onQuizAnswer && (
            <QuizQuestionCard
              question={quizMeta.question}
              role={agent.role}
              onAnswer={(idx) => onQuizAnswer(idx, quizMeta.gameId)}
            />
          )}
          {isQuiz && quizMeta?.phase === "answer_result" && (
            <QuizAnswerResult metadata={quizMeta} role={agent.role} />
          )}
          {isQuiz && quizMeta?.phase === "complete" && (
            <QuizResults metadata={quizMeta} role={agent.role} onPlayAgain={onPlayAgain} />
          )}
        </div>
      </div>
    );
  }

  // Hide user quiz control messages (they're just answer indexes)
  if (isQuiz && message.sender === "user") {
    return null;
  }

  return (
    <div className="group flex justify-end gap-3 py-2">
      <div className="min-w-0 max-w-[88%]">
        <div className="flex items-center justify-end gap-2">
          <span className="text-[11px] text-oma-text-faint opacity-0 transition-opacity group-hover:opacity-100">
            {formatTimestamp(message.timestamp)}
          </span>
          <span className="text-xs font-semibold text-oma-text">You</span>
        </div>
        <div className="mt-1 rounded-oma-lg rounded-tr-sm glass-primary border border-oma-primary/20 px-4 py-3 text-sm leading-relaxed text-oma-text shadow-[0_0_12px_rgba(244,114,182,0.08)]">
          {message.content}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AgentContent — replaces long dash/bar lines with animated thinking verbs
// ---------------------------------------------------------------------------

/** Matches a line that is nothing but 3+ dash-like characters (and optional whitespace).
 *  Threshold of 3 catches markdown hr syntax (---) before Streamdown renders it as <hr>. */
const DASH_LINE_RE = /^[\s]*[-─━—–=~*_]{3,}[\s]*$/;

const THINKING_VERBS = [
  "Pondering",
  "Pontificating",
  "Ruminating",
  "Cogitating",
  "Musing",
  "Deliberating",
  "Contemplating",
  "Noodling",
  "Meditating",
  "Brainstorming",
  "Percolating",
  "Scheming",
  "Daydreaming",
  "Concocting",
  "Mulling",
  "Tinkering",
  "Brewing",
  "Channeling",
  "Deciphering",
  "Untangling",
  "Harmonizing",
  "Orchestrating",
  "Conjuring",
  "Manifesting",
  "Vibing",
];

function ThinkingPill() {
  const [verb, setVerb] = useState(() =>
    THINKING_VERBS[Math.floor(Math.random() * THINKING_VERBS.length)],
  );

  useEffect(() => {
    const id = setInterval(() => {
      setVerb(THINKING_VERBS[Math.floor(Math.random() * THINKING_VERBS.length)]);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="my-1 inline-flex items-center gap-2 rounded-oma-full bg-oma-bg-surface/60 px-3 py-1">
      <span className="flex items-center gap-[3px]">
        <span className="inline-block h-1 w-1 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-oma-text-subtle" />
        <span className="inline-block h-1 w-1 animate-[pulse_1.2s_ease-in-out_0.2s_infinite] rounded-full bg-oma-text-subtle" />
        <span className="inline-block h-1 w-1 animate-[pulse_1.2s_ease-in-out_0.4s_infinite] rounded-full bg-oma-text-subtle" />
      </span>
      <span className="text-xs italic text-oma-text-subtle transition-all duration-300">
        {verb}...
      </span>
    </span>
  );
}

/**
 * Renders agent message content, replacing lines of dashes (thinking bars)
 * with animated thinking pills. Non-dash segments render through Streamdown.
 * Also hides any <hr> elements that Streamdown produces from remaining
 * markdown hr patterns (---, ***, ___) via CSS.
 */
function AgentContent({ content, mode }: { content: string; mode: "static" | "streaming" }) {
  const lines = content.split("\n");
  const segments: { type: "text" | "thinking"; text: string }[] = [];
  let textBuf: string[] = [];

  const flushText = () => {
    if (textBuf.length > 0) {
      segments.push({ type: "text", text: textBuf.join("\n") });
      textBuf = [];
    }
  };

  for (const line of lines) {
    if (DASH_LINE_RE.test(line)) {
      flushText();
      // Collapse consecutive dash lines into one pill
      if (segments.length === 0 || segments[segments.length - 1].type !== "thinking") {
        segments.push({ type: "thinking", text: "" });
      }
    } else {
      textBuf.push(line);
    }
  }
  flushText();

  // If no thinking segments found, fast-path to plain Streamdown
  // Still wrap in agent-content to catch any <hr> Streamdown generates
  if (segments.every((s) => s.type === "text")) {
    return (
      <div className="agent-content">
        <Streamdown mode={mode} isAnimating={mode === "streaming"}>
          {content}
        </Streamdown>
      </div>
    );
  }

  return (
    <div className="agent-content">
      {segments.map((seg, i) =>
        seg.type === "thinking" ? (
          <ThinkingPill key={`t-${i}`} />
        ) : (
          <Streamdown key={`s-${i}`} mode={mode} isAnimating={mode === "streaming"}>
            {seg.text}
          </Streamdown>
        ),
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Speaking indicator — sound wave bars shown during TTS playback
// ---------------------------------------------------------------------------

function SpeakingIndicator({ role }: { role: import("@omakase/db").AgentRunRole }) {
  const glowRgb = WELCOME_GLOW[role];
  return (
    <div className="flex items-center gap-[2px] px-1" title="Speaking...">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="inline-block w-[2px] rounded-full origin-bottom"
          style={{
            backgroundColor: `rgba(${glowRgb}, 0.7)`,
            height: "10px",
            animation: `voice-bar 0.6s ease-in-out ${i * 0.1}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
