import { DeleteCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, tableName } from "./client.js";
import type { AgentPersonality } from "@omakase/db";

const TABLE = () => tableName("agent-personalities");

export async function getPersonality(params: {
  agentName: string;
}): Promise<AgentPersonality | null> {
  const result = await docClient.send(new GetCommand({
    TableName: TABLE(),
    Key: { agentName: params.agentName },
  }));
  return (result.Item as AgentPersonality) ?? null;
}

export async function putPersonality(params: {
  agentName: string;
  displayName: string;
  persona: string;
  traits: string[];
  communicationStyle: string;
}): Promise<AgentPersonality> {
  const now = new Date().toISOString();
  const personality: AgentPersonality = {
    agentName: params.agentName,
    displayName: params.displayName,
    persona: params.persona,
    traits: params.traits,
    communicationStyle: params.communicationStyle,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: TABLE(),
    Item: personality,
  }));

  return personality;
}

export async function deletePersonality(params: {
  agentName: string;
}): Promise<void> {
  await docClient.send(new DeleteCommand({
    TableName: TABLE(),
    Key: { agentName: params.agentName },
  }));
}
