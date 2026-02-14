import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/spotify/playback
 *
 * Controls Spotify playback: play/pause, next, previous.
 * Body: { action: "play" | "pause" | "next" | "previous" }
 */

// Reuse the same token cache from now-playing (module-level)
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) return null;

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    console.error("[Spotify] Token refresh failed:", await response.text());
    return null;
  }

  const data = await response.json();
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

const ACTION_MAP: Record<string, { endpoint: string; method: string }> = {
  play: { endpoint: "https://api.spotify.com/v1/me/player/play", method: "PUT" },
  pause: { endpoint: "https://api.spotify.com/v1/me/player/pause", method: "PUT" },
  next: { endpoint: "https://api.spotify.com/v1/me/player/next", method: "POST" },
  previous: { endpoint: "https://api.spotify.com/v1/me/player/previous", method: "POST" },
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const action = body.action as string;

  const mapping = ACTION_MAP[action];
  if (!mapping) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }

  try {
    const res = await fetch(mapping.endpoint, {
      method: mapping.method,
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // 401 = token expired, retry once
    if (res.status === 401) {
      cachedToken = null;
      const retryToken = await getAccessToken();
      if (!retryToken) {
        return NextResponse.json({ error: "Token expired" }, { status: 401 });
      }
      const retry = await fetch(mapping.endpoint, {
        method: mapping.method,
        headers: { Authorization: `Bearer ${retryToken}` },
      });
      if (!retry.ok && retry.status !== 204) {
        return NextResponse.json({ error: "Playback control failed" }, { status: 502 });
      }
    } else if (!res.ok && res.status !== 204) {
      return NextResponse.json({ error: "Playback control failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Spotify] Playback control error:", error);
    return NextResponse.json({ error: "Playback control failed" }, { status: 502 });
  }
}
