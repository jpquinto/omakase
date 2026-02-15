import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiFetch } from "@/lib/api-client";

/**
 * GET /api/auth/linear/callback
 *
 * Handles the OAuth 2.0 callback from Linear. Stores the token at the
 * workspace level (not per-project) and triggers project sync.
 *
 * Flow:
 * 1. Validate the `state` parameter against the cookie.
 * 2. Exchange the authorisation `code` for an access token.
 * 3. Fetch organization and team info from Linear.
 * 4. Create or update the workspace record via the orchestrator.
 * 5. Trigger project sync to discover Linear projects.
 * 6. Redirect to /projects with a success indicator.
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

  // Clear the OAuth cookie immediately -- it is single-use.
  cookieStore.delete("linear_oauth_state");

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
  // 3. Fetch organization and team info from Linear
  // ------------------------------------------------------------------
  let organizationId = "";
  let organizationName = "";
  let defaultTeamId = "";

  try {
    const viewerResponse = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenData.access_token}`,
      },
      body: JSON.stringify({
        query: `{
          viewer {
            organization {
              id
              name
              teams { nodes { id key name } }
            }
          }
        }`,
      }),
    });
    const viewerData = await viewerResponse.json() as {
      data?: {
        viewer: {
          organization: {
            id: string;
            name: string;
            teams: { nodes: { id: string; key: string; name: string }[] };
          };
        };
      };
    };
    const org = viewerData.data?.viewer?.organization;
    organizationId = org?.id ?? "";
    organizationName = org?.name ?? "";
    defaultTeamId = org?.teams?.nodes?.[0]?.id ?? "";
  } catch (err) {
    console.warn("[Linear OAuth] Failed to fetch organization from Linear:", err);
  }

  // ------------------------------------------------------------------
  // 4. Create or update workspace via orchestrator
  // ------------------------------------------------------------------
  let workspaceId: string | undefined;

  try {
    // Check if a workspace already exists for this Linear organization.
    if (organizationId) {
      const existingRes = await apiFetch<{ id: string } | null>(
        `/api/workspaces/by-linear-org/${organizationId}`,
      );
      if (existingRes?.id) {
        workspaceId = existingRes.id;
        // Update the existing workspace with the new token.
        await apiFetch(`/api/workspaces/${workspaceId}`, {
          method: "PATCH",
          body: JSON.stringify({
            linearAccessToken: tokenData.access_token,
            linearOrganizationName: organizationName,
            linearDefaultTeamId: defaultTeamId,
          }),
        });
      }
    }

    if (!workspaceId) {
      // Create a new workspace.
      const newWorkspace = await apiFetch<{ id: string }>(`/api/workspaces`, {
        method: "POST",
        body: JSON.stringify({
          linearAccessToken: tokenData.access_token,
          linearOrganizationId: organizationId,
          linearOrganizationName: organizationName,
          linearDefaultTeamId: defaultTeamId,
        }),
      });
      workspaceId = newWorkspace.id;
    }

    console.log("[Linear OAuth] Workspace stored:", workspaceId);
  } catch (err) {
    console.error("[Linear OAuth] Failed to persist workspace:", err);
    const redirectUrl = new URL("/projects", request.url);
    redirectUrl.searchParams.set("linear_error", "Failed to save Linear credentials");
    return NextResponse.redirect(redirectUrl);
  }

  // ------------------------------------------------------------------
  // 5. Trigger project sync to discover Linear projects
  // ------------------------------------------------------------------
  try {
    await apiFetch(`/api/workspaces/${workspaceId}/sync-projects`, {
      method: "POST",
    });
    console.log("[Linear OAuth] Project sync triggered for workspace:", workspaceId);
  } catch (err) {
    // Non-critical — project sync can be done manually later.
    console.warn("[Linear OAuth] Project sync failed:", err);
  }

  // ------------------------------------------------------------------
  // 6. Redirect to /projects with a success message
  // ------------------------------------------------------------------
  const redirectUrl = new URL("/projects", request.url);
  redirectUrl.searchParams.set("linear_connected", "true");
  return NextResponse.redirect(redirectUrl);
}
