/**
 * @omakase/db — TypeScript type definitions for the Omakase data model.
 *
 * This package provides canonical type definitions shared between backend
 * services and frontend. Types are aligned with the DynamoDB table schemas.
 *
 * Usage:
 *   import type { Project, Feature, Agent } from "@omakase/db";
 */

export type {
  User,
  UserRole,
  NewUser,
  Project,
  ProjectStatus,
  NewProject,
  Feature,
  FeatureStatus,
  NewFeature,
  Agent,
  AgentRole,
  AgentStatus,
  NewAgent,
  AgentRun,
  AgentRunRole,
  AgentRunStatus,
  NewAgentRun,
  Ticket,
  NewTicket,
  AgentMessage,
  AgentMessageSender,
  AgentMessageType,
  NewAgentMessage,
} from "./schema/index.js";
