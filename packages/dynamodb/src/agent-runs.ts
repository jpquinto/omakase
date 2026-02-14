import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { docClient, tableName } from "./client.js";
import { createMessage } from "./agent-messages.js";
import type { AgentRun, AgentRunRole, AgentRunStatus } from "@omakase/db";

const TABLE = () => tableName("agent-runs");

export async function createAgentRun(params: {
  agentId: string;
  projectId: string;
  featureId: string;
  role: AgentRunRole;
}): Promise<string> {
  const now = new Date().toISOString();
  const run: AgentRun = {
    id: ulid(),
    agentId: params.agentId,
    projectId: params.projectId,
    featureId: params.featureId,
    role: params.role,
    status: "started",
    startedAt: now,
  };
  await docClient.send(new PutCommand({ TableName: TABLE(), Item: run }));
  return run.id;
}

export async function updateAgentStatus(params: {
  runId: string;
  status: AgentRunStatus;
  output?: string;
}): Promise<void> {
  let updateExpr = "SET #status = :status";
  const values: Record<string, unknown> = { ":status": params.status };
  const names: Record<string, string> = { "#status": "status" };

  if (params.output !== undefined) {
    updateExpr += ", output = :output";
    values[":output"] = params.output;
  }

  await docClient.send(new UpdateCommand({
    TableName: TABLE(),
    Key: { id: params.runId },
    UpdateExpression: updateExpr,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));

  // Post a status message to the chat stream
  const run = await getAgentRun({ runId: params.runId });
  if (run) {
    const label = STATUS_LABELS[params.status] ?? params.status;
    await createMessage({
      runId: params.runId,
      featureId: run.featureId,
      projectId: run.projectId,
      sender: "agent",
      role: run.role,
      content: `${label} phase`,
      type: "status",
    });
  }
}

const STATUS_LABELS: Partial<Record<AgentRunStatus, string>> = {
  started: "Started",
  thinking: "Thinking",
  coding: "Coding",
  testing: "Testing",
  reviewing: "Reviewing",
};

export async function completeAgentRun(params: {
  runId: string;
  status: "completed" | "failed";
  outputSummary?: string;
  errorMessage?: string;
}): Promise<void> {
  // Get the run to calculate duration
  const result = await docClient.send(new GetCommand({
    TableName: TABLE(),
    Key: { id: params.runId },
  }));

  const now = new Date().toISOString();
  let durationMs: number | undefined;

  if (result.Item) {
    const run = result.Item as AgentRun;
    durationMs = new Date(now).getTime() - new Date(run.startedAt).getTime();
  }

  let updateExpr = "SET #status = :status, completedAt = :completedAt";
  const values: Record<string, unknown> = {
    ":status": params.status,
    ":completedAt": now,
  };
  const names: Record<string, string> = { "#status": "status" };

  if (durationMs !== undefined) {
    updateExpr += ", durationMs = :durationMs";
    values[":durationMs"] = durationMs;
  }
  if (params.outputSummary !== undefined) {
    updateExpr += ", outputSummary = :outputSummary";
    values[":outputSummary"] = params.outputSummary;
  }
  if (params.errorMessage !== undefined) {
    updateExpr += ", errorMessage = :errorMessage";
    values[":errorMessage"] = params.errorMessage;
  }

  await docClient.send(new UpdateCommand({
    TableName: TABLE(),
    Key: { id: params.runId },
    UpdateExpression: updateExpr,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));

  // Post a completion/error message to the chat stream
  const run = result.Item as AgentRun | undefined;
  if (run) {
    if (params.status === "failed") {
      await createMessage({
        runId: params.runId,
        featureId: run.featureId,
        projectId: run.projectId,
        sender: "agent",
        role: run.role,
        content: params.errorMessage ?? "Agent failed",
        type: "error",
      });
    } else {
      await createMessage({
        runId: params.runId,
        featureId: run.featureId,
        projectId: run.projectId,
        sender: "agent",
        role: run.role,
        content: params.outputSummary ?? "Completed successfully",
        type: "status",
      });
    }
  }
}

export async function getAgentRun(params: { runId: string }): Promise<AgentRun | null> {
  const result = await docClient.send(new GetCommand({
    TableName: TABLE(),
    Key: { id: params.runId },
  }));
  return (result.Item as AgentRun) ?? null;
}

export async function listActiveAgents(params: { projectId: string }): Promise<AgentRun[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE(),
    IndexName: "by_project",
    KeyConditionExpression: "projectId = :projectId",
    ExpressionAttributeValues: { ":projectId": params.projectId },
  }));
  const runs = (result.Items ?? []) as AgentRun[];
  return runs.filter((r) => r.status !== "completed" && r.status !== "failed");
}

export async function getAgentLogs(params: {
  featureId?: string;
  agentId?: string;
}): Promise<AgentRun[]> {
  if (params.featureId) {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE(),
      IndexName: "by_feature",
      KeyConditionExpression: "featureId = :featureId",
      ExpressionAttributeValues: { ":featureId": params.featureId },
    }));
    return (result.Items ?? []) as AgentRun[];
  }

  if (params.agentId) {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE(),
      IndexName: "by_agent",
      KeyConditionExpression: "agentId = :agentId",
      ExpressionAttributeValues: { ":agentId": params.agentId },
    }));
    return (result.Items ?? []) as AgentRun[];
  }

  throw new Error("Either featureId or agentId must be provided");
}
