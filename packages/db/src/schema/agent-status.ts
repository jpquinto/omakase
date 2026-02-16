export type AgentLiveStatusState = "idle" | "working" | "errored";

export type AgentName = "miso" | "nori" | "koji" | "toro";

export interface AgentLiveStatusIdle {
  status: "idle";
}

export interface AgentLiveStatusWorking {
  status: "working";
  runId: string;
  threadId: string;
  projectId: string;
  startedAt: string;
  currentTask: string;
}

export interface AgentLiveStatusErrored {
  status: "errored";
  lastError: string;
  lastRunId: string;
  erroredAt: string;
}

export type AgentLiveStatus = AgentLiveStatusIdle | AgentLiveStatusWorking | AgentLiveStatusErrored;

export interface AllAgentStatuses {
  agents: Record<AgentName, AgentLiveStatus>;
}
