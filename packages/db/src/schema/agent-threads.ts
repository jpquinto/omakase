export type AgentThreadStatus = "active" | "archived";
export type AgentThreadMode = "chat" | "work";

export interface AgentThread {
  id: string;
  threadId: string;
  agentName: string;
  projectId: string;
  title: string;
  mode: AgentThreadMode;
  status: AgentThreadStatus;
  lastMessageAt: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export type NewAgentThread = Omit<AgentThread, "id" | "threadId" | "lastMessageAt" | "messageCount" | "createdAt" | "updatedAt">;
