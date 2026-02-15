/**
 * Retrieves Linear OAuth credentials by resolving the token from the
 * project's associated workspace via the orchestrator API.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_ORCHESTRATOR_URL ?? "http://localhost:8080";

interface ProjectResponse {
  workspaceId?: string;
  linearProjectId?: string;
}

interface WorkspaceResponse {
  linearAccessToken?: string;
  linearDefaultTeamId?: string;
}

/**
 * Fetch a project from the orchestrator, then fetch its workspace to get
 * the Linear access token.
 *
 * @param projectId - The Omakase project ID.
 * @returns The access token and team ID, or `null` if not connected.
 */
export async function getProjectLinearToken(
  projectId: string,
): Promise<{ accessToken: string; teamId: string } | null> {
  // 1. Fetch the project to get its workspaceId
  const projectRes = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!projectRes.ok) {
    console.error(
      `[get-project-token] Failed to fetch project ${projectId}: ${projectRes.status} ${projectRes.statusText}`,
    );
    return null;
  }

  const project: ProjectResponse = await projectRes.json();

  if (!project.workspaceId) {
    return null;
  }

  // 2. Fetch the workspace to get the Linear token
  const workspaceRes = await fetch(`${API_BASE_URL}/api/workspaces/${project.workspaceId}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!workspaceRes.ok) {
    console.error(
      `[get-project-token] Failed to fetch workspace ${project.workspaceId}: ${workspaceRes.status} ${workspaceRes.statusText}`,
    );
    return null;
  }

  const workspace: WorkspaceResponse = await workspaceRes.json();

  if (!workspace.linearAccessToken || !workspace.linearDefaultTeamId) {
    return null;
  }

  return {
    accessToken: workspace.linearAccessToken,
    teamId: workspace.linearDefaultTeamId,
  };
}
