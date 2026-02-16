import type { AgentName } from "./agent-status.js";

export type QueuedJobStatus = "queued" | "processing" | "completed" | "failed";

export interface QueuedJob {
  jobId: string;
  agentName: AgentName;
  projectId: string;
  featureId?: string;
  prompt: string;
  threadId?: string;
  status: QueuedJobStatus;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  queuedBy: "user" | "auto";
  position: number;
}

export type AgentDispatchResult =
  | { queued: false; runId: string; threadId: string; status: string }
  | { queued: true; position: number; jobId: string };
