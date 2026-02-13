import { describe, it, expect } from "vitest";
import { detectCycle } from "../lib/graph-utils";

describe("detectCycle", () => {
  it("detects a direct cycle (A -> B -> A)", () => {
    // B already depends on A. Adding A -> B would create A -> B -> A.
    const graph = new Map<string, string[]>();
    graph.set("A", []);
    graph.set("B", ["A"]);

    expect(detectCycle(graph, "A", "B")).toBe(true);
  });

  it("detects an indirect cycle (A -> B -> C -> A)", () => {
    // C depends on B, B depends on A. Adding A -> C closes the loop.
    const graph = new Map<string, string[]>();
    graph.set("A", []);
    graph.set("B", ["A"]);
    graph.set("C", ["B"]);

    expect(detectCycle(graph, "A", "C")).toBe(true);
  });

  it("allows a valid dependency that does not create a cycle", () => {
    // A has no deps, B has no deps. Adding A -> B is safe.
    const graph = new Map<string, string[]>();
    graph.set("A", []);
    graph.set("B", []);

    expect(detectCycle(graph, "A", "B")).toBe(false);
  });

  it("handles an empty graph", () => {
    const graph = new Map<string, string[]>();

    // Neither node has any edges; adding X -> Y is safe
    expect(detectCycle(graph, "X", "Y")).toBe(false);
  });

  it("detects a self-loop", () => {
    const graph = new Map<string, string[]>();
    graph.set("A", []);

    expect(detectCycle(graph, "A", "A")).toBe(true);
  });

  it("handles a complex graph without a cycle", () => {
    // Diamond-shaped DAG: D depends on B and C, both B and C depend on A
    //
    //     A
    //    / \
    //   B   C
    //    \ /
    //     D
    //
    const graph = new Map<string, string[]>();
    graph.set("A", []);
    graph.set("B", ["A"]);
    graph.set("C", ["A"]);
    graph.set("D", ["B", "C"]);

    // Adding E -> D is safe (E is a new node with no dependents)
    expect(detectCycle(graph, "E", "D")).toBe(false);

    // Adding D -> A would NOT create a cycle through the graph structure
    // because A does not transitively depend on D. Let's verify:
    // Starting from A, we follow A's deps = [] -- we never reach D.
    expect(detectCycle(graph, "D", "A")).toBe(false);

    // But adding A -> D WOULD create a cycle: A -> D -> B -> A
    expect(detectCycle(graph, "A", "D")).toBe(true);
  });

  it("handles a long chain without a cycle", () => {
    // Linear chain: E -> D -> C -> B -> A
    const graph = new Map<string, string[]>();
    graph.set("A", []);
    graph.set("B", ["A"]);
    graph.set("C", ["B"]);
    graph.set("D", ["C"]);
    graph.set("E", ["D"]);

    // Adding F -> E is safe
    expect(detectCycle(graph, "F", "E")).toBe(false);

    // Adding A -> E would create a cycle: A -> E -> D -> C -> B -> A
    expect(detectCycle(graph, "A", "E")).toBe(true);

    // Adding C -> A is safe (A doesn't reach C)
    expect(detectCycle(graph, "C", "A")).toBe(false);
  });

  it("handles nodes not present in the graph map", () => {
    // If the target node has no entry in the graph, BFS should still work
    const graph = new Map<string, string[]>();
    graph.set("A", ["B"]); // A depends on B, but B has no entry

    // Adding C -> A is safe since A's deps (B) don't lead to C
    expect(detectCycle(graph, "C", "A")).toBe(false);
  });
});
