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

export function useAgentChat(runId: string | null, options?: UseAgentChatOptions): UseAgentChatResult {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [workSessionRunId, setWorkSessionRunId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastTimestampRef = useRef<string>("");
  const hasConnectedRef = useRef(false);

  const threadId = options?.threadId;
  const mode = options?.mode ?? "chat";
  const agentName = options?.agentName;
  const projectId = options?.projectId;

  // The effective runId: for work mode, use the work session runId; for chat mode, use the passed runId
  const effectiveRunId = mode === "work" ? workSessionRunId : runId;

  // Connect to SSE stream when we have an effective runId
  useEffect(() => {
    hasConnectedRef.current = false;
    if (!effectiveRunId) {
      setIsConnected(false);
      setIsThinking(false);
      setStreamingContent("");
      return;
    }

    let url = `${API_BASE_URL}/api/agent-runs/${effectiveRunId}/messages/stream`;
    if (threadId) {
      url += `?threadId=${threadId}`;
    }
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      hasConnectedRef.current = true;
      setIsConnected(true);
      setError(null);
    };

    es.onmessage = (event) => {
      const msg = JSON.parse(event.data) as AgentMessage;
      lastTimestampRef.current = msg.timestamp;
      setIsThinking(false);
      setStreamingContent("");
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    es.addEventListener("thinking_start", () => {
      setIsThinking(true);
      setStreamingContent("");
    });

    es.addEventListener("token", (event) => {
      const { token } = JSON.parse(event.data) as { token: string };
      setIsThinking(false);
      setStreamingContent((prev) => prev + token);
    });

    es.addEventListener("thinking_end", () => {
      setIsThinking(false);
    });

    es.addEventListener("stream_error", (event) => {
      const { error: errMsg } = JSON.parse(event.data) as { error: string };
      setError(new Error(errMsg));
      setIsThinking(false);
      setStreamingContent("");
    });

    es.addEventListener("close", () => {
      setIsConnected(false);
      es.close();
    });

    es.onerror = () => {
      setIsConnected(false);
      // Only show error if we previously had a successful connection
      if (hasConnectedRef.current) {
        setError(new Error("Connection lost. Reconnecting..."));
      }
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      hasConnectedRef.current = false;
      setIsConnected(false);
    };
  }, [effectiveRunId, threadId]);

  // Reset messages when runId or threadId changes
  useEffect(() => {
    setMessages([]);
    lastTimestampRef.current = "";
    setStreamingContent("");
    setIsThinking(false);
  }, [effectiveRunId, threadId]);

  const sendMessage = useCallback(
    async (content: string, options?: SendMessageOptions): Promise<{ createdThreadId?: string }> => {
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
              ...(options?.type ? { type: options.type } : {}),
              ...(options?.metadata ? { metadata: options.metadata } : {}),
            }),
          },
        );
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMsg.id ? response : m)),
        );
        return { createdThreadId: response.createdThread?.threadId };
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        setError(err instanceof Error ? err : new Error(String(err)));
        return {};
      }
    },
    [runId, threadId, mode, agentName, projectId, workSessionRunId],
  );

  const endWorkSession = useCallback(async () => {
    if (!workSessionRunId) return;
    try {
      await apiFetch(`/api/work-sessions/${workSessionRunId}`, { method: "DELETE" });
      setWorkSessionRunId(null);
      setIsConnected(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [workSessionRunId]);

  return { messages, sendMessage, error, isConnected, isThinking, streamingContent, workSessionRunId, endWorkSession };
}
