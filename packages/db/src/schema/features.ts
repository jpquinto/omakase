export type FeatureStatus = "pending" | "in_progress" | "passing" | "failing";

export interface Feature {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  priority: number;
  category?: string;
  status: FeatureStatus;
  steps?: string;
  dependencies: string[];
  assignedAgentId?: string;
  linearIssueId?: string;
  linearIssueUrl?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type NewFeature = Omit<Feature, "id" | "createdAt" | "updatedAt" | "status" | "dependencies"> & {
  id?: string;
  status?: FeatureStatus;
  dependencies?: string[];
  createdAt?: string;
  updatedAt?: string;
};
