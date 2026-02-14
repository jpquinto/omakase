export { docClient, tableName } from "./client.js";

export {
  upsertUser,
  getUserByAuth0Id,
  getUserByEmail,
} from "./users.js";

export {
  createProject,
  getProject,
  listProjects,
  listActiveProjects,
  updateProject,
  deleteProject,
} from "./projects.js";

export {
  createFeaturesBulk,
  listFeatures,
  getFeature,
  getReadyFeatures,
  claimFeature,
  markFeaturePassing,
  markFeatureFailing,
  markFeatureInProgress,
  getFeatureStats,
} from "./features.js";

export {
  addDependency,
  removeDependency,
} from "./dependencies.js";

export {
  createAgentRun,
  updateAgentStatus,
  completeAgentRun,
  listActiveAgents,
  getAgentLogs,
} from "./agent-runs.js";

export {
  syncTicket,
  updateTicketStatus,
} from "./tickets.js";
