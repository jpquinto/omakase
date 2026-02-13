/**
 * Pure helper functions for feature status evaluation and statistics.
 *
 * Extracted from Convex query/mutation handlers so they can be unit-tested
 * without the Convex runtime or database context.
 */

/** The set of valid feature statuses, matching the Convex schema union. */
export type FeatureStatus = "pending" | "in_progress" | "passing" | "failing";

/** Minimal feature shape needed for readiness checks. */
export interface FeatureReadinessInput {
  status: string;
  dependencies: string[];
}

/** Aggregate statistics for a set of features. */
export interface FeatureStats {
  total: number;
  pending: number;
  inProgress: number;
  passing: number;
  failing: number;
}

/**
 * Determine whether a feature is "ready" to be worked on.
 *
 * A feature is ready when:
 * 1. Its own status is "pending" (not already in progress, passing, or failing)
 * 2. ALL of its dependencies have status "passing"
 *
 * @param feature     - The feature to evaluate
 * @param depStatuses - Map from dependency ID to its current status
 * @returns `true` if the feature is ready to be claimed by an agent
 */
export function isFeatureReady(
  feature: FeatureReadinessInput,
  depStatuses: Map<string, string>,
): boolean {
  // Only pending features can be "ready"
  if (feature.status !== "pending") {
    return false;
  }

  // A feature with no dependencies is immediately ready
  if (feature.dependencies.length === 0) {
    return true;
  }

  // Every dependency must be passing
  for (const depId of feature.dependencies) {
    const status = depStatuses.get(depId);
    if (status !== "passing") {
      return false;
    }
  }

  return true;
}

/**
 * Compute aggregate statistics from an array of features.
 *
 * @param features - Array of objects each containing at least a `status` field
 * @returns Counts broken down by status
 */
export function computeFeatureStats(
  features: Array<{ status: string }>,
): FeatureStats {
  const stats: FeatureStats = {
    total: features.length,
    pending: 0,
    inProgress: 0,
    passing: 0,
    failing: 0,
  };

  for (const feature of features) {
    switch (feature.status) {
      case "pending":
        stats.pending++;
        break;
      case "in_progress":
        stats.inProgress++;
        break;
      case "passing":
        stats.passing++;
        break;
      case "failing":
        stats.failing++;
        break;
      // Unknown statuses are counted in total but not in any bucket
    }
  }

  return stats;
}
