import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { docClient, tableName } from "./client.js";
import type { AgentThread, AgentThreadMode, AgentThreadStatus } from "@omakase/db";

const TABLE = () => tableName("agent-threads");

export async function createThread(params: {
  agentName: string;
  projectId: string;
  title?: string;
  mode?: AgentThreadMode;
}): Promise<AgentThread> {
  const now = new Date().toISOString();
  const threadId = ulid();
  const thread: AgentThread = {
    id: threadId,
    threadId,
    agentName: params.agentName,
    projectId: params.projectId,
    title: params.title ?? "New conversation",
    mode: params.mode ?? "chat",
    status: "active",
    lastMessageAt: now,
    messageCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({ TableName: TABLE(), Item: thread }));
  return thread;
}

export async function getThread(params: {
  agentName: string;
  threadId: string;
}): Promise<AgentThread | null> {
  const result = await docClient.send(new GetCommand({
    TableName: TABLE(),
    Key: { agentName: params.agentName, threadId: params.threadId },
  }));
  return (result.Item as AgentThread) ?? null;
}

export interface PaginatedThreads {
  threads: AgentThread[];
  nextCursor: string | null;
}

export async function listThreadsByAgent(params: {
  agentName: string;
  projectId?: string;
  includeArchived?: boolean;
  limit?: number;
  cursor?: string;
}): Promise<PaginatedThreads> {
  const limit = params.limit ?? 20;
  const offset = params.cursor ? parseInt(params.cursor, 10) : 0;

  let threads: AgentThread[];

  if (params.projectId) {
    // Scoped to a project: query the by_project GSI then filter by agent
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE(),
      IndexName: "by_project",
      KeyConditionExpression: "projectId = :projectId",
      ExpressionAttributeValues: {
        ":projectId": params.projectId,
      },
      ScanIndexForward: false,
    }));
    threads = ((result.Items ?? []) as AgentThread[]).filter(
      (t) => t.agentName === params.agentName,
    );
  } else {
    // All threads for this agent across all projects: query on PK directly
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE(),
      KeyConditionExpression: "agentName = :agentName",
      ExpressionAttributeValues: {
        ":agentName": params.agentName,
      },
      ScanIndexForward: false,
    }));
    threads = (result.Items ?? []) as AgentThread[];
  }

  if (!params.includeArchived) {
    threads = threads.filter((t) => t.status === "active");
  }

  // Sort newest first by lastMessageAt
  threads.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));

  // Apply pagination
  const paged = threads.slice(offset, offset + limit);
  const hasMore = offset + limit < threads.length;

  return {
    threads: paged,
    nextCursor: hasMore ? String(offset + limit) : null,
  };
}

export async function updateThread(params: {
  agentName: string;
  threadId: string;
  title?: string;
  status?: AgentThreadStatus;
}): Promise<AgentThread | null> {
  const updates: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  if (params.title !== undefined) {
    updates.push("#title = :title");
    names["#title"] = "title";
    values[":title"] = params.title;
  }

  if (params.status !== undefined) {
    updates.push("#status = :status");
    names["#status"] = "status";
    values[":status"] = params.status;
  }

  if (updates.length === 0) return getThread(params);

  updates.push("updatedAt = :now");
  values[":now"] = new Date().toISOString();

  const result = await docClient.send(new UpdateCommand({
    TableName: TABLE(),
    Key: { agentName: params.agentName, threadId: params.threadId },
    UpdateExpression: `SET ${updates.join(", ")}`,
    ExpressionAttributeNames: Object.keys(names).length > 0 ? names : undefined,
    ExpressionAttributeValues: values,
    ReturnValues: "ALL_NEW",
  }));

  return (result.Attributes as AgentThread) ?? null;
}

export async function updateThreadMetadata(params: {
  agentName: string;
  threadId: string;
  messageTimestamp: string;
}): Promise<void> {
  await docClient.send(new UpdateCommand({
    TableName: TABLE(),
    Key: { agentName: params.agentName, threadId: params.threadId },
    UpdateExpression: "SET lastMessageAt = :ts, messageCount = if_not_exists(messageCount, :zero) + :one, updatedAt = :ts",
    ExpressionAttributeValues: {
      ":ts": params.messageTimestamp,
      ":zero": 0,
      ":one": 1,
    },
  }));
}
