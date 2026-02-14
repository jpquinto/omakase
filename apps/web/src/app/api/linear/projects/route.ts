import { NextRequest, NextResponse } from "next/server";
import { listLinearProjects } from "@omakase/shared";
import { getProjectLinearToken } from "@/lib/linear/get-project-token";

/**
 * GET /api/linear/projects
 *
 * Returns the Linear projects for the team connected to the given Omakase
 * project.
 *
 * Query parameters:
 *   projectId (required) - The Omakase project ID whose Linear token to use.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "Missing required query parameter: projectId" },
      { status: 400 },
    );
  }

  const credentials = await getProjectLinearToken(projectId);

  if (!credentials) {
    return NextResponse.json(
      { error: "Project is not connected to Linear" },
      { status: 401 },
    );
  }

  try {
    const data = await listLinearProjects({
      accessToken: credentials.accessToken,
      teamId: credentials.teamId,
    });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Linear Projects] Failed to fetch projects:", message);
    return NextResponse.json(
      { error: "Failed to fetch Linear projects" },
      { status: 502 },
    );
  }
}
