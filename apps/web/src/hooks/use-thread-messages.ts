"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { AgentMessage } from "@omakase/db";

interface UseThreadMessagesResult {
  messages: AgentMessage[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useThreadMessages(threadId: string | null): UseThreadMessagesResult {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!threadId) return;
    try {
      const result = await apiFetch<AgentMessage[]>(
        `/api/threads/${threadId}/messages`,
      );
      setMessages(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    if (!threadId) {
      setIsLoading(false);
      setMessages([]);
      return;
    }

    void fetchMessages();

    // Light polling for thread messages (not SSE, since thread view is for history)
    intervalRef.current = setInterval(() => {
      void fetchMessages();
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchMessages, threadId]);

  return { messages, isLoading, error, refetch: fetchMessages };
}
