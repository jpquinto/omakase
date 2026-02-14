import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { docClient, tableName } from "./client.js";
import type { AgentMessage, AgentMessageSender, AgentMessageType, AgentRunRole, QuizMetadata } from "@omakase/db";
import { updateThreadMetadata } from "./agent-threads.js";

const TABLE = () => tableName("agent-messages");

const ROLE_TO_AGENT: Record<string, string> = {
  architect: "miso",
  coder: "nori",
  reviewer: "koji",
  tester: "toro",
};

export async function createMessage(params: {
  runId: string;
  featureId: string;
  projectId: string;
  sender: AgentMessageSender;
  role: AgentRunRole | null;
  content: string;
  type: AgentMessageType;
  threadId?: string;
  metadata?: QuizMetadata;
}): Promise<AgentMessage> {
  const now = new Date().toISOString();
  const message: AgentMessage = {
    id: ulid(),
    runId: params.runId,
    featureId: params.featureId,
    projectId: params.projectId,
    sender: params.sender,
    role: params.role,
    content: params.content,
    type: params.type,
    ...(params.threadId ? { threadId: params.threadId } : {}),
    ...(params.metadata ? { metadata: params.metadata } : {}),
    timestamp: now,
  };
  await docClient.send(new PutCommand({ TableName: TABLE(), Item: message }));

  // Update thread metadata if message belongs to a thread
  if (params.threadId && params.role) {
    const agentName = ROLE_TO_AGENT[params.role] ?? params.role;
    updateThreadMetadata({
      agentName,
      threadId: params.threadId,
      messageTimestamp: now,
    }).catch((err) =>
      console.error("[agent-messages] Failed to update thread metadata:", err)
    );
  }

  return message;
}

export async function listMessages(params: {
  runId: string;
  since?: string;
  sender?: AgentMessageSender;
}): Promise<AgentMessage[]> {
  let keyExpr = "runId = :runId";
  const values: Record<string, unknown> = { ":runId": params.runId };

  const names: Record<string, string> = {};

  if (params.since) {
    keyExpr += " AND #ts > :since";
    values[":since"] = params.since;
    names["#ts"] = "timestamp";
  }

  let filterExpr: string | undefined;
  if (params.sender) {
    filterExpr = "sender = :sender";
    values[":sender"] = params.sender;
  }

  const result = await docClient.send(new QueryCommand({
    TableName: TABLE(),
    KeyConditionExpression: keyExpr,
    ExpressionAttributeNames: Object.keys(names).length > 0 ? names : undefined,
    ExpressionAttributeValues: values,
    FilterExpression: filterExpr,
  }));

  return (result.Items ?? []) as AgentMessage[];
}

export async function listMessagesByFeature(params: {
  featureId: string;
}): Promise<AgentMessage[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE(),
    IndexName: "by_feature",
    KeyConditionExpression: "featureId = :featureId",
    ExpressionAttributeValues: { ":featureId": params.featureId },
  }));
  return (result.Items ?? []) as AgentMessage[];
}

export async function listMessagesByThread(params: {
  threadId: string;
  since?: string;
  limit?: number;
}): Promise<AgentMessage[]> {
  let keyExpr = "threadId = :threadId";
  const values: Record<string, unknown> = { ":threadId": params.threadId };
  const names: Record<string, string> = {};

  if (params.since) {
    keyExpr += " AND #ts > :since";
    values[":since"] = params.since;
    names["#ts"] = "timestamp";
  }

  const result = await docClient.send(new QueryCommand({
    TableName: TABLE(),
    IndexName: "by_thread",
    KeyConditionExpression: keyExpr,
    ExpressionAttributeNames: Object.keys(names).length > 0 ? names : undefined,
    ExpressionAttributeValues: values,
    ...(params.limit ? { Limit: params.limit, ScanIndexForward: false } : {}),
  }));

  const items = (result.Items ?? []) as AgentMessage[];
  // If we used reverse order for limit, re-sort ascending
  if (params.limit) {
    items.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
  return items;
}
