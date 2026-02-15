import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * GET /api/auth/github
 *
 * Redirects the user to install the Omakase GitHub App.
 * Stores the projectId in an HTTP-only cookie so the callback can
 * associate the installation with the correct project.
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

  const appSlug = process.env.GITHUB_APP_SLUG;
  if (!appSlug) {
    return NextResponse.json(
      { error: "GitHub App is not configured. Missing GITHUB_APP_SLUG." },
      { status: 500 },
    );
  }

  // Generate a random state token for CSRF protection.
  const stateBytes = new Uint8Array(32);
  crypto.getRandomValues(stateBytes);
  const state = Array.from(stateBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  cookieStore.set("github_app_state", state, cookieOptions);
  cookieStore.set("github_app_project_id", projectId, cookieOptions);

  const installUrl = `https://github.com/apps/${appSlug}/installations/new?state=${state}`;

  return NextResponse.redirect(installUrl);
}
