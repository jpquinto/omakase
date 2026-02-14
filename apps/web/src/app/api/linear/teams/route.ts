import { NextRequest, NextResponse } from "next/server";
import { listLinearTeams } from "@omakase/shared";
import { getProjectLinearToken } from "@/lib/linear/get-project-token";

/**
 * GET /api/linear/teams
 *
 * Returns the Linear teams accessible by the project's stored OAuth token.
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
    const data = await listLinearTeams(credentials.accessToken);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Linear Teams] Failed to fetch teams:", message);
    return NextResponse.json(
      { error: "Failed to fetch Linear teams" },
      { status: 502 },
    );
  }
}
