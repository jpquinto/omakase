"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentMessage, AgentMessageType, AgentThreadMode, QuizMetadata } from "@omakase/db";
import { apiFetch } from "@/lib/api-client";

const API_BASE_URL = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL ?? "http://localhost:8080";

interface UseAgentChatOptions {
  threadId?: string;
  mode?: AgentThreadMode;
  agentName?: string;
  projectId?: string;
}

interface SendMessageOptions {
  type?: AgentMessageType;
  metadata?: QuizMetadata;
}

interface UseAgentChatResult {
  messages: AgentMessage[];
  sendMessage: (content: string, options?: SendMessageOptions) => Promise<{ createdThreadId?: string }>;
  error: Error | null;
  isConnected: boolean;
  isThinking: boolean;
  streamingContent: string;
  workSessionRunId: string | null;
  endWorkSession: () => Promise<void>;
}

/**
 * Opens an SSE stream and returns a cleanup function.
 * The stream is meant to be short-lived — opened after sending a message
 * and closed once the assistant finishes responding.
 */
function openStream(
  url: string,
  callbacks: {
    onMessage: (msg: AgentMessage) => void;
    onThinkingStart: () => void;
    onToken: (token: string) => void;
    onThinkingEnd: () => void;
    onError: (err: string) => void;
    onClose: () => void;
  },
): () => void {
  const es = new EventSource(url);

  es.onmessage = (event) => {
    const msg = JSON.parse(event.data) as AgentMessage;
    callbacks.onMessage(msg);
  };

  es.addEventListener("thinking_start", () => callbacks.onThinkingStart());

  es.addEventListener("token", (event) => {
    const { token } = JSON.parse(event.data) as { token: string };
    callbacks.onToken(token);
  });

  es.addEventListener("thinking_end", () => callbacks.onThinkingEnd());

  es.addEventListener("stream_error", (event) => {
    const { error: errMsg } = JSON.parse(event.data) as { error: string };
    callbacks.onError(errMsg);
    es.close();
    callbacks.onClose();
  });

  es.addEventListener("close", () => {
    es.close();
    callbacks.onClose();
  });

  es.onerror = () => {
    // SSE errors during a stream likely mean the connection dropped.
    // Don't auto-reconnect — the stream is transient. Just close.
    es.close();
    callbacks.onClose();
  };

  return () => {
    es.close();
  };
}

export function useAgentChat(runId: string | null, options?: UseAgentChatOptions): UseAgentChatResult {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [workSessionRunId, setWorkSessionRunId] = useState<string | null>(null);
  const closeStreamRef = useRef<(() => void) | null>(null);
  // When sendMessage creates a new thread and starts streaming, we set this
  // flag so the threadId useEffect doesn't kill the active stream.
  const skipNextResetRef = useRef(false);

  const threadId = options?.threadId;
  const mode = options?.mode ?? "chat";
  const agentName = options?.agentName;
  const projectId = options?.projectId;

  // Fetch existing messages when threadId changes
  useEffect(() => {
    // If sendMessage just started a stream for this threadId, don't reset
    if (skipNextResetRef.current) {
      skipNextResetRef.current = false;
      return;
    }

    setMessages([]);
    setStreamingContent("");
    setIsThinking(false);
    setError(null);
    closeStreamRef.current?.();

    if (!threadId) return;

    let cancelled = false;
    (async () => {
      try {
        const existing = await apiFetch<AgentMessage[]>(
          `/api/threads/${threadId}/messages`,
        );
        if (!cancelled) {
          setMessages(existing);
        }
      } catch {
        // Thread may be new with no messages — that's fine
      }
    })();

    return () => { cancelled = true; };
  }, [threadId]);

  /** Open an SSE stream to listen for the assistant's response */
  const startListening = useCallback((activeRunId: string, activeThreadId?: string) => {
    // Close any existing stream
    closeStreamRef.current?.();

    let url = `${API_BASE_URL}/api/agent-runs/${activeRunId}/messages/stream`;
    if (activeThreadId) {
      url += `?threadId=${activeThreadId}`;
    }

    setIsConnected(true);
    setIsThinking(true);
    setStreamingContent("");

    closeStreamRef.current = openStream(url, {
      onMessage: (msg) => {
        setIsThinking(false);
        setStreamingContent("");
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      },
      onThinkingStart: () => {
        setIsThinking(true);
        setStreamingContent("");
      },
      onToken: (token) => {
        setIsThinking(false);
        setStreamingContent((prev) => prev + token);
      },
      onThinkingEnd: () => {
        setIsThinking(false);
      },
      onError: (errMsg) => {
        setError(new Error(errMsg));
        setIsThinking(false);
        setStreamingContent("");
      },
      onClose: () => {
        setIsConnected(false);
        setIsThinking(false);
        setStreamingContent("");
        closeStreamRef.current = null;
      },
    });
  }, []);

  const sendMessage = useCallback(
    async (content: string, sendOpts?: SendMessageOptions): Promise<{ createdThreadId?: string }> => {
      // For work mode: start a work session on first message if none exists
      if (mode === "work" && !workSessionRunId) {
        if (!agentName || !projectId) {
          setError(new Error("Missing agentName or projectId for work session"));
          return {};
        }

        // Optimistic insert for user message
        const optimisticMsg: AgentMessage = {
          id: `optimistic-${Date.now()}`,
          runId: "pending",
          featureId: "",
          projectId: projectId ?? "",
          sender: "user",
          role: null,
          content,
          type: "message",
          threadId,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimisticMsg]);

        try {
          // Auto-create a thread if one doesn't exist yet
          let resolvedThreadId = threadId;
          if (!resolvedThreadId) {
            const thread = await apiFetch<{ threadId: string }>(
              `/api/agents/${agentName}/threads`,
              {
                method: "POST",
                body: JSON.stringify({ projectId, mode: "work" }),
              },
            );
            resolvedThreadId = thread.threadId;
          }

          // Start the work session — this spawns Claude Code and sends the first prompt
          const result = await apiFetch<{ runId: string; status: string }>(
            `/api/agents/${agentName}/work-sessions`,
            {
              method: "POST",
              body: JSON.stringify({ projectId, threadId: resolvedThreadId, prompt: content }),
            },
          );
          setWorkSessionRunId(result.runId);

          // Store the user message in DynamoDB via the messages endpoint
          const response = await apiFetch<AgentMessage & { createdThread?: { threadId: string } }>(
            `/api/agent-runs/${result.runId}/messages`,
            {
              method: "POST",
              body: JSON.stringify({ content, sender: "user", threadId: resolvedThreadId }),
            },
          );
          setMessages((prev) =>
            prev.map((m) => (m.id === optimisticMsg.id ? response : m)),
          );

          // Start listening for the assistant's response.
          // Set skip flag so the threadId useEffect doesn't kill this stream
          // when the caller updates the URL with the new threadId.
          skipNextResetRef.current = true;
          startListening(result.runId, resolvedThreadId);

          return { createdThreadId: resolvedThreadId };
        } catch (err) {
          setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
          setError(err instanceof Error ? err : new Error(String(err)));
          return {};
        }
      }

      // Normal message sending (chat mode or existing work session)
      const activeRunId = mode === "work" ? workSessionRunId : runId;
      if (!activeRunId) return {};

      const optimisticMsg: AgentMessage = {
        id: `optimistic-${Date.now()}`,
        runId: activeRunId,
        featureId: "",
        projectId: "",
        sender: "user",
        role: null,
        content,
        type: "message",
        threadId,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      try {
        const response = await apiFetch<AgentMessage & { createdThread?: { threadId: string } }>(
          `/api/agent-runs/${activeRunId}/messages`,
          {
            method: "POST",
            body: JSON.stringify({
              content,
              sender: "user",
              threadId,
              ...(sendOpts?.type ? { type: sendOpts.type } : {}),
              ...(sendOpts?.metadata ? { metadata: sendOpts.metadata } : {}),
            }),
          },
        );
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMsg.id ? response : m)),
        );

        // Start listening for the assistant's response
        const resolvedThreadId = response.createdThread?.threadId ?? threadId;
        if (resolvedThreadId && resolvedThreadId !== threadId) {
          skipNextResetRef.current = true;
        }
        startListening(activeRunId, resolvedThreadId);

        return { createdThreadId: response.createdThread?.threadId };
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        setError(err instanceof Error ? err : new Error(String(err)));
        return {};
      }
    },
    [runId, threadId, mode, agentName, projectId, workSessionRunId, startListening],
  );

  const endWorkSession = useCallback(async () => {
    if (!workSessionRunId) return;
    try {
      closeStreamRef.current?.();
      await apiFetch(`/api/work-sessions/${workSessionRunId}`, { method: "DELETE" });
      setWorkSessionRunId(null);
      setIsConnected(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [workSessionRunId]);

  return { messages, sendMessage, error, isConnected, isThinking, streamingContent, workSessionRunId, endWorkSession };
}
