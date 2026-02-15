export type ProjectStatus = "active" | "archived";

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  members: string[];
  repoUrl?: string;
  status: ProjectStatus;
  linearTeamId?: string;
  linearAccessToken?: string;
  linearProjectId?: string;
  linearProjectName?: string;
  githubInstallationId?: number;
  githubRepoOwner?: string;
  githubRepoName?: string;
  githubDefaultBranch?: string;
  maxConcurrency: number;
  createdAt: string;
  updatedAt: string;
}

export type NewProject = Omit<Project, "id" | "createdAt" | "updatedAt" | "status" | "members" | "maxConcurrency"> & {
  id?: string;
  status?: ProjectStatus;
  members?: string[];
  maxConcurrency?: number;
  createdAt?: string;
  updatedAt?: string;
};
