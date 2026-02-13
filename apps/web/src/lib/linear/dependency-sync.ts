/**
 * Dependency synchronisation between Linear issue relations and
 * AutoForge feature dependencies.
 *
 * Linear supports several relation types (blocks, is-blocked-by,
 * relates-to, duplicates). This module handles the "blocks" relation
 * type and maps it to AutoForge feature dependencies.
 *
 * When a "blocks" relation is created in Linear between two issues
 * that are both tracked as AutoForge features, a corresponding
 * dependency edge is added in the Convex feature graph. Removing
 * the relation removes the dependency.
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
 * AutoForge feature graph: the blocking issue's feature becomes a
 * dependency of the blocked issue's feature.
 *
 * Relation direction:
 *   event.issue  ----blocks---->  event.relatedIssue
 *   In AutoForge: relatedIssue depends on issue
 */
export async function handleRelationCreated(
  data: Record<string, unknown>,
): Promise<void> {
  const event = toRelationEvent(data);

  if (event.type !== "blocks") {
    // Only "blocks" relations map to AutoForge dependencies.
    console.log(
      `[Linear Dependency Sync] Ignoring relation type "${event.type}" ` +
        `between ${event.issue.identifier} and ${event.relatedIssue.identifier}.`,
    );
    return;
  }

  // TODO: Replace with actual Convex mutation calls.
  //
  // Example:
  //   import { fetchMutation, fetchQuery } from "convex/nextjs";
  //   import { api } from "@convex/_generated/api";
  //
  //   // Resolve both issues to AutoForge features.
  //   const blockingFeature = await fetchQuery(
  //     api.features.getByLinearIssueId,
  //     { linearIssueId: event.issue.identifier },
  //   );
  //   const blockedFeature = await fetchQuery(
  //     api.features.getByLinearIssueId,
  //     { linearIssueId: event.relatedIssue.identifier },
  //   );
  //
  //   if (!blockingFeature || !blockedFeature) {
  //     console.log("[Linear Dependency Sync] One or both issues not tracked -- skipping.");
  //     return;
  //   }
  //
  //   await fetchMutation(api.features.addDependency, {
  //     featureId: blockedFeature._id,
  //     dependsOnFeatureId: blockingFeature._id,
  //   });

  console.log(
    `[Linear Dependency Sync] Relation created: ` +
      `${event.issue.identifier} blocks ${event.relatedIssue.identifier}.`,
  );
}

/**
 * Handle an IssueRelation.remove event from Linear.
 *
 * Removes the corresponding dependency from the AutoForge feature
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

  // TODO: Replace with actual Convex mutation calls.
  //
  // Example:
  //   import { fetchMutation, fetchQuery } from "convex/nextjs";
  //   import { api } from "@convex/_generated/api";
  //
  //   const blockingFeature = await fetchQuery(
  //     api.features.getByLinearIssueId,
  //     { linearIssueId: event.issue.identifier },
  //   );
  //   const blockedFeature = await fetchQuery(
  //     api.features.getByLinearIssueId,
  //     { linearIssueId: event.relatedIssue.identifier },
  //   );
  //
  //   if (!blockingFeature || !blockedFeature) {
  //     return;
  //   }
  //
  //   await fetchMutation(api.features.removeDependency, {
  //     featureId: blockedFeature._id,
  //     dependsOnFeatureId: blockingFeature._id,
  //   });

  console.log(
    `[Linear Dependency Sync] Relation removed: ` +
      `${event.issue.identifier} no longer blocks ${event.relatedIssue.identifier}.`,
  );
}
