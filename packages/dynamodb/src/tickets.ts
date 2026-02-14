import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { docClient, tableName } from "./client.js";
import type { Ticket } from "@autoforge/db";

const TABLE = () => tableName("tickets");

export async function syncTicket(params: {
  projectId: string;
  linearIssueId: string;
  linearIssueUrl: string;
  title: string;
  description?: string;
  priority: number;
  status: string;
  labels?: string[];
  featureId?: string;
}): Promise<Ticket> {
  const now = new Date().toISOString();

  // Check if ticket already exists
  const existing = await docClient.send(new QueryCommand({
    TableName: TABLE(),
    IndexName: "by_linearIssueId",
    KeyConditionExpression: "linearIssueId = :linearIssueId",
    ExpressionAttributeValues: { ":linearIssueId": params.linearIssueId },
    Limit: 1,
  }));

  if (existing.Items && existing.Items.length > 0) {
    const ticket = existing.Items[0] as Ticket;
    await docClient.send(new UpdateCommand({
      TableName: TABLE(),
      Key: { id: ticket.id },
      UpdateExpression: "SET title = :title, description = :description, priority = :priority, #status = :status, labels = :labels, syncedAt = :syncedAt",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":title": params.title,
        ":description": params.description,
        ":priority": params.priority,
        ":status": params.status,
        ":labels": params.labels ?? [],
        ":syncedAt": now,
      },
    }));
    return { ...ticket, title: params.title, description: params.description, priority: params.priority, status: params.status, labels: params.labels ?? ticket.labels, syncedAt: now };
  }

  const ticket: Ticket = {
    id: ulid(),
    projectId: params.projectId,
    featureId: params.featureId,
    linearIssueId: params.linearIssueId,
    linearIssueUrl: params.linearIssueUrl,
    title: params.title,
    description: params.description,
    priority: params.priority,
    status: params.status,
    labels: params.labels ?? [],
    syncedAt: now,
  };

  await docClient.send(new PutCommand({ TableName: TABLE(), Item: ticket }));
  return ticket;
}

export async function updateTicketStatus(params: {
  ticketId: string;
  status: string;
}): Promise<void> {
  await docClient.send(new UpdateCommand({
    TableName: TABLE(),
    Key: { id: params.ticketId },
    UpdateExpression: "SET #status = :status, syncedAt = :syncedAt",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":status": params.status,
      ":syncedAt": new Date().toISOString(),
    },
  }));
}
