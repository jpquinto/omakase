import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * GET /api/auth/spotify
 *
 * Initiates the Spotify OAuth 2.0 authorization code flow.
 * Redirects the user to Spotify's authorize page with the required scopes.
 *
 * Required environment variables:
 *   SPOTIFY_CLIENT_ID    - Spotify application client ID
 *   SPOTIFY_REDIRECT_URI - Must match the registered redirect URI
 */
export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Spotify OAuth is not configured. Missing SPOTIFY_CLIENT_ID or SPOTIFY_REDIRECT_URI." },
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
  cookieStore.set("spotify_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "user-read-currently-playing user-read-playback-state",
    state,
  });

  return NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`,
  );
}
