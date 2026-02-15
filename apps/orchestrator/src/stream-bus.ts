/**
 * stream-bus.ts -- In-memory pub/sub for real-time token streaming.
 *
 * Bridges the agent-responder (which streams tokens from Claude) with
 * the SSE endpoint (which pushes events to the browser). Keyed by runId.
 *
 * Events are buffered so late-connecting SSE clients receive everything
 * that was emitted before they subscribed.
 */

type StreamEvent =
  | { type: "thinking_start" }
  | { type: "token"; token: string }
  | { type: "thinking_end" }
  | { type: "stream_error"; error: string };

type Listener = (event: StreamEvent) => void;

const listeners = new Map<string, Set<Listener>>();

/** Buffer of events per runId. Replayed to new subscribers. */
const eventBuffers = new Map<string, StreamEvent[]>();

/** Auto-clean buffers after 5 minutes of no new events */
const bufferTimers = new Map<string, ReturnType<typeof setTimeout>>();

const BUFFER_TTL_MS = 5 * 60 * 1000;

export function subscribe(runId: string, listener: Listener): () => void {
  if (!listeners.has(runId)) {
    listeners.set(runId, new Set());
  }
  listeners.get(runId)!.add(listener);
  const count = listeners.get(runId)!.size;
  console.log(`[stream-bus] subscribe runId=${runId} listeners=${count}`);

  // Replay buffered events to the new subscriber
  const buffer = eventBuffers.get(runId);
  if (buffer && buffer.length > 0) {
    console.log(`[stream-bus] replaying ${buffer.length} buffered events to new subscriber`);
    for (const event of buffer) {
      listener(event);
    }
  }

  return () => {
    const set = listeners.get(runId);
    if (set) {
      set.delete(listener);
      console.log(`[stream-bus] unsubscribe runId=${runId} remaining=${set.size}`);
      if (set.size === 0) listeners.delete(runId);
    }
  };
}

export function emit(runId: string, event: StreamEvent): void {
  // Reset the auto-clean timer
  const existingTimer = bufferTimers.get(runId);
  if (existingTimer) clearTimeout(existingTimer);
  bufferTimers.set(runId, setTimeout(() => {
    eventBuffers.delete(runId);
    bufferTimers.delete(runId);
    console.log(`[stream-bus] buffer expired for runId=${runId}`);
  }, BUFFER_TTL_MS));

  // When a new turn starts, clear the previous turn's buffer
  // so we don't replay stale content from a prior response.
  if (event.type === "thinking_start") {
    eventBuffers.set(runId, []);
  }

  // Add event to buffer
  if (!eventBuffers.has(runId)) {
    eventBuffers.set(runId, []);
  }
  eventBuffers.get(runId)!.push(event);

  // Log
  const set = listeners.get(runId);
  const count = set?.size ?? 0;
  if (event.type === "token") {
    const preview = event.token.slice(0, 80).replace(/\n/g, "\\n");
    console.log(`[stream-bus] emit runId=${runId} type=token listeners=${count} preview="${preview}"`);
  } else {
    console.log(`[stream-bus] emit runId=${runId} type=${event.type} listeners=${count}`);
  }

  // Dispatch to live listeners
  if (set) {
    for (const listener of set) {
      listener(event);
    }
  }
}

export type { StreamEvent };
