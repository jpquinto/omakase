"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useAgentChat } from "@/hooks/use-agent-chat";
import { useAgentThreads } from "@/hooks/use-agent-threads";
import { ConversationModeSelector } from "@/components/conversation-mode-selector";
import { ChatMessageArea } from "@/components/chat/chat-message-area";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatHeader } from "@/components/chat/chat-header";
import { cn } from "@/lib/utils";
import {
  ROLE_PALETTE,
  WELCOME_GREETINGS,
  WELCOME_SUGGESTIONS,
  WELCOME_GLOW,
} from "@/lib/chat-constants";
import type { AgentInfo } from "@/lib/chat-constants";
import type { AgentRunRole, AgentThreadMode } from "@omakase/db";

// ---------------------------------------------------------------------------
// Agent metadata — maps URL name to display info
// ---------------------------------------------------------------------------

const AGENTS: Record<string, AgentInfo & { agentRole: AgentRunRole }> = {
  miso: { name: "Miso", mascot: "\uD83C\uDF5C", role: "architect", agentRole: "architect" },
  nori: { name: "Nori", mascot: "\uD83C\uDF59", role: "coder", agentRole: "coder" },
  koji: { name: "Koji", mascot: "\uD83C\uDF76", role: "reviewer", agentRole: "reviewer" },
  toro: { name: "Toro", mascot: "\uD83C\uDF63", role: "tester", agentRole: "tester" },
};

// ---------------------------------------------------------------------------
// Full-Screen Chat Page — /agents/[name]/chat
// ---------------------------------------------------------------------------

export default function AgentChatPage() {
  const params = useParams<{ name: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const name = params.name;
  const agentMeta = AGENTS[name];

  // Thread from URL search params
  const threadFromUrl = searchParams.get("thread");

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(threadFromUrl);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [pendingMode, setPendingMode] = useState<AgentThreadMode>("chat");
  const titleInputRef = useRef<HTMLInputElement>(null);

  const { threads, createThread, updateThread, refetch: refetchThreads, hasMore, loadMore } = useAgentThreads(name, null);

  // Resolve selected thread object
  const selectedThread = threads.find((t) => t.threadId === selectedThreadId);
  const currentMode: AgentThreadMode = selectedThread?.mode ?? pendingMode;

  const runId = `chat-${agentMeta?.agentRole ?? name}`;
  const { messages, sendMessage, error, isConnected, isThinking, streamingContent, workSessionRunId, endWorkSession } = useAgentChat(
    runId,
    {
      threadId: selectedThreadId ?? undefined,
      mode: currentMode,
      agentName: name,
    },
  );

  const [input, setInput] = useState("");
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [gameMenuOpen, setGameMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(0);
  const prevStreamLen = useRef(0);

  // Welcome screen state
  const [pendingNewConversation, setPendingNewConversation] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [welcomeMounted, setWelcomeMounted] = useState(false);
  const welcomeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync URL with selected thread
  const updateThreadUrl = useCallback((threadId: string | null) => {
    setSelectedThreadId(threadId);
    const url = threadId
      ? `/agents/${name}/chat?thread=${threadId}`
      : `/agents/${name}/chat`;
    router.replace(url, { scroll: false });
  }, [name, router]);

  // Sync from URL on param change
  useEffect(() => {
    if (threadFromUrl && threadFromUrl !== selectedThreadId) {
      setSelectedThreadId(threadFromUrl);
    }
  }, [threadFromUrl, selectedThreadId]);

  // Auto-select: most recent thread or stay on welcome
  useEffect(() => {
    if (threadFromUrl) return; // URL already specified
    if (threads.length > 0 && !selectedThreadId && !pendingNewConversation) {
      updateThreadUrl(threads[0].threadId);
    }
  }, [threads, selectedThreadId, threadFromUrl, pendingNewConversation, updateThreadUrl]);

  // Sync title value when thread changes
  useEffect(() => {
    if (selectedThread) {
      setTitleValue(selectedThread.title);
    }
  }, [selectedThread]);

  // Reset welcome state when thread changes
  useEffect(() => {
    setWelcomeDismissed(false);
  }, [selectedThreadId]);

  const isEmptyChat = messages.length === 0 && !isThinking && !streamingContent;
  const isNewThread = selectedThread != null && selectedThread.messageCount === 0;
  const hasNoConversations = threads.length === 0 && !selectedThreadId;
  const showWelcome = !welcomeDismissed && (pendingNewConversation || hasNoConversations || (isEmptyChat && isNewThread && !!selectedThreadId));

  // Mount/unmount welcome with exit animation delay
  useEffect(() => {
    if (showWelcome) {
      setWelcomeMounted(true);
      if (welcomeTimerRef.current) clearTimeout(welcomeTimerRef.current);
    } else if (welcomeMounted) {
      welcomeTimerRef.current = setTimeout(() => setWelcomeMounted(false), 750);
    }
    return () => { if (welcomeTimerRef.current) clearTimeout(welcomeTimerRef.current); };
  }, [showWelcome, welcomeMounted]);

  // Auto-scroll to bottom
  useEffect(() => {
    const hasNewMessage = messages.length > prevMessageCount.current;
    const hasNewStream = streamingContent.length > prevStreamLen.current;
    if ((hasNewMessage || hasNewStream) && !isScrolledUp) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCount.current = messages.length;
    prevStreamLen.current = streamingContent.length;
  }, [messages.length, streamingContent.length, isScrolledUp]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    setIsScrolledUp(!atBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setIsScrolledUp(false);
  }, []);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    const result = await sendMessage(trimmed);
    if (result.createdThreadId) {
      updateThreadUrl(result.createdThreadId);
      refetchThreads();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleLaunchQuiz = async () => {
    setGameMenuOpen(false);
    const gameId = `quiz-${Date.now()}`;
    const result = await sendMessage("Start a quiz game!", {
      type: "quiz",
      metadata: { phase: "topic_prompt", gameId },
    });
    if (result.createdThreadId) {
      updateThreadUrl(result.createdThreadId);
      refetchThreads();
    }
  };

  const handleQuizTopicSelect = async (topic: string, gameId: string) => {
    const result = await sendMessage(topic, {
      type: "quiz",
      metadata: { phase: "question", gameId, topic },
    });
    if (result.createdThreadId) {
      updateThreadUrl(result.createdThreadId);
      refetchThreads();
    }
  };

  const handleQuizAnswer = async (answerIndex: number, gameId: string) => {
    await sendMessage(`Answer: ${answerIndex}`, {
      type: "quiz",
      metadata: { phase: "answer_result", gameId, selectedAnswer: answerIndex },
    });
  };

  const handleWelcomeSend = async (text: string) => {
    setWelcomeDismissed(true);
    setPendingNewConversation(false);
    const result = await sendMessage(text);
    if (result.createdThreadId) {
      updateThreadUrl(result.createdThreadId);
      refetchThreads();
    }
  };

  const handleCreateThread = useCallback(async () => {
    try {
      const thread = await createThread(undefined, pendingMode);
      updateThreadUrl(thread.threadId);
      setPendingNewConversation(false);
      setWelcomeDismissed(false);
    } catch {
      setSelectedThreadId(null);
      setPendingNewConversation(true);
      setWelcomeDismissed(false);
    }
  }, [createThread, pendingMode, updateThreadUrl]);

  const handleRenameThread = async (threadId: string, newTitle: string) => {
    await updateThread(threadId, { title: newTitle });
  };

  const handleArchiveThread = async (threadId: string) => {
    await updateThread(threadId, { status: "archived" });
    if (selectedThreadId === threadId) {
      const remaining = threads.filter((t) => t.threadId !== threadId);
      updateThreadUrl(remaining.length > 0 ? remaining[0].threadId : null);
    }
  };

  // Inline title editing
  useEffect(() => {
    if (editingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [editingTitle]);

  const commitTitleRename = () => {
    setEditingTitle(false);
    const trimmed = titleValue.trim();
    if (trimmed && selectedThreadId && trimmed !== selectedThread?.title) {
      handleRenameThread(selectedThreadId, trimmed);
    }
  };

  if (!agentMeta) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-sm text-oma-text-muted">Agent not found</p>
      </div>
    );
  }

  const agent: AgentInfo = { name: agentMeta.name, mascot: agentMeta.mascot, role: agentMeta.role };
  const palette = ROLE_PALETTE[agent.role];
  const isWorkMode = currentMode === "work";
  const hasActiveWorkSession = isWorkMode && !!workSessionRunId;
  const hasMessages = messages.length > 0 || isThinking || streamingContent.length > 0;
  const canSend = true; // full-screen chat always allows sending (synthetic chat runId)

  return (
    <div className="-m-8 flex h-[calc(100vh-3.5rem)] flex-col">
      <ChatHeader
        agent={agent}
        isWorkMode={isWorkMode}
        isConnected={isConnected}
        hasMessages={hasMessages}
        selectedThread={selectedThread}
        editingTitle={editingTitle}
        titleValue={titleValue}
        titleInputRef={titleInputRef}
        onTitleChange={setTitleValue}
        onStartEditTitle={() => { setTitleValue(selectedThread?.title ?? ""); setEditingTitle(true); }}
        onCommitTitleRename={commitTitleRename}
        onCancelTitleRename={() => { setEditingTitle(false); setTitleValue(selectedThread?.title ?? ""); }}
        hasActiveWorkSession={hasActiveWorkSession}
        endWorkSession={endWorkSession}
        gameMenuOpen={gameMenuOpen}
        onToggleGameMenu={() => setGameMenuOpen(!gameMenuOpen)}
        onLaunchQuiz={handleLaunchQuiz}
        variant="fullscreen"
      />

      <ChatMessageArea
        messages={messages}
        streamingContent={streamingContent}
        isThinking={isThinking}
        isWorkMode={isWorkMode}
        agent={agent}
        showWelcome={showWelcome}
        isScrolledUp={isScrolledUp}
        scrollRef={scrollRef}
        bottomRef={bottomRef}
        onScroll={handleScroll}
        onScrollToBottom={scrollToBottom}
        onQuizTopicSelect={handleQuizTopicSelect}
        onQuizAnswer={handleQuizAnswer}
        onPlayAgain={handleLaunchQuiz}
        welcomeOverlay={
          welcomeMounted ? (
            <FullscreenWelcome
              agent={agent}
              palette={palette}
              onSendMessage={handleWelcomeSend}
              isExiting={!showWelcome}
              mode={pendingMode}
              onModeChange={setPendingMode}
            />
          ) : undefined
        }
      />

      <ChatInput
        input={input}
        setInput={setInput}
        onSend={handleSend}
        onKeyDown={handleKeyDown}
        canSend={canSend}
        isWorkMode={isWorkMode}
        agent={agent}
        hasActiveWorkSession={hasActiveWorkSession}
        showWelcome={showWelcome}
        hasMessages={hasMessages}
        error={error}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full-Screen Welcome (reuses the same design from agent-chat-panel)
// ---------------------------------------------------------------------------

function FullscreenWelcome({
  agent,
  palette,
  onSendMessage,
  isExiting,
  mode,
  onModeChange,
}: {
  agent: AgentInfo;
  palette: (typeof ROLE_PALETTE)[AgentRunRole];
  onSendMessage: (message: string) => void;
  isExiting: boolean;
  mode: AgentThreadMode;
  onModeChange: (mode: AgentThreadMode) => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = WELCOME_SUGGESTIONS[agent.role];
  const greeting = WELCOME_GREETINGS[agent.role];
  const glowRgb = WELCOME_GLOW[agent.role];

  useEffect(() => {
    if (!isExiting) {
      const t = setTimeout(() => inputRef.current?.focus(), 700);
      return () => clearTimeout(t);
    }
  }, [isExiting]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
  };

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex flex-col items-center justify-center px-8 transition-all duration-700 ease-out",
        isExiting
          ? "pointer-events-none -translate-y-6 scale-[0.97] opacity-0"
          : "translate-y-0 scale-100 opacity-100",
      )}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "420px",
          height: "420px",
          background: `radial-gradient(circle, rgba(${glowRgb}, 0.1) 0%, rgba(${glowRgb}, 0.03) 45%, transparent 70%)`,
          filter: "blur(50px)",
        }}
      />

      <div
        className="relative mb-6 animate-oma-fade-up opacity-0"
        style={{ animationDelay: "100ms", animationFillMode: "forwards" }}
      >
        <span
          className={cn(
            "inline-flex h-24 w-24 items-center justify-center rounded-full text-6xl",
            "animate-[oma-float_6s_ease-in-out_infinite]",
            palette.glow,
          )}
        >
          {agent.mascot}
        </span>
      </div>

      <h2
        className="relative mb-1 animate-oma-fade-up font-serif text-3xl font-semibold text-oma-text opacity-0"
        style={{ animationDelay: "220ms", animationFillMode: "forwards" }}
      >
        Hi there,
      </h2>
      <p
        className="relative mb-6 animate-oma-fade-up font-serif text-xl text-oma-text-muted opacity-0"
        style={{ animationDelay: "340ms", animationFillMode: "forwards" }}
      >
        {greeting}
      </p>

      <div
        className="relative mb-6 animate-oma-fade-up opacity-0"
        style={{ animationDelay: "400ms", animationFillMode: "forwards" }}
      >
        <ConversationModeSelector mode={mode} onModeChange={onModeChange} />
      </div>

      <div
        className="relative mb-6 w-full max-w-[520px] animate-oma-fade-up opacity-0"
        style={{ animationDelay: "520ms", animationFillMode: "forwards" }}
      >
        <div
          className={cn(
            "glass-lg flex items-center gap-3 rounded-oma-xl px-5 py-4",
            "transition-all duration-300",
            "focus-within:border-oma-glass-border-bright focus-within:shadow-oma",
          )}
        >
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Ask ${agent.name} anything...`}
            className={cn(
              "flex-1 bg-transparent text-base text-oma-text outline-none",
              "placeholder:text-oma-text-faint",
            )}
          />
          <button
            onClick={handleSend}
            disabled={!value.trim()}
            className={cn(
              "glass-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-oma-lg",
              "text-oma-primary transition-all duration-200 hover:scale-110",
              "disabled:opacity-30 disabled:hover:scale-100",
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

      <div
        className="relative flex flex-wrap justify-center gap-2.5 animate-oma-fade-up opacity-0"
        style={{ animationDelay: "660ms", animationFillMode: "forwards" }}
      >
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSendMessage(suggestion)}
            className={cn(
              "glass rounded-oma-full px-4 py-2.5 text-sm text-oma-text-muted",
              "transition-all duration-300",
              "hover:-translate-y-0.5 hover:text-oma-text hover:border-oma-glass-border-bright hover:shadow-oma-sm",
            )}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
