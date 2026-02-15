export { docClient, tableName } from "./client.js";

export {
  upsertUser,
  getUserByAuth0Id,
  getUserByEmail,
} from "./users.js";

export {
  createProject,
  getProject,
  getByLinearProjectId,
  listProjects,
  listActiveProjects,
  updateProject,
  clearGitHubConnection,
  clearGitHubInstallation,
  deleteProject,
} from "./projects.js";

export {
  createFeaturesBulk,
  createFeature,
  createFromLinear,
  listFeatures,
  getFeature,
  getByLinearIssueId,
  getReadyFeatures,
  claimFeature,
  markFeatureReviewReady,
  transitionReviewReadyToPassing,
  markFeaturePassing,
  markFeatureFailing,
  markFeatureInProgress,
  updateFromLinear,
  bulkSyncFromLinear,
  updateFeature,
  deleteFeature,
  getFeatureStats,
} from "./features.js";

export {
  addDependency,
  removeDependency,
} from "./dependencies.js";

export {
  createAgentRun,
  getAgentRun,
  updateAgentStatus,
  completeAgentRun,
  listActiveAgents,
  getAgentLogs,
  listRunsByAgentName,
  getAgentStatsByName,
  getAgentActivityByName,
} from "./agent-runs.js";

export {
  createWorkspace,
  getWorkspace,
  getByLinearOrgId,
  updateWorkspace,
  clearLinearConnection,
} from "./workspaces.js";

export {
  createMessage,
  listMessages,
  listMessagesByFeature,
  listMessagesByThread,
} from "./agent-messages.js";

export {
  createThread,
  getThread,
  listThreadsByAgent,
  updateThread,
  updateThreadMetadata,
} from "./agent-threads.js";
export type { PaginatedThreads } from "./agent-threads.js";

export {
  createMemory,
  listMemories,
  deleteMemory,
  deleteMemoriesByAgentProject,
} from "./agent-memories.js";

export {
  getPersonality,
  putPersonality,
  deletePersonality,
} from "./agent-personalities.js";

export {
  DEFAULT_PERSONALITIES,
  getDefaultPersonality,
} from "./default-personalities.js";
