import { DeleteCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { docClient, tableName } from "./client.js";
import type { AgentMemory, AgentMemorySource } from "@omakase/db";

const TABLE = () => tableName("agent-memories");

const MAX_MEMORIES = 50;

function agentProjectKey(agentName: string, projectId: string): string {
  return `${agentName}#${projectId}`;
}

export async function createMemory(params: {
  agentName: string;
  projectId: string;
  content: string;
  source: AgentMemorySource;
}): Promise<AgentMemory> {
  const now = new Date().toISOString();
  const memory: AgentMemory = {
    id: ulid(),
    agentName: params.agentName,
    projectId: params.projectId,
    content: params.content,
    source: params.source,
    createdAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: TABLE(),
    Item: {
      ...memory,
      agentProjectKey: agentProjectKey(params.agentName, params.projectId),
    },
  }));

  return memory;
}

export async function listMemories(params: {
  agentName: string;
  projectId: string;
}): Promise<AgentMemory[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE(),
    KeyConditionExpression: "agentProjectKey = :key",
    ExpressionAttributeValues: {
      ":key": agentProjectKey(params.agentName, params.projectId),
    },
    ScanIndexForward: false, // newest first
    Limit: MAX_MEMORIES,
  }));

  return (result.Items ?? []) as AgentMemory[];
}

export async function deleteMemory(params: {
  agentName: string;
  projectId: string;
  createdAt: string;
}): Promise<void> {
  await docClient.send(new DeleteCommand({
    TableName: TABLE(),
    Key: {
      agentProjectKey: agentProjectKey(params.agentName, params.projectId),
      createdAt: params.createdAt,
    },
  }));
}

export async function deleteMemoriesByAgentProject(params: {
  agentName: string;
  projectId: string;
}): Promise<void> {
  const memories = await listMemories(params);

  for (const memory of memories) {
    await docClient.send(new DeleteCommand({
      TableName: TABLE(),
      Key: {
        agentProjectKey: agentProjectKey(params.agentName, params.projectId),
        createdAt: memory.createdAt,
      },
    }));
  }
}
