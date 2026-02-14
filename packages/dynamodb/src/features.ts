import { BatchWriteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { docClient, tableName } from "./client.js";
import type { Feature } from "@omakase/db";

const TABLE = () => tableName("features");

export async function createFeaturesBulk(params: {
  projectId: string;
  features: Array<{
    name: string;
    description?: string;
    priority: number;
    category?: string;
    steps?: string;
  }>;
}): Promise<Feature[]> {
  const now = new Date().toISOString();
  const items: Feature[] = params.features.map((f) => ({
    id: ulid(),
    projectId: params.projectId,
    name: f.name,
    description: f.description,
    priority: f.priority,
    category: f.category,
    status: "pending" as const,
    steps: f.steps,
    dependencies: [],
    createdAt: now,
    updatedAt: now,
  }));

  // BatchWriteItem supports max 25 items per request
  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25);
    await docClient.send(new BatchWriteCommand({
      RequestItems: {
        [TABLE()]: batch.map((item) => ({
          PutRequest: { Item: item },
        })),
      },
    }));
  }

  return items;
}

export async function listFeatures(params: { projectId: string }): Promise<Feature[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE(),
    IndexName: "by_project",
    KeyConditionExpression: "projectId = :projectId",
    ExpressionAttributeValues: { ":projectId": params.projectId },
  }));
  return (result.Items ?? []) as Feature[];
}

export async function getFeature(params: { featureId: string }): Promise<Feature | null> {
  const result = await docClient.send(new GetCommand({
    TableName: TABLE(),
    Key: { id: params.featureId },
  }));
  return (result.Item as Feature) ?? null;
}

export async function getReadyFeatures(params: { projectId: string }): Promise<Feature[]> {
  // Get all features for the project
  const allFeatures = await listFeatures(params);

  // Build a status lookup
  const statusMap = new Map(allFeatures.map((f) => [f.id, f.status]));

  // A feature is ready if it's pending and all its dependencies are passing
  return allFeatures.filter((f) => {
    if (f.status !== "pending") return false;
    return f.dependencies.every((depId) => statusMap.get(depId) === "passing");
  });
}

export async function claimFeature(params: {
  projectId: string;
  agentId: string;
}): Promise<Feature | null> {
  const ready = await getReadyFeatures({ projectId: params.projectId });
  if (ready.length === 0) return null;

  // Sort by priority (lower = higher priority)
  ready.sort((a, b) => a.priority - b.priority);

  // Try to atomically claim the first ready feature
  for (const feature of ready) {
    try {
      const now = new Date().toISOString();
      await docClient.send(new UpdateCommand({
        TableName: TABLE(),
        Key: { id: feature.id },
        UpdateExpression: "SET #status = :inProgress, assignedAgentId = :agentId, updatedAt = :now",
        ConditionExpression: "#status = :pending AND attribute_not_exists(assignedAgentId)",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":inProgress": "in_progress",
          ":pending": "pending",
          ":agentId": params.agentId,
          ":now": now,
        },
      }));

      return { ...feature, status: "in_progress", assignedAgentId: params.agentId, updatedAt: now };
    } catch (error: unknown) {
      // ConditionalCheckFailedException means another agent claimed it first
      const err = error as { name?: string };
      if (err.name === "ConditionalCheckFailedException") {
        continue;
      }
      throw error;
    }
  }

  return null;
}

export async function markFeaturePassing(params: { featureId: string }): Promise<void> {
  const now = new Date().toISOString();
  await docClient.send(new UpdateCommand({
    TableName: TABLE(),
    Key: { id: params.featureId },
    UpdateExpression: "SET #status = :status, completedAt = :now, updatedAt = :now REMOVE assignedAgentId",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":status": "passing",
      ":now": now,
    },
  }));
}

export async function markFeatureFailing(params: { featureId: string }): Promise<void> {
  const now = new Date().toISOString();
  await docClient.send(new UpdateCommand({
    TableName: TABLE(),
    Key: { id: params.featureId },
    UpdateExpression: "SET #status = :status, updatedAt = :now REMOVE assignedAgentId",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":status": "failing",
      ":now": now,
    },
  }));
}

export async function markFeatureInProgress(params: {
  featureId: string;
  agentId: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await docClient.send(new UpdateCommand({
    TableName: TABLE(),
    Key: { id: params.featureId },
    UpdateExpression: "SET #status = :status, assignedAgentId = :agentId, updatedAt = :now",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":status": "in_progress",
      ":agentId": params.agentId,
      ":now": now,
    },
  }));
}

export async function getFeatureStats(params: { projectId: string }): Promise<{
  total: number;
  pending: number;
  inProgress: number;
  passing: number;
  failing: number;
}> {
  const features = await listFeatures(params);
  return {
    total: features.length,
    pending: features.filter((f) => f.status === "pending").length,
    inProgress: features.filter((f) => f.status === "in_progress").length,
    passing: features.filter((f) => f.status === "passing").length,
    failing: features.filter((f) => f.status === "failing").length,
  };
}
