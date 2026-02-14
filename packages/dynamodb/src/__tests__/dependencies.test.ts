import { describe, it, expect, mock, beforeEach } from "bun:test";
import type { Feature } from "@omakase/db";

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------
// We mock `docClient.send` to intercept DynamoDB calls and `listFeatures` to
// supply the in-memory feature graph used by `addDependency` for cycle
// detection via BFS.
// ---------------------------------------------------------------------------

const mockSend = mock(() => Promise.resolve({}));

mock.module("../client.js", () => ({
  docClient: { send: mockSend },
  tableName: (name: string) => `test-${name}`,
}));

const mockListFeatures = mock(() => Promise.resolve([] as Feature[]));

mock.module("../features.js", () => ({
  listFeatures: mockListFeatures,
}));

// Import AFTER mocking so the mocked modules are resolved
const { addDependency } = await import("../dependencies.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Feature object for testing the dependency graph. */
function makeFeature(
  id: string,
  projectId: string,
  dependencies: string[] = [],
): Feature {
  return {
    id,
    projectId,
    name: `Feature ${id}`,
    priority: 1,
    status: "pending",
    dependencies,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Cycle detection (via addDependency)", () => {
  beforeEach(() => {
    mockSend.mockReset();
    mockListFeatures.mockReset();
  });

  it("rejects a self-referencing dependency (A -> A)", async () => {
    const featureA = makeFeature("A", "proj-1", []);

    // GetCommand returns feature A
    mockSend.mockResolvedValueOnce({ Item: featureA });
    // listFeatures returns the full project graph
    mockListFeatures.mockResolvedValueOnce([featureA]);

    await expect(
      addDependency({ featureId: "A", dependsOnId: "A" }),
    ).rejects.toThrow("circular dependency");
  });

  it("rejects a simple cycle (A -> B -> A)", async () => {
    const featureA = makeFeature("A", "proj-1", []);
    const featureB = makeFeature("B", "proj-1", ["A"]); // B already depends on A

    // GetCommand returns feature A (the feature we are adding a dep to)
    mockSend.mockResolvedValueOnce({ Item: featureA });
    // listFeatures returns the full graph
    mockListFeatures.mockResolvedValueOnce([featureA, featureB]);

    // Trying to add A -> B would create A -> B -> A
    await expect(
      addDependency({ featureId: "A", dependsOnId: "B" }),
    ).rejects.toThrow("circular dependency");
  });

  it("rejects a transitive cycle (A -> B -> C -> A)", async () => {
    const featureA = makeFeature("A", "proj-1", []);
    const featureB = makeFeature("B", "proj-1", ["A"]); // B -> A
    const featureC = makeFeature("C", "proj-1", ["B"]); // C -> B

    // GetCommand returns feature A
    mockSend.mockResolvedValueOnce({ Item: featureA });
    // listFeatures returns the full graph
    mockListFeatures.mockResolvedValueOnce([featureA, featureB, featureC]);

    // Trying to add A -> C would create A -> C -> B -> A
    await expect(
      addDependency({ featureId: "A", dependsOnId: "C" }),
    ).rejects.toThrow("circular dependency");
  });

  it("allows a valid dependency (A -> B, no existing cycle)", async () => {
    const featureA = makeFeature("A", "proj-1", []);
    const featureB = makeFeature("B", "proj-1", []);

    // GetCommand returns feature A
    mockSend.mockResolvedValueOnce({ Item: featureA });
    // listFeatures returns the full graph
    mockListFeatures.mockResolvedValueOnce([featureA, featureB]);
    // UpdateCommand succeeds (writes the new dependency)
    mockSend.mockResolvedValueOnce({});

    await expect(
      addDependency({ featureId: "A", dependsOnId: "B" }),
    ).resolves.toBeUndefined();

    // The second send call should be the UpdateCommand that persists the dep
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it("allows a diamond dependency (A->B, A->C, B->D, C->D)", async () => {
    // Diamond: no cycle, just shared descendants
    const featureA = makeFeature("A", "proj-1", ["B"]); // A already depends on B
    const featureB = makeFeature("B", "proj-1", ["D"]); // B depends on D
    const featureC = makeFeature("C", "proj-1", ["D"]); // C depends on D
    const featureD = makeFeature("D", "proj-1", []);

    // GetCommand returns feature A (adding A -> C)
    mockSend.mockResolvedValueOnce({ Item: featureA });
    // listFeatures returns the full graph
    mockListFeatures.mockResolvedValueOnce([featureA, featureB, featureC, featureD]);
    // UpdateCommand succeeds
    mockSend.mockResolvedValueOnce({});

    await expect(
      addDependency({ featureId: "A", dependsOnId: "C" }),
    ).resolves.toBeUndefined();

    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it("succeeds when the dependency graph is empty (single feature, no deps)", async () => {
    const featureA = makeFeature("A", "proj-1", []);
    const featureB = makeFeature("B", "proj-1", []);

    // GetCommand returns feature A
    mockSend.mockResolvedValueOnce({ Item: featureA });
    // listFeatures returns features with no existing edges
    mockListFeatures.mockResolvedValueOnce([featureA, featureB]);
    // UpdateCommand succeeds
    mockSend.mockResolvedValueOnce({});

    await expect(
      addDependency({ featureId: "A", dependsOnId: "B" }),
    ).resolves.toBeUndefined();
  });

  it("throws when the source feature does not exist", async () => {
    // GetCommand returns no item
    mockSend.mockResolvedValueOnce({ Item: undefined });

    await expect(
      addDependency({ featureId: "MISSING", dependsOnId: "B" }),
    ).rejects.toThrow("Feature MISSING not found");
  });
});
