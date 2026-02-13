/**
 * concurrency.ts -- Per-project concurrency control for agent pipelines.
 *
 * Tracks how many pipelines are actively running for each project and
 * enforces the per-project maxConcurrency limit. All operations are
 * synchronous and event-loop safe since Node.js is single-threaded.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** An active pipeline slot tracked by the concurrency manager. */
interface ActiveSlot {
  featureId: string;
  acquiredAt: number;
}

// ---------------------------------------------------------------------------
// ConcurrencyManager
// ---------------------------------------------------------------------------

/**
 * Manages the number of concurrent agent pipelines per project.
 *
 * The orchestrator calls `canStart` before launching a pipeline to check
 * whether the project has capacity. If so, it calls `acquire` to reserve
 * the slot and `release` when the pipeline finishes (success or failure).
 *
 * This class is purely in-memory. If the orchestrator process restarts,
 * the tracking state is reset. The feature watcher will re-discover
 * in-progress features from Convex and rebuild state accordingly.
 */
export class ConcurrencyManager {
  /**
   * Map from projectId to the set of active pipeline slots.
   * Using a Map of Maps keyed by featureId for O(1) lookup/removal.
   */
  private readonly activeSlots = new Map<string, Map<string, ActiveSlot>>();

  /**
   * Check whether a project can start a new pipeline without exceeding
   * its concurrency limit.
   *
   * @param projectId - The Convex project ID.
   * @param maxConcurrency - The maximum number of concurrent pipelines
   *   allowed for this project (from the project's `maxConcurrency` field).
   * @returns true if a new pipeline can be started.
   */
  canStart(projectId: string, maxConcurrency: number): boolean {
    const activeCount = this.getActiveCount(projectId);
    return activeCount < maxConcurrency;
  }

  /**
   * Reserve a pipeline slot for a feature within a project.
   *
   * @param projectId - The Convex project ID.
   * @param featureId - The Convex feature ID being worked on.
   * @throws {Error} If the feature already has an active slot (double-acquire).
   */
  acquire(projectId: string, featureId: string): void {
    let projectSlots = this.activeSlots.get(projectId);
    if (!projectSlots) {
      projectSlots = new Map<string, ActiveSlot>();
      this.activeSlots.set(projectId, projectSlots);
    }

    if (projectSlots.has(featureId)) {
      throw new Error(
        `Feature ${featureId} already has an active pipeline slot in project ${projectId}. ` +
          "This indicates a double-acquire bug in the orchestrator."
      );
    }

    projectSlots.set(featureId, {
      featureId,
      acquiredAt: Date.now(),
    });
  }

  /**
   * Release a pipeline slot when a feature's pipeline completes or fails.
   *
   * @param projectId - The Convex project ID.
   * @param featureId - The Convex feature ID to release.
   */
  release(projectId: string, featureId: string): void {
    const projectSlots = this.activeSlots.get(projectId);
    if (!projectSlots) {
      return;
    }

    projectSlots.delete(featureId);

    // Clean up the project entry if no slots remain
    if (projectSlots.size === 0) {
      this.activeSlots.delete(projectId);
    }
  }

  /**
   * Get the number of active pipelines for a project.
   *
   * @param projectId - The Convex project ID.
   * @returns The count of active pipeline slots.
   */
  getActiveCount(projectId: string): number {
    const projectSlots = this.activeSlots.get(projectId);
    return projectSlots ? projectSlots.size : 0;
  }

  /**
   * Check whether a specific feature already has an active pipeline.
   * Used to prevent launching duplicate pipelines for the same feature.
   *
   * @param projectId - The Convex project ID.
   * @param featureId - The Convex feature ID to check.
   * @returns true if the feature has an active pipeline.
   */
  isActive(projectId: string, featureId: string): boolean {
    const projectSlots = this.activeSlots.get(projectId);
    if (!projectSlots) {
      return false;
    }
    return projectSlots.has(featureId);
  }

  /**
   * Get all active feature IDs for a project. Useful for debugging
   * and status reporting.
   *
   * @param projectId - The Convex project ID.
   * @returns Array of active feature IDs with their acquisition timestamps.
   */
  getActiveFeatures(projectId: string): ReadonlyArray<ActiveSlot> {
    const projectSlots = this.activeSlots.get(projectId);
    if (!projectSlots) {
      return [];
    }
    return Array.from(projectSlots.values());
  }
}
