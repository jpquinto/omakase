import { NextResponse } from "next/server";

/**
 * GET /api/spotify/now-playing
 *
 * Returns the user's currently playing Spotify track.
 * Uses SPOTIFY_REFRESH_TOKEN from env to obtain access tokens —
 * no OAuth login flow required (single-user setup).
 *
 * Required env vars:
 *   SPOTIFY_CLIENT_ID
 *   SPOTIFY_CLIENT_SECRET
 *   SPOTIFY_REFRESH_TOKEN
 */

interface SpotifyTrack {
  name: string;
  artist: string;
  album: string;
  albumArt: string | null;
  duration: number;
  progress: number;
  isPlaying: boolean;
  trackUrl: string;
}

interface NowPlayingResponse {
  playing: boolean;
  track?: SpotifyTrack;
  connected: boolean;
}

// In-memory token cache (survives across requests in the same server process)
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  // Return cached token if still valid (with 60s buffer)
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

export async function GET() {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json<NowPlayingResponse>({
      playing: false,
      connected: false,
    });
  }

  try {
    const response = await fetch(
      "https://api.spotify.com/v1/me/player/currently-playing",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        next: { revalidate: 0 },
      },
    );

    // 401 = token expired, clear cache and retry once
    if (response.status === 401) {
      cachedToken = null;
      const retryToken = await getAccessToken();
      if (!retryToken) {
        return NextResponse.json<NowPlayingResponse>({ playing: false, connected: false });
      }
      const retry = await fetch(
        "https://api.spotify.com/v1/me/player/currently-playing",
        { headers: { Authorization: `Bearer ${retryToken}` } },
      );
      if (!retry.ok || retry.status === 204) {
        return NextResponse.json<NowPlayingResponse>({ playing: false, connected: true });
      }
      const retryData = await retry.json();
      return NextResponse.json<NowPlayingResponse>(formatTrack(retryData));
    }

    // 204 = nothing playing
    if (response.status === 204) {
      return NextResponse.json<NowPlayingResponse>({ playing: false, connected: true });
    }

    if (!response.ok) {
      return NextResponse.json<NowPlayingResponse>({ playing: false, connected: true });
    }

    const data = await response.json();
    return NextResponse.json<NowPlayingResponse>(formatTrack(data));
  } catch (error) {
    console.error("[Spotify] Failed to fetch now playing:", error);
    return NextResponse.json<NowPlayingResponse>({ playing: false, connected: true });
  }
}

function formatTrack(data: Record<string, unknown>): NowPlayingResponse {
  const item = data.item as Record<string, unknown> | undefined;
  if (!item) return { playing: false, connected: true };

  const artists = item.artists as { name: string }[] | undefined;
  const album = item.album as { name?: string; images?: { url: string }[] } | undefined;
  const externalUrls = item.external_urls as { spotify?: string } | undefined;

  return {
    playing: true,
    connected: true,
    track: {
      name: (item.name as string) ?? "",
      artist: artists?.map((a) => a.name).join(", ") ?? "Unknown",
      album: album?.name ?? "",
      albumArt: album?.images?.[0]?.url ?? null,
      duration: (item.duration_ms as number) ?? 0,
      progress: (data.progress_ms as number) ?? 0,
      isPlaying: (data.is_playing as boolean) ?? false,
      trackUrl: externalUrls?.spotify ?? "",
    },
  };
}
