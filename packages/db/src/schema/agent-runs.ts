export type AgentRunRole = "architect" | "coder" | "reviewer" | "tester";
export type AgentRunStatus =
  | "started"
  | "thinking"
  | "coding"
  | "testing"
  | "reviewing"
  | "completed"
  | "failed";

export interface AgentRun {
  id: string;
  agentId: string;
  projectId: string;
  featureId: string;
  role: AgentRunRole;
  status: AgentRunStatus;
  output?: string;
  outputSummary?: string;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}

export type NewAgentRun = Omit<AgentRun, "id" | "startedAt" | "status"> & {
  id?: string;
  status?: AgentRunStatus;
  startedAt?: string;
};
