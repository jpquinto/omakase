/**
 * Ticket ingestion handlers for Linear issue webhook events.
 *
 * When Linear issues are created or updated, these handlers synchronise
 * the relevant data into AutoForge features stored in DynamoDB via the
 * orchestrator API.
 *
 * Only issues that carry the configured trigger label (e.g. "autoforge")
 * are ingested -- all other issues are silently ignored.
 */

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
 * relevant to AutoForge are typed explicitly.
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
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------

/**
 * The Linear label name that marks an issue for ingestion into AutoForge.
 * Only issues carrying this label will be synced as features.
 */
const TRIGGER_LABEL = process.env.LINEAR_TRIGGER_LABEL ?? "autoforge";

// -----------------------------------------------------------------------
// Priority Mapping
// -----------------------------------------------------------------------

/**
 * Map Linear priority (0 = no priority, 1 = urgent, 4 = low) to
 * AutoForge priority (1 = critical, 5 = minor).
 *
 * Linear priority 0 (no priority) maps to AutoForge 3 (medium) as a
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

  const labelNames = event.labels.map((l) => l.name);

  // TODO: Replace with an actual orchestrator API call.
  //
  // Example:
  //   import { apiFetch } from "@/lib/api-client";
  //   await apiFetch("/api/features", {
  //     method: "POST",
  //     body: JSON.stringify({
  //       projectId,        // Resolve from event.team?.id or a lookup table
  //       name: event.title,
  //       description: event.description ?? "",
  //       priority: mapLinearPriority(event.priority),
  //       category: labelNames.filter(l => l.toLowerCase() !== TRIGGER_LABEL.toLowerCase()).join(", ") || undefined,
  //       linearIssueId: event.identifier,
  //       linearIssueUrl: event.url,
  //     }),
  //   });

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

  // TODO: Replace with an actual orchestrator API call.
  //
  // Example:
  //   import { apiFetch } from "@/lib/api-client";
  //
  //   // Look up the feature by its Linear issue identifier.
  //   const feature = await apiFetch(`/api/features/by-linear-issue/${event.identifier}`);
  //
  //   if (!feature) {
  //     // The issue may not have been ingested (e.g. label was added later).
  //     // Check if it now has the trigger label and create it.
  //     if (hasTriggerLabel(event.labels)) {
  //       await handleIssueCreated(data);
  //     }
  //     return;
  //   }
  //
  //   await apiFetch(`/api/features/${feature.id}`, {
  //     method: "PATCH",
  //     body: JSON.stringify({
  //       name: event.title,
  //       description: event.description ?? "",
  //       priority: mapLinearPriority(event.priority),
  //     }),
  //   });

  console.log(
    `[Linear Sync] Issue updated: ${event.identifier} "${event.title}" ` +
      `(priority ${mapLinearPriority(event.priority)})`,
  );
}
