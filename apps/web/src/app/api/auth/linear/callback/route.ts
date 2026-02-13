import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

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
 * 3. Store the access token in Convex (placeholder mutation).
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

  // Clear the state cookie immediately -- it is single-use.
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
  // 3. Store the access token in Convex
  // ------------------------------------------------------------------
  // TODO: Replace with an actual Convex mutation call to persist the
  // Linear access token against the current project/user.
  //
  // Example:
  //   import { fetchMutation } from "convex/nextjs";
  //   import { api } from "@convex/_generated/api";
  //   await fetchMutation(api.projects.setLinearAccessToken, {
  //     projectId,
  //     linearAccessToken: tokenData.access_token,
  //   });
  //
  console.log("[Linear OAuth] Access token obtained successfully. Scope:", tokenData.scope);

  // ------------------------------------------------------------------
  // 4. Redirect to /projects with a success message
  // ------------------------------------------------------------------
  const redirectUrl = new URL("/projects", request.url);
  redirectUrl.searchParams.set("linear_connected", "true");
  return NextResponse.redirect(redirectUrl);
}
