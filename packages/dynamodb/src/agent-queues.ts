import { DeleteCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { docClient, tableName } from "./client.js";
import type { QueuedJob } from "@omakase/db";

const TABLE = () => tableName("agent-queues");

/** Gap between position values to allow easy reordering without shifting all items. */
const POSITION_GAP = 10;

/**
 * Pad position to a fixed-width string so DynamoDB's lexicographic sort
 * on the SK produces the correct numeric order.
 * Supports positions up to 999_999_999.
 */
function positionKey(position: number, jobId: string): string {
  return `${String(position).padStart(10, "0")}#${jobId}`;
}

/**
 * Enqueue a new job for an agent.
 * Generates a ULID for jobId, calculates the next position using gap numbering,
 * and stores the item in DynamoDB.
 */
export async function enqueueJob(
  job: Omit<QueuedJob, "jobId">,
): Promise<QueuedJob> {
  const jobId = ulid();

  // Determine next position: query for the highest existing position
  const lastResult = await docClient.send(new QueryCommand({
    TableName: TABLE(),
    KeyConditionExpression: "agentName = :agentName",
    ExpressionAttributeValues: { ":agentName": job.agentName },
    ScanIndexForward: false, // descending — highest position first
    Limit: 1,
    ProjectionExpression: "#pos",
    ExpressionAttributeNames: { "#pos": "position" },
  }));

  const lastPosition = lastResult.Items?.[0]
    ? (lastResult.Items[0] as { position: number }).position
    : 0;
  const nextPosition = lastPosition + POSITION_GAP;

  const item: QueuedJob = {
    ...job,
    jobId,
    position: nextPosition,
  };

  await docClient.send(new PutCommand({
    TableName: TABLE(),
    Item: {
      ...item,
      sk: positionKey(nextPosition, jobId),
    },
  }));

  return item;
}

/**
 * Dequeue the next job: get the first queued job (lowest position)
 * and atomically mark it as "processing".
 */
export async function dequeueJob(agentName: string): Promise<QueuedJob | null> {
  const job = await peekJob(agentName);
  if (!job) return null;

  const now = new Date().toISOString();

  await docClient.send(new UpdateCommand({
    TableName: TABLE(),
    Key: { agentName, sk: positionKey(job.position, job.jobId) },
    UpdateExpression: "SET #status = :processing, startedAt = :now",
    ConditionExpression: "#status = :queued",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":processing": "processing",
      ":queued": "queued",
      ":now": now,
    },
  }));

  return { ...job, status: "processing", startedAt: now };
}

/**
 * Peek at the next queued job without changing its status.
 * Returns the job with the lowest position that is still "queued".
 */
export async function peekJob(agentName: string): Promise<QueuedJob | null> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE(),
    KeyConditionExpression: "agentName = :agentName",
    FilterExpression: "#status = :queued",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":agentName": agentName,
      ":queued": "queued",
    },
    ScanIndexForward: true, // ascending — lowest position first
    Limit: 1,
  }));

  if (!result.Items || result.Items.length === 0) return null;
  return stripSk(result.Items[0] as QueuedJob & { sk: string });
}

/** Remove a job from the queue entirely. */
export async function removeJob(agentName: string, jobId: string): Promise<void> {
  // We need the position to construct the SK. Query for the specific job.
  const job = await findJobById(agentName, jobId);
  if (!job) return;

  await docClient.send(new DeleteCommand({
    TableName: TABLE(),
    Key: { agentName, sk: positionKey(job.position, job.jobId) },
  }));
}

/** Update a job's position for reordering. */
export async function reorderJob(
  agentName: string,
  jobId: string,
  newPosition: number,
): Promise<void> {
  const job = await findJobById(agentName, jobId);
  if (!job) return;

  // Delete the old item and re-insert with the new position (SK changes)
  await docClient.send(new DeleteCommand({
    TableName: TABLE(),
    Key: { agentName, sk: positionKey(job.position, job.jobId) },
  }));

  await docClient.send(new PutCommand({
    TableName: TABLE(),
    Item: {
      ...job,
      position: newPosition,
      sk: positionKey(newPosition, jobId),
    },
  }));
}

/**
 * List all queued jobs for an agent, ordered by position (ascending).
 * Only returns jobs with status "queued".
 */
export async function listQueue(agentName: string): Promise<QueuedJob[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE(),
    KeyConditionExpression: "agentName = :agentName",
    FilterExpression: "#status = :queued",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":agentName": agentName,
      ":queued": "queued",
    },
    ScanIndexForward: true,
  }));

  return ((result.Items ?? []) as (QueuedJob & { sk: string })[]).map(stripSk);
}

/** Return the count of queued jobs for an agent. */
export async function getQueueDepth(agentName: string): Promise<number> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE(),
    KeyConditionExpression: "agentName = :agentName",
    FilterExpression: "#status = :queued",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":agentName": agentName,
      ":queued": "queued",
    },
    Select: "COUNT",
  }));

  return result.Count ?? 0;
}

/** Mark a job as completed with a timestamp. */
export async function markJobCompleted(agentName: string, jobId: string): Promise<void> {
  const job = await findJobById(agentName, jobId);
  if (!job) return;

  const now = new Date().toISOString();

  await docClient.send(new UpdateCommand({
    TableName: TABLE(),
    Key: { agentName, sk: positionKey(job.position, job.jobId) },
    UpdateExpression: "SET #status = :completed, completedAt = :now",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":completed": "completed",
      ":now": now,
    },
  }));
}

/** Mark a job as failed with an error message. */
export async function markJobFailed(
  agentName: string,
  jobId: string,
  error: string,
): Promise<void> {
  const job = await findJobById(agentName, jobId);
  if (!job) return;

  const now = new Date().toISOString();

  await docClient.send(new UpdateCommand({
    TableName: TABLE(),
    Key: { agentName, sk: positionKey(job.position, job.jobId) },
    UpdateExpression: "SET #status = :failed, completedAt = :now, errorMessage = :error",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":failed": "failed",
      ":now": now,
      ":error": error,
    },
  }));
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Find a specific job by jobId within an agent's queue.
 * Scans all items for the agent (typically small) and filters client-side.
 */
async function findJobById(agentName: string, jobId: string): Promise<QueuedJob | null> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE(),
    KeyConditionExpression: "agentName = :agentName",
    FilterExpression: "jobId = :jobId",
    ExpressionAttributeValues: {
      ":agentName": agentName,
      ":jobId": jobId,
    },
  }));

  if (!result.Items || result.Items.length === 0) return null;
  return stripSk(result.Items[0] as QueuedJob & { sk: string });
}

/** Remove the internal `sk` attribute before returning items to callers. */
function stripSk(item: QueuedJob & { sk?: string }): QueuedJob {
  const { sk: _sk, ...job } = item;
  return job as QueuedJob;
}
