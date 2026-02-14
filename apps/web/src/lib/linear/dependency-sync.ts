/**
 * Dependency synchronisation between Linear issue relations and
 * Omakase feature dependencies.
 *
 * Linear supports several relation types (blocks, is-blocked-by,
 * relates-to, duplicates). This module handles the "blocks" relation
 * type and maps it to Omakase feature dependencies.
 *
 * When a "blocks" relation is created in Linear between two issues
 * that are both tracked as Omakase features, a corresponding
 * dependency edge is added in the DynamoDB feature graph via the
 * orchestrator API. Removing the relation removes the dependency.
 */

// -----------------------------------------------------------------------
// TypeScript Interfaces
// -----------------------------------------------------------------------

/** Shape of the related issue reference within a relation event. */
export interface LinearRelationIssueRef {
  id: string;
  identifier: string;
}

/**
 * Shape of the `data` object for IssueRelation webhook events.
 *
 * Linear relation types:
 *   - "blocks"           - The issue blocks another
 *   - "is blocked by"    - The issue is blocked by another (inverse)
 *   - "relates to"       - General relation
 *   - "duplicate of"     - Duplicate marker
 */
export interface LinearRelationEvent {
  id: string;
  type: string;
  issue: LinearRelationIssueRef;
  relatedIssue: LinearRelationIssueRef;
  createdAt?: string;
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

/**
 * Narrow an unknown webhook `data` payload to the typed relation shape.
 */
function toRelationEvent(data: Record<string, unknown>): LinearRelationEvent {
  return data as unknown as LinearRelationEvent;
}

// -----------------------------------------------------------------------
// Event Handlers
// -----------------------------------------------------------------------

/**
 * Handle an IssueRelation.create event from Linear.
 *
 * If the relation type is "blocks", we add a dependency in the
 * Omakase feature graph: the blocking issue's feature becomes a
 * dependency of the blocked issue's feature.
 *
 * Relation direction:
 *   event.issue  ----blocks---->  event.relatedIssue
 *   In Omakase: relatedIssue depends on issue
 */
export async function handleRelationCreated(
  data: Record<string, unknown>,
): Promise<void> {
  const event = toRelationEvent(data);

  if (event.type !== "blocks") {
    // Only "blocks" relations map to Omakase dependencies.
    console.log(
      `[Linear Dependency Sync] Ignoring relation type "${event.type}" ` +
        `between ${event.issue.identifier} and ${event.relatedIssue.identifier}.`,
    );
    return;
  }

  // TODO: Replace with actual orchestrator API calls.
  //
  // Example:
  //   import { apiFetch } from "@/lib/api-client";
  //
  //   // Resolve both issues to Omakase features.
  //   const blockingFeature = await apiFetch(
  //     `/api/features/by-linear-issue/${event.issue.identifier}`,
  //   );
  //   const blockedFeature = await apiFetch(
  //     `/api/features/by-linear-issue/${event.relatedIssue.identifier}`,
  //   );
  //
  //   if (!blockingFeature || !blockedFeature) {
  //     console.log("[Linear Dependency Sync] One or both issues not tracked -- skipping.");
  //     return;
  //   }
  //
  //   await apiFetch("/api/features/dependencies", {
  //     method: "POST",
  //     body: JSON.stringify({
  //       featureId: blockedFeature.id,
  //       dependsOnFeatureId: blockingFeature.id,
  //     }),
  //   });

  console.log(
    `[Linear Dependency Sync] Relation created: ` +
      `${event.issue.identifier} blocks ${event.relatedIssue.identifier}.`,
  );
}

/**
 * Handle an IssueRelation.remove event from Linear.
 *
 * Removes the corresponding dependency from the Omakase feature
 * graph if both issues are tracked features.
 */
export async function handleRelationRemoved(
  data: Record<string, unknown>,
): Promise<void> {
  const event = toRelationEvent(data);

  if (event.type !== "blocks") {
    console.log(
      `[Linear Dependency Sync] Ignoring removal of relation type ` +
        `"${event.type}" between ${event.issue.identifier} and ` +
        `${event.relatedIssue.identifier}.`,
    );
    return;
  }

  // TODO: Replace with actual orchestrator API calls.
  //
  // Example:
  //   import { apiFetch } from "@/lib/api-client";
  //
  //   const blockingFeature = await apiFetch(
  //     `/api/features/by-linear-issue/${event.issue.identifier}`,
  //   );
  //   const blockedFeature = await apiFetch(
  //     `/api/features/by-linear-issue/${event.relatedIssue.identifier}`,
  //   );
  //
  //   if (!blockingFeature || !blockedFeature) {
  //     return;
  //   }
  //
  //   await apiFetch(`/api/features/dependencies`, {
  //     method: "DELETE",
  //     body: JSON.stringify({
  //       featureId: blockedFeature.id,
  //       dependsOnFeatureId: blockingFeature.id,
  //     }),
  //   });

  console.log(
    `[Linear Dependency Sync] Relation removed: ` +
      `${event.issue.identifier} no longer blocks ${event.relatedIssue.identifier}.`,
  );
}
