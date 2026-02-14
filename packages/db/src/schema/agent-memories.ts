export type AgentMemorySource = "extraction" | "manual" | "system";

export interface AgentMemory {
  id: string;
  agentName: string;
  projectId: string;
  content: string;
  source: AgentMemorySource;
  createdAt: string;
}

export type NewAgentMemory = Omit<AgentMemory, "id" | "createdAt"> & {
  id?: string;
  createdAt?: string;
};
