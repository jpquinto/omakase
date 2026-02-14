import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const rawClient = new DynamoDBClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

export const docClient = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX ?? "autoforge-";

export function tableName(name: string): string {
  return `${TABLE_PREFIX}${name}`;
}
