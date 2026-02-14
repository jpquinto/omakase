import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * GET /api/auth/spotify/callback
 *
 * Handles the OAuth 2.0 callback from Spotify.
 * Exchanges the authorization code for access + refresh tokens,
 * stores them in HTTP-only cookies, and redirects to the app.
 */

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    const redirectUrl = new URL("/settings", request.url);
    redirectUrl.searchParams.set("spotify_error", error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing required parameters: code and state" },
      { status: 400 },
    );
  }

  // Validate state
  const cookieStore = await cookies();
  const storedState = cookieStore.get("spotify_oauth_state")?.value;
  cookieStore.delete("spotify_oauth_state");

  if (!storedState || storedState !== state) {
    return NextResponse.json(
      { error: "Invalid state parameter. Possible CSRF attack." },
      { status: 401 },
    );
  }

  // Exchange code for tokens
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: "Spotify OAuth is not configured on the server." },
      { status: 500 },
    );
  }

  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
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
    console.error("[Spotify OAuth] Token exchange failed:", body);
    const redirectUrl = new URL("/settings", request.url);
    redirectUrl.searchParams.set("spotify_error", "Failed to exchange authorization code");
    return NextResponse.redirect(redirectUrl);
  }

  const tokenData: SpotifyTokenResponse = await tokenResponse.json();

  // Store tokens in HTTP-only cookies
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };

  cookieStore.set("spotify_access_token", tokenData.access_token, {
    ...cookieOptions,
    maxAge: tokenData.expires_in,
  });

  cookieStore.set("spotify_refresh_token", tokenData.refresh_token, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  const redirectUrl = new URL("/settings", request.url);
  redirectUrl.searchParams.set("spotify_connected", "true");
  return NextResponse.redirect(redirectUrl);
}
