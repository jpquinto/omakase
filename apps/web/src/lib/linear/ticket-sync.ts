/**
 * Ticket ingestion handlers for Linear issue webhook events.
 *
 * When Linear issues are created or updated, these handlers synchronise
 * the relevant data into Omakase features stored in DynamoDB via the
 * orchestrator API.
 *
 * Projects are resolved by matching the issue's Linear projectId to an
 * Omakase project via the `by_linear_project` GSI.
 * Issues without a Linear project are skipped.
 */

import { apiFetch } from "@/lib/api-client";
import type { Feature, FeatureStatus, Project } from "@omakase/db";

// -----------------------------------------------------------------------
// TypeScript interfaces for Linear webhook payloads
// -----------------------------------------------------------------------

/** Label attached to a Linear issue. */
export interface LinearLabel {
  id: string;
  name: string;
  color?: string;
}

/** Assignee / user reference within a Linear issue payload. */
export interface LinearUser {
  id: string;
  name: string;
  email?: string;
}

/** State (workflow status) reference within a Linear issue payload. */
export interface LinearState {
  id: string;
  name: string;
  type: string;
  color?: string;
}

/** Team reference within a Linear issue payload. */
export interface LinearTeam {
  id: string;
  key: string;
  name: string;
}

/**
 * Shape of the `data` object for Issue webhook events from Linear.
 */
export interface LinearIssueEvent {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  priority: number;
  url: string;
  state?: LinearState;
  team?: LinearTeam;
  assignee?: LinearUser;
  labels: LinearLabel[];
  projectId?: string;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------
// Priority Mapping
// -----------------------------------------------------------------------

/**
 * Map Linear priority (0 = no priority, 1 = urgent, 4 = low) to
 * Omakase priority (1 = critical, 5 = minor).
 */
function mapLinearPriority(linearPriority: number): number {
  const mapping: Record<number, number> = {
    0: 3, // No priority -> Medium
    1: 1, // Urgent     -> P1 Critical
    2: 2, // High       -> P2 High
    3: 3, // Medium     -> P3 Medium
    4: 4, // Low        -> P4 Low
  };
  return mapping[linearPriority] ?? 5;
}

// -----------------------------------------------------------------------
// Status Mapping (Linear -> Omakase)
// -----------------------------------------------------------------------

function mapLinearStateToFeatureStatus(
  state: LinearState,
): FeatureStatus | null {
  switch (state.type) {
    case "unstarted":
      return "pending";
    case "started":
      return "in_progress";
    case "completed":
      return "passing";
    case "cancelled":
      return "failing";
  }

  const nameLower = state.name.toLowerCase();
  if (nameLower === "todo" || nameLower === "backlog") return "pending";
  if (nameLower === "in progress") return "in_progress";
  if (nameLower === "done") return "passing";

  return null;
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function toIssueEvent(data: Record<string, unknown>): LinearIssueEvent {
  return data as unknown as LinearIssueEvent;
}

/**
 * Resolve the Omakase project for a Linear issue by its Linear project ID.
 * Returns null if the issue has no projectId or no matching Omakase project exists.
 */
async function resolveProjectByLinearProjectId(
  linearProjectId: string | undefined,
): Promise<Project | null> {
  if (!linearProjectId) {
    return null;
  }

  try {
    return await apiFetch<Project>(`/api/projects/by-linear-project/${linearProjectId}`);
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------
// Event Handlers
// -----------------------------------------------------------------------

/**
 * Handle an Issue.create event from Linear.
 *
 * Routes the issue to an Omakase project by matching the issue's Linear
 * projectId. Issues without a Linear project are skipped.
 */
export async function handleIssueCreated(
  data: Record<string, unknown>,
): Promise<void> {
  const event = toIssueEvent(data);

  // Only issues assigned to a Linear project are tracked (1:1 mapping)
  if (!event.projectId) {
    console.log(`[Linear Sync] Issue ${event.identifier} has no Linear project — skipping.`);
    return;
  }

  const project = await resolveProjectByLinearProjectId(event.projectId);
  if (!project) {
    console.warn(`[Linear Sync] No Omakase project found for Linear project ${event.projectId} — skipping.`);
    return;
  }

  const labelNames = event.labels.map((l) => l.name);
  const category = labelNames.join(", ") || undefined;

  await apiFetch<Feature>("/api/features/from-linear", {
    method: "POST",
    body: JSON.stringify({
      projectId: project.id,
      name: event.title,
      description: event.description ?? "",
      priority: mapLinearPriority(event.priority),
      category,
      linearIssueId: event.identifier,
      linearIssueUrl: event.url,
      linearStateName: event.state?.name,
      linearLabels: event.labels.map((l) => l.name),
      linearAssigneeName: event.assignee?.name,
    }),
  });

  console.log(
    `[Linear Sync] Issue created: ${event.identifier} "${event.title}" ` +
      `(priority ${mapLinearPriority(event.priority)}, labels: [${labelNames.join(", ")}])`,
  );
}

/**
 * Handle an Issue.update event from Linear.
 *
 * Finds the corresponding feature by `linearIssueId` and updates it.
 * If the issue isn't tracked yet but belongs to a mapped project, creates it.
 */
export async function handleIssueUpdated(
  data: Record<string, unknown>,
): Promise<void> {
  const event = toIssueEvent(data);

  // Look up the feature by its Linear issue identifier.
  let feature: Feature | null;
  try {
    feature = await apiFetch<Feature>(`/api/features/by-linear-issue/${event.identifier}`);
  } catch {
    feature = null;
  }

  if (!feature) {
    // The issue may not have been ingested yet. Try to create it if it
    // belongs to a mapped Linear project.
    if (event.projectId) {
      await handleIssueCreated(data);
    }
    return;
  }

  await apiFetch(`/api/features/${feature.id}/from-linear`, {
    method: "PATCH",
    body: JSON.stringify({
      name: event.title,
      description: event.description ?? "",
      priority: mapLinearPriority(event.priority),
      linearStateName: event.state?.name,
      linearLabels: event.labels.map((l) => l.name),
      linearAssigneeName: event.assignee?.name,
    }),
  });

  // Reverse status sync: if the Linear state changed, update the
  // Omakase feature status to match.
  if (event.state) {
    const mappedStatus = mapLinearStateToFeatureStatus(event.state);

    if (mappedStatus && mappedStatus !== feature.status) {
      await apiFetch(`/api/features/${feature.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: mappedStatus }),
      });

      console.log(
        `[Linear Sync] Status updated: ${event.identifier} ` +
          `"${feature.status}" -> "${mappedStatus}" ` +
          `(Linear state: "${event.state.name}" / type: "${event.state.type}")`,
      );
    }
  }

  console.log(
    `[Linear Sync] Issue updated: ${event.identifier} "${event.title}" ` +
      `(priority ${mapLinearPriority(event.priority)})`,
  );
}
