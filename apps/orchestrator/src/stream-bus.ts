/**
 * stream-bus.ts -- In-memory pub/sub for real-time token streaming.
 *
 * Bridges the agent-responder (which streams tokens from Claude) with
 * the SSE endpoint (which pushes events to the browser). Keyed by runId.
 */

type StreamEvent =
  | { type: "thinking_start" }
  | { type: "token"; token: string }
  | { type: "thinking_end" }
  | { type: "stream_error"; error: string };

type Listener = (event: StreamEvent) => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribe(runId: string, listener: Listener): () => void {
  if (!listeners.has(runId)) {
    listeners.set(runId, new Set());
  }
  listeners.get(runId)!.add(listener);

  return () => {
    const set = listeners.get(runId);
    if (set) {
      set.delete(listener);
      if (set.size === 0) listeners.delete(runId);
    }
  };
}

export function emit(runId: string, event: StreamEvent): void {
  const set = listeners.get(runId);
  if (set) {
    for (const listener of set) {
      listener(event);
    }
  }
}

export type { StreamEvent };
