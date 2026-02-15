import { DeleteCommand, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { docClient, tableName } from "./client.js";
import type { Project, NewProject } from "@omakase/db";

const TABLE = () => tableName("projects");

export async function createProject(params: {
  name: string;
  description?: string;
  ownerId: string;
}): Promise<Project> {
  const now = new Date().toISOString();
  const project: Project = {
    id: ulid(),
    name: params.name,
    description: params.description,
    ownerId: params.ownerId,
    members: [],
    status: "active",
    maxConcurrency: 3,
    createdAt: now,
    updatedAt: now,
  };
  await docClient.send(new PutCommand({ TableName: TABLE(), Item: project }));
  return project;
}

export async function getProject(params: { projectId: string }): Promise<Project | null> {
  const result = await docClient.send(new GetCommand({
    TableName: TABLE(),
    Key: { id: params.projectId },
  }));
  return (result.Item as Project) ?? null;
}

export async function listProjects(params: { userId: string }): Promise<Project[]> {
  // Scan all projects and filter for ownership/membership
  const result = await docClient.send(new ScanCommand({ TableName: TABLE() }));
  const projects = (result.Items ?? []) as Project[];
  return projects.filter(
    (p) => p.ownerId === params.userId || p.members.includes(params.userId),
  );
}

export async function listActiveProjects(): Promise<Project[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE(),
    IndexName: "by_status",
    KeyConditionExpression: "#status = :status",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: { ":status": "active" },
  }));
  return (result.Items ?? []) as Project[];
}

export async function updateProject(params: {
  projectId: string;
  name?: string;
  description?: string;
  status?: string;
  repoUrl?: string;
  workspaceId?: string;
  linearProjectId?: string;
  linearProjectName?: string;
  githubInstallationId?: number;
  githubRepoOwner?: string;
  githubRepoName?: string;
  githubDefaultBranch?: string;
  maxConcurrency?: number;
  members?: string[];
}): Promise<void> {
  const { projectId, ...fields } = params;
  const updates: string[] = ["updatedAt = :updatedAt"];
  const values: Record<string, unknown> = { ":updatedAt": new Date().toISOString() };
  const names: Record<string, string> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      const attr = `:${key}`;
      // Handle reserved words
      if (key === "name" || key === "status") {
        names[`#${key}`] = key;
        updates.push(`#${key} = ${attr}`);
      } else {
        updates.push(`${key} = ${attr}`);
      }
      values[attr] = value;
    }
  }

  await docClient.send(new UpdateCommand({
    TableName: TABLE(),
    Key: { id: projectId },
    UpdateExpression: `SET ${updates.join(", ")}`,
    ExpressionAttributeValues: values,
    ...(Object.keys(names).length > 0 ? { ExpressionAttributeNames: names } : {}),
  }));
}

export async function getByLinearProjectId(params: { linearProjectId: string }): Promise<Project | null> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE(),
    IndexName: "by_linear_project",
    KeyConditionExpression: "linearProjectId = :linearProjectId",
    ExpressionAttributeValues: { ":linearProjectId": params.linearProjectId },
    Limit: 1,
  }));
  return (result.Items?.[0] as Project) ?? null;
}

export async function clearGitHubConnection(params: { projectId: string }): Promise<void> {
  await docClient.send(new UpdateCommand({
    TableName: TABLE(),
    Key: { id: params.projectId },
    UpdateExpression: "SET updatedAt = :now REMOVE githubRepoOwner, githubRepoName, githubDefaultBranch, repoUrl",
    ExpressionAttributeValues: { ":now": new Date().toISOString() },
  }));
}

export async function clearGitHubInstallation(params: { installationId: number }): Promise<void> {
  // Scan for all projects with this installation ID
  const result = await docClient.send(new ScanCommand({
    TableName: TABLE(),
    FilterExpression: "githubInstallationId = :installationId",
    ExpressionAttributeValues: { ":installationId": params.installationId },
  }));

  const projects = (result.Items ?? []) as Project[];
  const now = new Date().toISOString();

  for (const project of projects) {
    await docClient.send(new UpdateCommand({
      TableName: TABLE(),
      Key: { id: project.id },
      UpdateExpression: "SET updatedAt = :now REMOVE githubInstallationId, githubRepoOwner, githubRepoName, githubDefaultBranch, repoUrl",
      ExpressionAttributeValues: { ":now": now },
    }));
  }
}

export async function deleteProject(params: { projectId: string }): Promise<void> {
  await docClient.send(new DeleteCommand({
    TableName: TABLE(),
    Key: { id: params.projectId },
  }));
}
