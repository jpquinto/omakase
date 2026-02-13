import { describe, it, expect } from "vitest";
import { isFeatureReady, computeFeatureStats } from "../lib/feature-utils";

describe("isFeatureReady", () => {
  it("returns true for a pending feature with no dependencies", () => {
    const feature = { status: "pending", dependencies: [] };
    const depStatuses = new Map<string, string>();

    expect(isFeatureReady(feature, depStatuses)).toBe(true);
  });

  it("returns true when all dependencies are passing", () => {
    const feature = { status: "pending", dependencies: ["dep1", "dep2"] };
    const depStatuses = new Map<string, string>([
      ["dep1", "passing"],
      ["dep2", "passing"],
    ]);

    expect(isFeatureReady(feature, depStatuses)).toBe(true);
  });

  it("returns false when any dependency is not passing", () => {
    const feature = { status: "pending", dependencies: ["dep1", "dep2"] };
    const depStatuses = new Map<string, string>([
      ["dep1", "passing"],
      ["dep2", "in_progress"],
    ]);

    expect(isFeatureReady(feature, depStatuses)).toBe(false);
  });

  it("returns false when a dependency is pending", () => {
    const feature = { status: "pending", dependencies: ["dep1"] };
    const depStatuses = new Map<string, string>([["dep1", "pending"]]);

    expect(isFeatureReady(feature, depStatuses)).toBe(false);
  });

  it("returns false when a dependency is failing", () => {
    const feature = { status: "pending", dependencies: ["dep1"] };
    const depStatuses = new Map<string, string>([["dep1", "failing"]]);

    expect(isFeatureReady(feature, depStatuses)).toBe(false);
  });

  it("returns false when a dependency status is missing from the map", () => {
    const feature = { status: "pending", dependencies: ["dep1"] };
    const depStatuses = new Map<string, string>();

    expect(isFeatureReady(feature, depStatuses)).toBe(false);
  });

  it("returns false for a feature that is already in_progress", () => {
    const feature = { status: "in_progress", dependencies: [] };
    const depStatuses = new Map<string, string>();

    expect(isFeatureReady(feature, depStatuses)).toBe(false);
  });

  it("returns false for a feature that is already passing", () => {
    const feature = { status: "passing", dependencies: [] };
    const depStatuses = new Map<string, string>();

    expect(isFeatureReady(feature, depStatuses)).toBe(false);
  });

  it("returns false for a feature that is failing", () => {
    const feature = { status: "failing", dependencies: [] };
    const depStatuses = new Map<string, string>();

    expect(isFeatureReady(feature, depStatuses)).toBe(false);
  });
});

describe("computeFeatureStats", () => {
  it("returns all zeros for an empty array", () => {
    const stats = computeFeatureStats([]);

    expect(stats).toEqual({
      total: 0,
      pending: 0,
      inProgress: 0,
      passing: 0,
      failing: 0,
    });
  });

  it("counts a single pending feature", () => {
    const stats = computeFeatureStats([{ status: "pending" }]);

    expect(stats).toEqual({
      total: 1,
      pending: 1,
      inProgress: 0,
      passing: 0,
      failing: 0,
    });
  });

  it("counts features across all statuses", () => {
    const features = [
      { status: "pending" },
      { status: "pending" },
      { status: "in_progress" },
      { status: "passing" },
      { status: "passing" },
      { status: "passing" },
      { status: "failing" },
    ];

    const stats = computeFeatureStats(features);

    expect(stats).toEqual({
      total: 7,
      pending: 2,
      inProgress: 1,
      passing: 3,
      failing: 1,
    });
  });

  it("handles unknown status gracefully (counted in total only)", () => {
    const features = [
      { status: "pending" },
      { status: "unknown_status" },
    ];

    const stats = computeFeatureStats(features);

    expect(stats.total).toBe(2);
    expect(stats.pending).toBe(1);
    // The unknown status is in total but not in any specific bucket
    expect(stats.inProgress + stats.passing + stats.failing).toBe(0);
  });

  it("handles all features in one status", () => {
    const features = [
      { status: "passing" },
      { status: "passing" },
      { status: "passing" },
    ];

    const stats = computeFeatureStats(features);

    expect(stats).toEqual({
      total: 3,
      pending: 0,
      inProgress: 0,
      passing: 3,
      failing: 0,
    });
  });
});
