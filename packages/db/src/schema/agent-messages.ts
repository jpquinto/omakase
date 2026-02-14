import type { AgentRunRole } from "./agent-runs.js";

export type AgentMessageSender = "user" | "agent";
export type AgentMessageType = "message" | "status" | "error";

export interface AgentMessage {
  id: string;
  runId: string;
  featureId: string;
  projectId: string;
  sender: AgentMessageSender;
  role: AgentRunRole | null;
  content: string;
  type: AgentMessageType;
  timestamp: string;
}

export type NewAgentMessage = Omit<AgentMessage, "id" | "timestamp"> & {
  id?: string;
  timestamp?: string;
};
