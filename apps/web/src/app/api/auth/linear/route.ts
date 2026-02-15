import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * GET /api/auth/linear
 *
 * Initiates the Linear OAuth 2.0 authorization code flow at the workspace level.
 * No projectId is required — the connection is workspace-scoped.
 *
 * 1. Generates a cryptographically random state token for CSRF protection.
 * 2. Stores the state in an HTTP-only cookie.
 * 3. Redirects the user to the Linear authorization page.
 *
 * Required environment variables:
 *   LINEAR_CLIENT_ID    - OAuth application client ID from Linear
 *   LINEAR_REDIRECT_URI - Must match the registered redirect URI
 */
export async function GET() {
  const clientId = process.env.LINEAR_CLIENT_ID;
  const redirectUri = process.env.LINEAR_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Linear OAuth is not configured. Missing LINEAR_CLIENT_ID or LINEAR_REDIRECT_URI." },
      { status: 500 },
    );
  }

  // Generate a random state token for CSRF protection.
  const stateBytes = new Uint8Array(32);
  crypto.getRandomValues(stateBytes);
  const state = Array.from(stateBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Persist the state in an HTTP-only cookie so the callback can verify it.
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  cookieStore.set("linear_oauth_state", state, cookieOptions);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "read,write",
    state,
    prompt: "consent",
  });

  const authorizeUrl = `https://linear.app/oauth/authorize?${params.toString()}`;

  return NextResponse.redirect(authorizeUrl);
}
