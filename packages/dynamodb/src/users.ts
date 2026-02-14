import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { docClient, tableName } from "./client.js";
import type { User } from "@omakase/db";

const TABLE = () => tableName("users");

export async function upsertUser(params: {
  auth0Id: string;
  email: string;
  name: string;
  picture?: string;
  role?: string;
}): Promise<User> {
  const existing = await getUserByAuth0Id({ auth0Id: params.auth0Id });
  const now = new Date().toISOString();

  if (existing) {
    await docClient.send(new UpdateCommand({
      TableName: TABLE(),
      Key: { id: existing.id },
      UpdateExpression: "SET #name = :name, email = :email, picture = :picture, updatedAt = :updatedAt",
      ExpressionAttributeNames: { "#name": "name" },
      ExpressionAttributeValues: {
        ":name": params.name,
        ":email": params.email,
        ":picture": params.picture,
        ":updatedAt": now,
      },
    }));
    return { ...existing, name: params.name, email: params.email, picture: params.picture, updatedAt: now };
  }

  const user: User = {
    id: ulid(),
    auth0Id: params.auth0Id,
    email: params.email,
    name: params.name,
    picture: params.picture,
    role: (params.role as User["role"]) ?? "developer",
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({ TableName: TABLE(), Item: user }));
  return user;
}

export async function getUserByAuth0Id(params: { auth0Id: string }): Promise<User | null> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE(),
    IndexName: "by_auth0Id",
    KeyConditionExpression: "auth0Id = :auth0Id",
    ExpressionAttributeValues: { ":auth0Id": params.auth0Id },
    Limit: 1,
  }));
  return (result.Items?.[0] as User) ?? null;
}

export async function getUserByEmail(params: { email: string }): Promise<User | null> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE(),
    IndexName: "by_email",
    KeyConditionExpression: "email = :email",
    ExpressionAttributeValues: { ":email": params.email },
    Limit: 1,
  }));
  return (result.Items?.[0] as User) ?? null;
}
