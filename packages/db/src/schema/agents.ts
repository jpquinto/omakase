export type AgentRole = "architect" | "coder" | "reviewer" | "tester";
export type AgentStatus = "idle" | "running" | "stopped" | "failed";

export interface Agent {
  id: string;
  projectId: string;
  name: string;
  role: AgentRole;
  mascot?: string;
  status: AgentStatus;
  ecsTaskArn?: string;
  currentFeatureId?: string;
  createdAt: string;
  updatedAt: string;
}

export type NewAgent = Omit<Agent, "id" | "createdAt" | "updatedAt" | "status"> & {
  id?: string;
  status?: AgentStatus;
  createdAt?: string;
  updatedAt?: string;
};
