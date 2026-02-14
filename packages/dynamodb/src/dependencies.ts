import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, tableName } from "./client.js";
import type { Feature } from "@omakase/db";
import { listFeatures } from "./features.js";

const TABLE = () => tableName("features");

/**
 * Detect whether adding a directed edge `from -> to` would create a cycle.
 * Uses BFS starting from `to`: if we can reach `from` by following existing
 * edges, then adding `from -> to` would close a cycle.
 */
function detectCycle(
  graph: Map<string, string[]>,
  from: string,
  to: string,
): boolean {
  if (from === to) return true;

  const visited = new Set<string>();
  const queue: string[] = [to];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === from) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const deps = graph.get(current);
    if (deps) {
      for (const dep of deps) {
        if (!visited.has(dep)) queue.push(dep);
      }
    }
  }

  return false;
}

export async function addDependency(params: {
  featureId: string;
  dependsOnId: string;
}): Promise<void> {
  // Get the feature to find its projectId
  const feature = await docClient.send(new GetCommand({
    TableName: TABLE(),
    Key: { id: params.featureId },
  }));

  if (!feature.Item) throw new Error(`Feature ${params.featureId} not found`);
  const feat = feature.Item as Feature;

  // Build the dependency graph for cycle detection
  const allFeatures = await listFeatures({ projectId: feat.projectId });
  const graph = new Map<string, string[]>();
  for (const f of allFeatures) {
    graph.set(f.id, [...f.dependencies]);
  }

  // Check for cycle
  if (detectCycle(graph, params.featureId, params.dependsOnId)) {
    throw new Error("Adding this dependency would create a circular dependency");
  }

  // Add the dependency
  const newDeps = [...feat.dependencies, params.dependsOnId];
  await docClient.send(new UpdateCommand({
    TableName: TABLE(),
    Key: { id: params.featureId },
    UpdateExpression: "SET dependencies = :deps, updatedAt = :now",
    ExpressionAttributeValues: {
      ":deps": newDeps,
      ":now": new Date().toISOString(),
    },
  }));
}

export async function removeDependency(params: {
  featureId: string;
  dependsOnId: string;
}): Promise<void> {
  const result = await docClient.send(new GetCommand({
    TableName: TABLE(),
    Key: { id: params.featureId },
  }));

  if (!result.Item) throw new Error(`Feature ${params.featureId} not found`);
  const feat = result.Item as Feature;

  const newDeps = feat.dependencies.filter((d) => d !== params.dependsOnId);
  await docClient.send(new UpdateCommand({
    TableName: TABLE(),
    Key: { id: params.featureId },
    UpdateExpression: "SET dependencies = :deps, updatedAt = :now",
    ExpressionAttributeValues: {
      ":deps": newDeps,
      ":now": new Date().toISOString(),
    },
  }));
}
