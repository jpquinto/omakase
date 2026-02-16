export type AgentLiveStatusState = "idle" | "working" | "errored";

export type AgentName = "miso" | "nori" | "koji" | "toro";

/** Peek at the next job waiting in this agent's queue. */
export interface AgentQueuePreview {
  jobId: string;
  prompt: string;
  queuedAt: string;
}

export interface AgentLiveStatusIdle {
  status: "idle";
  queueDepth?: number;
  nextJob?: AgentQueuePreview;
}

export interface AgentLiveStatusWorking {
  status: "working";
  runId: string;
  threadId: string;
  projectId: string;
  startedAt: string;
  currentTask: string;
  queueDepth?: number;
  nextJob?: AgentQueuePreview;
}

export interface AgentLiveStatusErrored {
  status: "errored";
  lastError: string;
  lastRunId: string;
  erroredAt: string;
  queueDepth?: number;
  nextJob?: AgentQueuePreview;
}

export type AgentLiveStatus = AgentLiveStatusIdle | AgentLiveStatusWorking | AgentLiveStatusErrored;

export interface AllAgentStatuses {
  agents: Record<AgentName, AgentLiveStatus>;
}
