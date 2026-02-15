/**
 * Ticket ingestion handlers for Linear issue webhook events.
 *
 * When Linear issues are created or updated, these handlers synchronise
 * the relevant data into Omakase features stored in DynamoDB via the
 * orchestrator API.
 *
 * Only issues that carry the configured trigger label (e.g. "omakase")
 * are ingested -- all other issues are silently ignored.
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
 *
 * This is a subset of the fields Linear includes -- only the ones
 * relevant to Omakase are typed explicitly.
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
// Configuration
// -----------------------------------------------------------------------

/**
 * The Linear label name that marks an issue for ingestion into Omakase.
 * Only issues carrying this label will be synced as features.
 */
const TRIGGER_LABEL = process.env.LINEAR_TRIGGER_LABEL ?? "omakase";

// -----------------------------------------------------------------------
// Priority Mapping
// -----------------------------------------------------------------------

/**
 * Map Linear priority (0 = no priority, 1 = urgent, 4 = low) to
 * Omakase priority (1 = critical, 5 = minor).
 *
 * Linear priority 0 (no priority) maps to Omakase 3 (medium) as a
 * reasonable default.
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

/**
 * Map a Linear workflow state to an Omakase feature status.
 *
 * Linear states have both a `type` (category: unstarted, started,
 * completed, cancelled) and a human-readable `name`. We match on
 * the type first (more reliable), then fall back to well-known names.
 *
 * Returns `null` when the state cannot be mapped, signalling that no
 * status update should be applied.
 */
function mapLinearStateToFeatureStatus(
  state: LinearState,
): FeatureStatus | null {
  // Match on the workflow state type (most reliable).
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

  // Fall back to well-known state names for non-standard types.
  const nameLower = state.name.toLowerCase();
  if (nameLower === "todo" || nameLower === "backlog") return "pending";
  if (nameLower === "in progress") return "in_progress";
  if (nameLower === "done") return "passing";

  return null;
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

/** Check whether the issue carries the trigger label. */
function hasTriggerLabel(labels: LinearLabel[]): boolean {
  return labels.some(
    (label) => label.name.toLowerCase() === TRIGGER_LABEL.toLowerCase(),
  );
}

/**
 * Narrow an unknown webhook `data` payload to the typed issue shape.
 *
 * Linear sends the full issue object under `data`; we cast defensively
 * so callers get type safety.
 */
function toIssueEvent(data: Record<string, unknown>): LinearIssueEvent {
  return data as unknown as LinearIssueEvent;
}

// -----------------------------------------------------------------------
// Event Handlers
// -----------------------------------------------------------------------

/**
 * Handle an Issue.create event from Linear.
 *
 * If the issue carries the trigger label, a corresponding feature is
 * created in DynamoDB (via the orchestrator API) with fields mapped
 * from the Linear issue.
 */
export async function handleIssueCreated(
  data: Record<string, unknown>,
): Promise<void> {
  const event = toIssueEvent(data);

  if (!hasTriggerLabel(event.labels)) {
    return;
  }

  // Resolve project from team ID
  if (!event.team?.id) {
    console.warn(`[Linear Sync] Issue ${event.identifier} has no team ID — skipping.`);
    return;
  }

  let project: Project;
  try {
    project = await apiFetch<Project>(`/api/projects/by-linear-team/${event.team.id}`);
  } catch {
    console.warn(`[Linear Sync] No project found for Linear team ${event.team.id} — skipping.`);
    return;
  }

  // If the project is scoped to a specific Linear project, skip issues from other projects
  if (project.linearProjectId && event.projectId && event.projectId !== project.linearProjectId) {
    return;
  }

  const labelNames = event.labels.map((l) => l.name);
  const category = labelNames
    .filter((l) => l.toLowerCase() !== TRIGGER_LABEL.toLowerCase())
    .join(", ") || undefined;

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
 * Finds the corresponding feature by `linearIssueId` and updates the
 * name, description, and priority if they have changed.
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
    // The issue may not have been ingested (e.g. label was added later).
    // Check if it now has the trigger label and create it.
    if (hasTriggerLabel(event.labels)) {
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
