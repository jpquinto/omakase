import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * GET /api/auth/github/callback
 *
 * GitHub redirects here after the user installs or configures the
 * Omakase GitHub App. Receives the installation_id and stores it
 * on the project via the orchestrator API.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const installationId = searchParams.get("installation_id");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("github_app_state")?.value;
  const projectId = cookieStore.get("github_app_project_id")?.value;

  // Clean up cookies
  cookieStore.delete("github_app_state");
  cookieStore.delete("github_app_project_id");

  // Validate state
  if (!state || state !== savedState) {
    return NextResponse.json(
      { error: "Invalid state parameter. Possible CSRF attack." },
      { status: 403 },
    );
  }

  if (!installationId) {
    return NextResponse.json(
      { error: "Missing installation_id from GitHub" },
      { status: 400 },
    );
  }

  if (!projectId) {
    return NextResponse.json(
      { error: "Missing project ID from session" },
      { status: 400 },
    );
  }

  // Store the installation ID on the project via orchestrator
  const orchestratorUrl = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL ?? "http://localhost:8080";

  try {
    const response = await fetch(`${orchestratorUrl}/api/projects/${projectId}/github/install`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        githubInstallationId: parseInt(installationId, 10),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[github-callback] Failed to store installation: ${response.status} ${body}`);
    }
  } catch (err) {
    console.error("[github-callback] Failed to reach orchestrator:", err);
  }

  // Redirect back to project settings
  const baseUrl = process.env.AUTH0_BASE_URL ?? request.nextUrl.origin;
  return NextResponse.redirect(`${baseUrl}/projects/${projectId}?tab=settings`);
}
