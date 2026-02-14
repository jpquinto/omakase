import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { docClient, tableName } from "./client.js";
import type { AgentMessage, AgentMessageSender, AgentMessageType, AgentRunRole } from "@omakase/db";

const TABLE = () => tableName("agent-messages");

export async function createMessage(params: {
  runId: string;
  featureId: string;
  projectId: string;
  sender: AgentMessageSender;
  role: AgentRunRole | null;
  content: string;
  type: AgentMessageType;
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
    timestamp: now,
  };
  await docClient.send(new PutCommand({ TableName: TABLE(), Item: message }));
  return message;
}

export async function listMessages(params: {
  runId: string;
  since?: string;
  sender?: AgentMessageSender;
}): Promise<AgentMessage[]> {
  let keyExpr = "runId = :runId";
  const values: Record<string, unknown> = { ":runId": params.runId };

  if (params.since) {
    keyExpr += " AND #ts > :since";
    values[":since"] = params.since;
  }

  const names: Record<string, string> = { "#ts": "timestamp" };

  let filterExpr: string | undefined;
  if (params.sender) {
    filterExpr = "sender = :sender";
    values[":sender"] = params.sender;
  }

  const result = await docClient.send(new QueryCommand({
    TableName: TABLE(),
    KeyConditionExpression: keyExpr,
    ExpressionAttributeNames: names,
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
