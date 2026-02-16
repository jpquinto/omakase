import { describe, it, expect } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

describe("README.md", () => {
  const readmePath = join(process.cwd(), "README.md");

  it("exists at the project root", () => {
    expect(existsSync(readmePath)).toBe(true);
  });

  it("contains the project title 'Omakase'", () => {
    const content = readFileSync(readmePath, "utf-8");
    expect(content).toContain("# Omakase");
  });

  it("contains the project description", () => {
    const content = readFileSync(readmePath, "utf-8");
    expect(content).toContain(
      "An autonomous development platform powered by Claude Code",
    );
    expect(content).toContain(
      "architect, coder, reviewer, and tester",
    );
  });

  it("contains 'Hello from Linear' text added by Test PR feature", () => {
    const content = readFileSync(readmePath, "utf-8");
    expect(content).toContain("Hello from Linear");
  });

  it("has 'Hello from Linear' as a separate paragraph after the description", () => {
    const content = readFileSync(readmePath, "utf-8");
    const lines = content.split("\n");

    // Find the line containing "Hello from Linear"
    const helloLineIndex = lines.findIndex((line) =>
      line.includes("Hello from Linear"),
    );

    expect(helloLineIndex).toBeGreaterThan(0); // Not at the very start

    // Verify there's a blank line before "Hello from Linear"
    // (proper markdown paragraph separation)
    expect(lines[helloLineIndex - 1]?.trim()).toBe("");
  });

  it("ends with a single newline character (Unix convention)", () => {
    const content = readFileSync(readmePath, "utf-8");
    expect(content.endsWith("\n")).toBe(true);
    expect(content.endsWith("\n\n")).toBe(false);
  });

  it("has valid markdown structure with no syntax errors", () => {
    const content = readFileSync(readmePath, "utf-8");

    // Basic markdown validation: should start with heading
    expect(content.trimStart().startsWith("#")).toBe(true);

    // Should not have malformed headings (e.g., missing space after #)
    const headingPattern = /^#{1,6} .+/m;
    const hasValidHeading = headingPattern.test(content);
    expect(hasValidHeading).toBe(true);
  });
});
