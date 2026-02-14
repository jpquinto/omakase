"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentMessage } from "@omakase/db";
import { apiFetch } from "@/lib/api-client";

const API_BASE_URL = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL ?? "http://localhost:8080";

interface UseAgentChatResult {
  messages: AgentMessage[];
  sendMessage: (content: string) => Promise<void>;
  error: Error | null;
  isConnected: boolean;
}

export function useAgentChat(runId: string | null): UseAgentChatResult {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastTimestampRef = useRef<string>("");

  useEffect(() => {
    if (!runId) {
      setMessages([]);
      setIsConnected(false);
      return;
    }

    const url = `${API_BASE_URL}/api/agent-runs/${runId}/messages/stream`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    es.onmessage = (event) => {
      const msg = JSON.parse(event.data) as AgentMessage;
      lastTimestampRef.current = msg.timestamp;
      setMessages((prev) => {
        // Deduplicate by id (handles optimistic + SSE overlap)
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    es.addEventListener("close", () => {
      setIsConnected(false);
      es.close();
    });

    es.onerror = () => {
      setIsConnected(false);
      setError(new Error("Connection lost. Reconnecting..."));
      // EventSource auto-reconnects; the browser handles this.
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [runId]);

  // Reset messages when runId changes
  useEffect(() => {
    setMessages([]);
    lastTimestampRef.current = "";
  }, [runId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!runId) return;

      // Optimistic insert
      const optimisticMsg: AgentMessage = {
        id: `optimistic-${Date.now()}`,
        runId,
        featureId: "",
        projectId: "",
        sender: "user",
        role: null,
        content,
        type: "message",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      try {
        const created = await apiFetch<AgentMessage>(
          `/api/agent-runs/${runId}/messages`,
          {
            method: "POST",
            body: JSON.stringify({ content, sender: "user" }),
          },
        );
        // Replace optimistic message with the real one
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMsg.id ? created : m)),
        );
      } catch (err) {
        // Roll back optimistic insert
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [runId],
  );

  return { messages, sendMessage, error, isConnected };
}
