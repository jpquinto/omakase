/**
 * Pure graph utility functions for dependency management.
 *
 * These are extracted from the Convex mutation handlers so they can be
 * unit-tested without requiring the Convex runtime or database context.
 */

/**
 * Detect whether adding a directed edge `from -> to` would create a cycle
 * in the dependency graph.
 *
 * Uses BFS starting from `to`: if we can reach `from` by following existing
 * edges, then adding `from -> to` would close a cycle.
 *
 * @param graph - Adjacency list mapping each node to its dependencies
 *                (i.e. `graph.get("A")` returns the IDs that A depends on)
 * @param from  - The node that will gain a new dependency
 * @param to    - The node that `from` would depend on
 * @returns `true` if adding the edge would create a cycle
 */
export function detectCycle(
  graph: Map<string, string[]>,
  from: string,
  to: string,
): boolean {
  // Self-loop is always a cycle
  if (from === to) {
    return true;
  }

  // BFS from `to` through its transitive dependencies.
  // If we reach `from`, that means `to` already (transitively) depends on
  // `from`, so adding `from -> to` would close the loop.
  const visited = new Set<string>();
  const queue: string[] = [to];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === from) {
      return true;
    }

    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    const deps = graph.get(current);
    if (deps) {
      for (const dep of deps) {
        if (!visited.has(dep)) {
          queue.push(dep);
        }
      }
    }
  }

  return false;
}
