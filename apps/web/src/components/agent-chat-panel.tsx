"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAgentChat } from "@/hooks/use-agent-chat";
import { useAgentThreads } from "@/hooks/use-agent-threads";
import { useVoiceChat } from "@/hooks/use-voice-chat";
import { ThreadListSidebar } from "@/components/thread-list-sidebar";
import { ConversationModeSelector } from "@/components/conversation-mode-selector";
import { ChatMessageArea } from "@/components/chat/chat-message-area";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatHeader } from "@/components/chat/chat-header";
import { cn } from "@/lib/utils";
import {
  ROLE_PALETTE,
  ROLE_TO_AGENT,
  WELCOME_GREETINGS,
  WELCOME_SUGGESTIONS,
  WELCOME_GLOW,
} from "@/lib/chat-constants";
import type { AgentInfo } from "@/lib/chat-constants";
import type { AgentRunRole, AgentThreadMode } from "@omakase/db";

// ---------------------------------------------------------------------------
// Agent Chat Panel — Chat interface with thread history sidebar
// ---------------------------------------------------------------------------

interface AgentChatPanelProps {
  runId: string;
  agent: AgentInfo;
  featureName: string;
  projectId: string | null;
  isActive: boolean;
  onClose: () => void;
  initialThreadId?: string;
}

export function AgentChatPanel({ runId, agent, featureName: _featureName, projectId, isActive, onClose, initialThreadId }: AgentChatPanelProps) {
  const router = useRouter();
  const agentName = ROLE_TO_AGENT[agent.role] ?? agent.role;
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(initialThreadId ?? null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [pendingMode, setPendingMode] = useState<AgentThreadMode>("chat");
  const titleInputRef = useRef<HTMLInputElement>(null);

  const { threads, updateThread, refetch: refetchThreads, hasMore, loadMore } = useAgentThreads(agentName, projectId);

  // Resolve selected thread object early for mode detection
  const selectedThread = threads.find((t) => t.threadId === selectedThreadId);
  const currentMode: AgentThreadMode = selectedThread?.mode ?? pendingMode;

  const { messages, sendMessage, error, isConnected, isThinking, streamingContent, workSessionRunId, endWorkSession } = useAgentChat(
    runId,
    {
      threadId: selectedThreadId ?? undefined,
      mode: currentMode,
      agentName,
      projectId: projectId ?? undefined,
    },
  );

  // Voice chat
  const voice = useVoiceChat({ role: agent.role });
  const prevStreamContentRef = useRef("");

  // When TTS mode is toggled on, sync the ref to current content
  // so we don't read back everything that's already been streamed
  const prevTalkModeRef = useRef(voice.isTalkMode);
  useEffect(() => {
    if (voice.isTalkMode && !prevTalkModeRef.current) {
      prevStreamContentRef.current = streamingContent;
    }
    prevTalkModeRef.current = voice.isTalkMode;
  }, [voice.isTalkMode, streamingContent]);

  // Feed streaming tokens to TTS when talk mode is active
  useEffect(() => {
    if (!voice.isTalkMode || !streamingContent) return;
    const prev = prevStreamContentRef.current;
    if (streamingContent.length > prev.length) {
      const newTokens = streamingContent.slice(prev.length);
      voice.feedStreamingToken(newTokens);
    }
    prevStreamContentRef.current = streamingContent;
  }, [streamingContent, voice.isTalkMode, voice.feedStreamingToken]);

  // Flush TTS buffer when streaming completes
  useEffect(() => {
    if (voice.isTalkMode && prevStreamContentRef.current && !streamingContent && !isThinking) {
      voice.flushSpeechBuffer();
      prevStreamContentRef.current = "";
    }
  }, [streamingContent, isThinking, voice.isTalkMode, voice.flushSpeechBuffer]);

  // Stop TTS on thread change or unmount
  useEffect(() => {
    prevStreamContentRef.current = "";
    voice.stopSpeaking();
  }, [selectedThreadId]); // voice is stable ref

  const [input, setInput] = useState("");
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [gameMenuOpen, setGameMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(0);
  const prevStreamLen = useRef(0);

  // Welcome screen state (declared before auto-select so it's available)
  // Show welcome by default when opening without a specific thread
  const [pendingNewConversation, setPendingNewConversation] = useState(!initialThreadId);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [welcomeMounted, setWelcomeMounted] = useState(false);
  const welcomeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Deferred thread selection: when a thread is auto-created on first message,
  // we wait until the agent finishes streaming before switching threadId.
  // Switching immediately would cause the SSE to reconnect and lose the stream.
  const deferredThreadIdRef = useRef<string | null>(null);
  const streamStartedRef = useRef(false);

  // Track when streaming starts so we know to wait for it to finish
  useEffect(() => {
    if (isThinking || streamingContent) {
      streamStartedRef.current = true;
    }
  }, [isThinking, streamingContent]);

  // Apply deferred thread ID once the agent response completes (or after timeout)
  const deferredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyDeferredThread = useCallback(() => {
    if (!deferredThreadIdRef.current) return;
    const id = deferredThreadIdRef.current;
    deferredThreadIdRef.current = null;
    streamStartedRef.current = false;
    if (deferredTimerRef.current) { clearTimeout(deferredTimerRef.current); deferredTimerRef.current = null; }
    setSelectedThreadId(id);
    refetchThreads();
  }, [refetchThreads]);

  useEffect(() => {
    if (!deferredThreadIdRef.current) return;

    // Fallback: if streaming never starts within 10s, apply anyway
    if (deferredTimerRef.current) clearTimeout(deferredTimerRef.current);
    deferredTimerRef.current = setTimeout(applyDeferredThread, 10000);

    // If streaming started and finished, apply now
    if (streamStartedRef.current && !isThinking && !streamingContent) {
      applyDeferredThread();
    }

    return () => { if (deferredTimerRef.current) { clearTimeout(deferredTimerRef.current); deferredTimerRef.current = null; } };
  }, [isThinking, streamingContent, applyDeferredThread]);

  // Auto-select: initial thread, or most recent existing thread, or stay on welcome
  useEffect(() => {
    if (initialThreadId) {
      setSelectedThreadId(initialThreadId);
      setPendingNewConversation(false);
    } else if (threads.length > 0 && !selectedThreadId && !pendingNewConversation) {
      setSelectedThreadId(threads[0].threadId);
    }
  }, [threads, selectedThreadId, initialThreadId, pendingNewConversation]);

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
  // Show welcome for: pending new conversation, no conversations at all, or viewing an empty new thread
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
      // Defer thread switch until streaming finishes to avoid breaking SSE
      deferredThreadIdRef.current = result.createdThreadId;
    }
  };

  const handleVoiceSend = async (text: string) => {
    setWelcomeDismissed(true);
    setPendingNewConversation(false);
    const result = await sendMessage(text);
    if (result.createdThreadId) {
      deferredThreadIdRef.current = result.createdThreadId;
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
      deferredThreadIdRef.current = result.createdThreadId;
    }
  };

  const handleQuizTopicSelect = async (topic: string, gameId: string) => {
    const result = await sendMessage(topic, {
      type: "quiz",
      metadata: { phase: "question", gameId, topic },
    });
    if (result.createdThreadId) {
      deferredThreadIdRef.current = result.createdThreadId;
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
      // Defer thread switch until streaming finishes to avoid breaking SSE
      deferredThreadIdRef.current = result.createdThreadId;
    }
  };

  const handleCreateThread = () => {
    // Don't create a DB record yet — just show the welcome screen.
    // The thread will be auto-created server-side when the first message is sent.
    setSelectedThreadId(null);
    setPendingNewConversation(true);
    setWelcomeDismissed(false);
  };

  const handleRenameThread = async (threadId: string, newTitle: string) => {
    await updateThread(threadId, { title: newTitle });
  };

  const handleArchiveThread = async (threadId: string) => {
    await updateThread(threadId, { status: "archived" });
    if (selectedThreadId === threadId) {
      const remaining = threads.filter((t) => t.threadId !== threadId);
      setSelectedThreadId(remaining.length > 0 ? remaining[0].threadId : null);
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

  const palette = ROLE_PALETTE[agent.role];
  const isWorkMode = currentMode === "work";
  const hasActiveWorkSession = isWorkMode && !!workSessionRunId;
  const hasMessages = messages.length > 0 || isThinking || streamingContent.length > 0;
  const isChatRunId = runId.startsWith("chat-");
  const canSend = isActive || isWorkMode || hasActiveWorkSession || isChatRunId;

  const fullscreenHref = `/agents/${agentName}/chat${selectedThreadId ? `?thread=${selectedThreadId}` : ""}`;

  return (
    <div className="flex h-full w-full">
      {/* Thread sidebar */}
      <div className={cn("shrink-0", sidebarCollapsed ? "w-12" : "w-[260px]")}>
        <ThreadListSidebar
          threads={threads}
          selectedThreadId={selectedThreadId}
          onSelectThread={setSelectedThreadId}
          onCreateThread={handleCreateThread}
          onRenameThread={handleRenameThread}
          onArchiveThread={handleArchiveThread}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          accentBorder={palette.border}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />
      </div>

      {/* Chat panel */}
      <div className="flex flex-1 flex-col">
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
          variant="modal"
          onClose={onClose}
          fullscreenHref={fullscreenHref}
          onNavigateFullscreen={() => {
            onClose();
            router.push(fullscreenHref);
          }}
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
          isSpeaking={voice.isSpeaking}
          onStopSpeaking={voice.stopSpeaking}
          welcomeOverlay={
            welcomeMounted ? (
              <ConversationWelcome
                agent={agent}
                palette={palette}
                onSendMessage={handleWelcomeSend}
                isExiting={!showWelcome}
                canSend={canSend}
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
          voiceSupported={voice.isSupported}
          isTalkMode={voice.isTalkMode}
          isListening={voice.isListening}
          isSpeaking={voice.isSpeaking}
          transcript={voice.transcript}
          voiceError={voice.error}
          onToggleTalkMode={voice.toggleTalkMode}
          onStartListening={voice.startListening}
          onStopListening={voice.stopListening}
          onStopSpeaking={voice.stopSpeaking}
          onVoiceSend={handleVoiceSend}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conversation Welcome Screen
// ---------------------------------------------------------------------------

function ConversationWelcome({
  agent,
  palette,
  onSendMessage,
  isExiting,
  canSend: _canSend,
  mode,
  onModeChange,
}: {
  agent: AgentInfo;
  palette: (typeof ROLE_PALETTE)[AgentRunRole];
  onSendMessage: (message: string) => void;
  isExiting: boolean;
  canSend: boolean;
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
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "420px",
          height: "420px",
          background: `radial-gradient(circle, rgba(${glowRgb}, 0.1) 0%, rgba(${glowRgb}, 0.03) 45%, transparent 70%)`,
          filter: "blur(50px)",
        }}
      />

      {/* Mascot */}
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

      {/* Greeting */}
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

      {/* Mode selector */}
      <div
        className="relative mb-6 animate-oma-fade-up opacity-0"
        style={{ animationDelay: "400ms", animationFillMode: "forwards" }}
      >
        <ConversationModeSelector mode={mode} onModeChange={onModeChange} />
      </div>

      {/* Centered input */}
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

      {/* Suggestion chips */}
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
