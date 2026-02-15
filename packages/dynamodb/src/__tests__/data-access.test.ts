import { describe, it, expect, mock, beforeEach } from "bun:test";
import type { Feature, Project, User, AgentRun } from "@omakase/db";

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------
// All modules under test import `docClient` from `./client.js`. We mock it
// globally so every `send()` call is intercepted. Each test configures the
// mock return value to simulate DynamoDB responses.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock accepts any DynamoDB command
const mockSend = mock((_cmd: any) => Promise.resolve({} as any));

mock.module("../client.js", () => ({
  docClient: { send: mockSend },
  tableName: (name: string) => `test-${name}`,
}));

// Import modules AFTER mocking so they pick up the mocked client
const { getReadyFeatures, getFeatureStats, claimFeature, markFeaturePassing } =
  await import("../features.js");
const { listActiveProjects } = await import("../projects.js");
const { getUserByAuth0Id } = await import("../users.js");
const { listActiveAgents, getAgentLogs } = await import("../agent-runs.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFeature(
  overrides: Partial<Feature> & { id: string },
): Feature {
  return {
    projectId: "proj-1",
    name: `Feature ${overrides.id}`,
    priority: 1,
    status: "pending",
    dependencies: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeAgentRun(
  overrides: Partial<AgentRun> & { id: string },
): AgentRun {
  return {
    agentId: "agent-1",
    projectId: "proj-1",
    featureId: "feat-1",
    role: "coder",
    status: "started",
    startedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

describe("Features", () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  describe("getReadyFeatures", () => {
    it("returns pending features whose dependencies all have status 'passing'", async () => {
      const depFeature = makeFeature({ id: "dep-1", status: "passing" });
      const readyFeature = makeFeature({
        id: "feat-1",
        status: "pending",
        dependencies: ["dep-1"],
      });

      // listFeatures -> QueryCommand
      mockSend.mockResolvedValueOnce({
        Items: [depFeature, readyFeature],
      });

      const result = await getReadyFeatures({ projectId: "proj-1" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("feat-1");
    });

    it("excludes features with non-passing dependencies", async () => {
      const depFeature = makeFeature({ id: "dep-1", status: "in_progress" });
      const blockedFeature = makeFeature({
        id: "feat-1",
        status: "pending",
        dependencies: ["dep-1"],
      });

      mockSend.mockResolvedValueOnce({
        Items: [depFeature, blockedFeature],
      });

      const result = await getReadyFeatures({ projectId: "proj-1" });
      expect(result).toHaveLength(0);
    });

    it("excludes non-pending features", async () => {
      const inProgressFeature = makeFeature({
        id: "feat-1",
        status: "in_progress",
        dependencies: [],
      });
      const passingFeature = makeFeature({
        id: "feat-2",
        status: "passing",
        dependencies: [],
      });

      mockSend.mockResolvedValueOnce({
        Items: [inProgressFeature, passingFeature],
      });

      const result = await getReadyFeatures({ projectId: "proj-1" });
      expect(result).toHaveLength(0);
    });

    it("returns pending features with no dependencies", async () => {
      const noDepsFeature = makeFeature({
        id: "feat-1",
        status: "pending",
        dependencies: [],
      });

      mockSend.mockResolvedValueOnce({ Items: [noDepsFeature] });

      const result = await getReadyFeatures({ projectId: "proj-1" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("feat-1");
    });
  });

  describe("getFeatureStats", () => {
    it("returns correct aggregate counts", async () => {
      const features = [
        makeFeature({ id: "1", status: "pending" }),
        makeFeature({ id: "2", status: "pending" }),
        makeFeature({ id: "3", status: "in_progress" }),
        makeFeature({ id: "4", status: "passing" }),
        makeFeature({ id: "5", status: "failing" }),
      ];

      mockSend.mockResolvedValueOnce({ Items: features });

      const stats = await getFeatureStats({ projectId: "proj-1" });
      expect(stats).toEqual({
        total: 5,
        pending: 2,
        inProgress: 1,
        reviewReady: 0,
        passing: 1,
        failing: 1,
      });
    });

    it("returns all zeros for an empty project", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });

      const stats = await getFeatureStats({ projectId: "proj-1" });
      expect(stats).toEqual({
        total: 0,
        pending: 0,
        inProgress: 0,
        reviewReady: 0,
        passing: 0,
        failing: 0,
      });
    });
  });

  describe("claimFeature", () => {
    it("returns null when no ready features exist", async () => {
      // listFeatures returns only non-pending features
      const inProgress = makeFeature({
        id: "feat-1",
        status: "in_progress",
      });

      mockSend.mockResolvedValueOnce({ Items: [inProgress] });

      const result = await claimFeature({
        projectId: "proj-1",
        agentId: "agent-1",
      });
      expect(result).toBeNull();
    });

    it("claims the highest-priority ready feature", async () => {
      const lowPriority = makeFeature({
        id: "feat-low",
        status: "pending",
        priority: 10,
      });
      const highPriority = makeFeature({
        id: "feat-high",
        status: "pending",
        priority: 1,
      });

      // listFeatures (QueryCommand for getReadyFeatures)
      mockSend.mockResolvedValueOnce({
        Items: [lowPriority, highPriority],
      });
      // UpdateCommand for the optimistic claim succeeds
      mockSend.mockResolvedValueOnce({});

      const result = await claimFeature({
        projectId: "proj-1",
        agentId: "agent-1",
      });

      expect(result).not.toBeNull();
      expect(result!.id).toBe("feat-high");
      expect(result!.status).toBe("in_progress");
      expect(result!.assignedAgentId).toBe("agent-1");
    });

    it("skips features that were claimed by another agent (ConditionalCheckFailed)", async () => {
      const feat1 = makeFeature({ id: "feat-1", status: "pending", priority: 1 });
      const feat2 = makeFeature({ id: "feat-2", status: "pending", priority: 2 });

      // listFeatures
      mockSend.mockResolvedValueOnce({ Items: [feat1, feat2] });
      // First UpdateCommand fails with ConditionalCheckFailedException
      const condError = new Error("Condition not met");
      (condError as unknown as { name: string }).name = "ConditionalCheckFailedException";
      mockSend.mockRejectedValueOnce(condError);
      // Second UpdateCommand succeeds (falls through to feat-2)
      mockSend.mockResolvedValueOnce({});

      const result = await claimFeature({
        projectId: "proj-1",
        agentId: "agent-1",
      });

      expect(result).not.toBeNull();
      expect(result!.id).toBe("feat-2");
    });
  });

  describe("markFeaturePassing", () => {
    it("calls UpdateCommand with correct status", async () => {
      mockSend.mockResolvedValueOnce({});

      await markFeaturePassing({ featureId: "feat-1" });

      expect(mockSend).toHaveBeenCalledTimes(1);

      // Verify the UpdateCommand was called with the right parameters
      const call = mockSend.mock.calls[0];
      const command = call[0];
      expect(command.input).toMatchObject({
        TableName: "test-features",
        Key: { id: "feat-1" },
        ExpressionAttributeValues: expect.objectContaining({
          ":status": "passing",
        }),
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

describe("Projects", () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  describe("listActiveProjects", () => {
    it("queries by_status GSI with 'active'", async () => {
      const activeProject: Project = {
        id: "proj-1",
        name: "Test Project",
        ownerId: "user-1",
        members: [],
        status: "active",
        maxConcurrency: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockSend.mockResolvedValueOnce({ Items: [activeProject] });

      const result = await listActiveProjects();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("proj-1");
      expect(result[0].status).toBe("active");

      // Verify the QueryCommand targeted the by_status index
      const call = mockSend.mock.calls[0];
      const command = call[0];
      expect(command.input).toMatchObject({
        IndexName: "by_status",
        ExpressionAttributeValues: { ":status": "active" },
      });
    });

    it("returns empty array when no active projects exist", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });

      const result = await listActiveProjects();
      expect(result).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

describe("Users", () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  describe("getUserByAuth0Id", () => {
    it("queries by_auth0Id GSI and returns the user", async () => {
      const user: User = {
        id: "user-1",
        auth0Id: "auth0|123",
        email: "test@example.com",
        name: "Test User",
        role: "developer",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockSend.mockResolvedValueOnce({ Items: [user] });

      const result = await getUserByAuth0Id({ auth0Id: "auth0|123" });
      expect(result).not.toBeNull();
      expect(result!.id).toBe("user-1");
      expect(result!.auth0Id).toBe("auth0|123");

      // Verify it targeted the by_auth0Id GSI
      const call = mockSend.mock.calls[0];
      const command = call[0];
      expect(command.input).toMatchObject({
        IndexName: "by_auth0Id",
        ExpressionAttributeValues: { ":auth0Id": "auth0|123" },
        Limit: 1,
      });
    });

    it("returns null when no user matches", async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });

      const result = await getUserByAuth0Id({ auth0Id: "auth0|nonexistent" });
      expect(result).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Agent Runs
// ---------------------------------------------------------------------------

describe("Agent Runs", () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  describe("listActiveAgents", () => {
    it("filters out completed and failed runs", async () => {
      const runs: AgentRun[] = [
        makeAgentRun({ id: "run-1", status: "started" }),
        makeAgentRun({ id: "run-2", status: "coding" }),
        makeAgentRun({ id: "run-3", status: "completed" }),
        makeAgentRun({ id: "run-4", status: "failed" }),
        makeAgentRun({ id: "run-5", status: "reviewing" }),
      ];

      mockSend.mockResolvedValueOnce({ Items: runs });

      const result = await listActiveAgents({ projectId: "proj-1" });

      // Only started, coding, and reviewing should remain
      expect(result).toHaveLength(3);
      const ids = result.map((r) => r.id);
      expect(ids).toContain("run-1");
      expect(ids).toContain("run-2");
      expect(ids).toContain("run-5");
      expect(ids).not.toContain("run-3");
      expect(ids).not.toContain("run-4");
    });

    it("returns empty array when all runs are terminal", async () => {
      const runs: AgentRun[] = [
        makeAgentRun({ id: "run-1", status: "completed" }),
        makeAgentRun({ id: "run-2", status: "failed" }),
      ];

      mockSend.mockResolvedValueOnce({ Items: runs });

      const result = await listActiveAgents({ projectId: "proj-1" });
      expect(result).toHaveLength(0);
    });
  });

  describe("getAgentLogs", () => {
    it("throws when neither featureId nor agentId is provided", async () => {
      await expect(getAgentLogs({})).rejects.toThrow(
        "Either featureId or agentId must be provided",
      );
    });

    it("queries by_feature GSI when featureId is provided", async () => {
      const run = makeAgentRun({ id: "run-1", featureId: "feat-1" });
      mockSend.mockResolvedValueOnce({ Items: [run] });

      const result = await getAgentLogs({ featureId: "feat-1" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("run-1");

      const command = mockSend.mock.calls[0][0];
      expect(command.input).toMatchObject({
        IndexName: "by_feature",
        ExpressionAttributeValues: { ":featureId": "feat-1" },
      });
    });

    it("queries by_agent GSI when agentId is provided", async () => {
      const run = makeAgentRun({ id: "run-1", agentId: "agent-42" });
      mockSend.mockResolvedValueOnce({ Items: [run] });

      const result = await getAgentLogs({ agentId: "agent-42" });
      expect(result).toHaveLength(1);

      const command = mockSend.mock.calls[0][0];
      expect(command.input).toMatchObject({
        IndexName: "by_agent",
        ExpressionAttributeValues: { ":agentId": "agent-42" },
      });
    });

    it("prefers featureId when both featureId and agentId are provided", async () => {
      const run = makeAgentRun({
        id: "run-1",
        featureId: "feat-1",
        agentId: "agent-42",
      });
      mockSend.mockResolvedValueOnce({ Items: [run] });

      const result = await getAgentLogs({
        featureId: "feat-1",
        agentId: "agent-42",
      });
      expect(result).toHaveLength(1);

      // Should use by_feature, not by_agent, since featureId is checked first
      const command = mockSend.mock.calls[0][0];
      expect(command.input).toMatchObject({
        IndexName: "by_feature",
      });
    });
  });
});
