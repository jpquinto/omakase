export interface AgentPersonality {
  agentName: string;
  displayName: string;
  persona: string;
  traits: string[];
  communicationStyle: string;
  updatedAt: string;
}

export type NewAgentPersonality = Omit<AgentPersonality, "updatedAt"> & {
  updatedAt?: string;
};
