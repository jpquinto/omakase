import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { docClient, tableName } from "./client.js";
import type { Workspace } from "@omakase/db";

const TABLE = () => tableName("workspaces");

export async function createWorkspace(params: {
  ownerId: string;
  linearAccessToken: string;
  linearOrganizationId: string;
  linearOrganizationName: string;
  linearDefaultTeamId: string;
}): Promise<Workspace> {
  const now = new Date().toISOString();
  const workspace: Workspace = {
    id: ulid(),
    ownerId: params.ownerId,
    linearAccessToken: params.linearAccessToken,
    linearOrganizationId: params.linearOrganizationId,
    linearOrganizationName: params.linearOrganizationName,
    linearDefaultTeamId: params.linearDefaultTeamId,
    createdAt: now,
    updatedAt: now,
  };
  await docClient.send(new PutCommand({ TableName: TABLE(), Item: workspace }));
  return workspace;
}

export async function getWorkspace(params: { workspaceId: string }): Promise<Workspace | null> {
  const result = await docClient.send(new GetCommand({
    TableName: TABLE(),
    Key: { id: params.workspaceId },
  }));
  return (result.Item as Workspace) ?? null;
}

export async function getByLinearOrgId(params: { linearOrganizationId: string }): Promise<Workspace | null> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE(),
    IndexName: "by_linear_org",
    KeyConditionExpression: "linearOrganizationId = :orgId",
    ExpressionAttributeValues: { ":orgId": params.linearOrganizationId },
    Limit: 1,
  }));
  return (result.Items?.[0] as Workspace) ?? null;
}

export async function updateWorkspace(params: {
  workspaceId: string;
  linearAccessToken?: string;
  linearOrganizationName?: string;
  linearDefaultTeamId?: string;
}): Promise<void> {
  const { workspaceId, ...fields } = params;
  const updates: string[] = ["updatedAt = :updatedAt"];
  const values: Record<string, unknown> = { ":updatedAt": new Date().toISOString() };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updates.push(`${key} = :${key}`);
      values[`:${key}`] = value;
    }
  }

  await docClient.send(new UpdateCommand({
    TableName: TABLE(),
    Key: { id: workspaceId },
    UpdateExpression: `SET ${updates.join(", ")}`,
    ExpressionAttributeValues: values,
  }));
}

export async function clearLinearConnection(params: { workspaceId: string }): Promise<void> {
  await docClient.send(new UpdateCommand({
    TableName: TABLE(),
    Key: { id: params.workspaceId },
    UpdateExpression: "SET updatedAt = :now REMOVE linearAccessToken",
    ExpressionAttributeValues: { ":now": new Date().toISOString() },
  }));
}
