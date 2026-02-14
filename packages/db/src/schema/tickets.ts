export interface Ticket {
  id: string;
  projectId: string;
  featureId?: string;
  linearIssueId: string;
  linearIssueUrl: string;
  title: string;
  description?: string;
  priority: number;
  status: string;
  labels: string[];
  syncedAt: string;
}

export type NewTicket = Omit<Ticket, "id" | "syncedAt" | "labels"> & {
  id?: string;
  labels?: string[];
  syncedAt?: string;
};
