/**
 * Retrieves a project's Linear OAuth credentials from the orchestrator API.
 *
 * This helper is used by the Linear API routes to resolve the access token
 * and team ID for a given Omakase project. The orchestrator stores these
 * values after the user completes the Linear OAuth flow.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_ORCHESTRATOR_URL ?? "http://localhost:8080";

interface ProjectResponse {
  linearAccessToken?: string;
  linearTeamId?: string;
}

/**
 * Fetch a project from the orchestrator and extract its Linear credentials.
 *
 * @param projectId - The Omakase project ID.
 * @returns The access token and team ID, or `null` if the project has not
 *          been connected to Linear.
 */
export async function getProjectLinearToken(
  projectId: string,
): Promise<{ accessToken: string; teamId: string } | null> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
    headers: { "Content-Type": "application/json" },
    // Revalidate on every request -- tokens may be rotated at any time.
    cache: "no-store",
  });

  if (!response.ok) {
    console.error(
      `[get-project-token] Failed to fetch project ${projectId}: ${response.status} ${response.statusText}`,
    );
    return null;
  }

  const project: ProjectResponse = await response.json();

  if (!project.linearAccessToken || !project.linearTeamId) {
    return null;
  }

  return {
    accessToken: project.linearAccessToken,
    teamId: project.linearTeamId,
  };
}
