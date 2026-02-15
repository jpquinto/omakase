export interface Workspace {
  id: string;
  ownerId: string;
  linearAccessToken: string;
  linearOrganizationId: string;
  linearOrganizationName: string;
  linearDefaultTeamId: string;
  createdAt: string;
  updatedAt: string;
}

export type NewWorkspace = Omit<Workspace, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};
