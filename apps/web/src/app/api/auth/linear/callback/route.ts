import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiFetch } from "@/lib/api-client";

/**
 * GET /api/auth/linear/callback
 *
 * Handles the OAuth 2.0 callback from Linear after the user has authorised
 * (or denied) access.
 *
 * Flow:
 * 1. Validate the `state` parameter against the value stored in the cookie
 *    to prevent CSRF attacks.
 * 2. Exchange the authorisation `code` for an access token via the Linear
 *    token endpoint.
 * 3. Store the access token via the orchestrator API (placeholder).
 * 4. Redirect the user to /projects with a success indicator.
 *
 * Required environment variables:
 *   LINEAR_CLIENT_ID      - OAuth application client ID
 *   LINEAR_CLIENT_SECRET   - OAuth application client secret
 *   LINEAR_REDIRECT_URI    - Must match the registered redirect URI
 */

interface LinearTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  scope: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // If the user denied access, redirect with an error message.
  if (error) {
    const errorDescription = searchParams.get("error_description") ?? "Authorization denied";
    const redirectUrl = new URL("/projects", request.url);
    redirectUrl.searchParams.set("linear_error", errorDescription);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing required parameters: code and state" },
      { status: 400 },
    );
  }

  // ------------------------------------------------------------------
  // 1. Validate state to prevent CSRF
  // ------------------------------------------------------------------
  const cookieStore = await cookies();
  const storedState = cookieStore.get("linear_oauth_state")?.value;

  const projectId = cookieStore.get("linear_oauth_project_id")?.value;

  // Clear the OAuth cookies immediately -- they are single-use.
  cookieStore.delete("linear_oauth_state");
  cookieStore.delete("linear_oauth_project_id");

  if (!storedState || storedState !== state) {
    return NextResponse.json(
      { error: "Invalid state parameter. Possible CSRF attack." },
      { status: 401 },
    );
  }

  // ------------------------------------------------------------------
  // 2. Exchange the code for an access token
  // ------------------------------------------------------------------
  const clientId = process.env.LINEAR_CLIENT_ID;
  const clientSecret = process.env.LINEAR_CLIENT_SECRET;
  const redirectUri = process.env.LINEAR_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: "Linear OAuth is not configured on the server." },
      { status: 500 },
    );
  }

  const tokenResponse = await fetch("https://api.linear.app/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    console.error("[Linear OAuth] Token exchange failed:", body);
    const redirectUrl = new URL("/projects", request.url);
    redirectUrl.searchParams.set("linear_error", "Failed to exchange authorization code");
    return NextResponse.redirect(redirectUrl);
  }

  const tokenData: LinearTokenResponse = await tokenResponse.json();

  // ------------------------------------------------------------------
  // 3. Store the access token via the orchestrator API
  // ------------------------------------------------------------------
  if (!projectId) {
    console.error("[Linear OAuth] No projectId found in OAuth state cookie.");
    const redirectUrl = new URL("/projects", request.url);
    redirectUrl.searchParams.set("linear_error", "Missing project context for OAuth flow");
    return NextResponse.redirect(redirectUrl);
  }

  // Fetch the user's default team from Linear to store alongside the token.
  let linearTeamId: string | undefined;
  try {
    const viewerResponse = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenData.access_token}`,
      },
      body: JSON.stringify({
        query: `{ viewer { organization { teams { nodes { id key name } } } } }`,
      }),
    });
    const viewerData = await viewerResponse.json() as {
      data?: { viewer: { organization: { teams: { nodes: { id: string; key: string; name: string }[] } } } };
    };
    linearTeamId = viewerData.data?.viewer?.organization?.teams?.nodes?.[0]?.id;
  } catch (err) {
    console.warn("[Linear OAuth] Failed to fetch team from Linear:", err);
  }

  try {
    await apiFetch(`/api/projects/${projectId}/linear-token`, {
      method: "POST",
      body: JSON.stringify({
        linearAccessToken: tokenData.access_token,
        linearTeamId: linearTeamId ?? "",
      }),
    });
    console.log("[Linear OAuth] Access token persisted for project:", projectId);
  } catch (err) {
    console.error("[Linear OAuth] Failed to persist access token:", err);
    const redirectUrl = new URL("/projects", request.url);
    redirectUrl.searchParams.set("linear_error", "Failed to save Linear credentials");
    return NextResponse.redirect(redirectUrl);
  }

  // ------------------------------------------------------------------
  // 4. Redirect to /projects with a success message
  // ------------------------------------------------------------------
  const redirectUrl = new URL("/projects", request.url);
  redirectUrl.searchParams.set("linear_connected", "true");
  return NextResponse.redirect(redirectUrl);
}
