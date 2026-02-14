"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface SpotifyTrack {
  name: string;
  artist: string;
  album: string;
  albumArt: string | null;
  duration: number;
  progress: number;
  isPlaying: boolean;
  trackUrl: string;
}

interface NowPlayingState {
  track: SpotifyTrack | null;
  connected: boolean;
  isLoading: boolean;
}

/**
 * Polls the Spotify now-playing API route every `intervalMs` milliseconds.
 * Also interpolates progress locally between polls for smooth progress bar updates.
 */
export function useSpotifyNowPlaying(intervalMs = 5000): NowPlayingState {
  const [state, setState] = useState<NowPlayingState>({
    track: null,
    connected: false,
    isLoading: true,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFetchRef = useRef(0);

  const fetchNowPlaying = useCallback(async () => {
    try {
      const res = await fetch("/api/spotify/now-playing");
      if (!res.ok) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }
      const data = await res.json();
      lastFetchRef.current = Date.now();

      if (data.playing && data.track) {
        setState({
          track: data.track,
          connected: true,
          isLoading: false,
        });
      } else {
        setState({
          track: null,
          connected: data.connected ?? false,
          isLoading: false,
        });
      }
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Poll for track data
  useEffect(() => {
    void fetchNowPlaying();
    intervalRef.current = setInterval(() => {
      void fetchNowPlaying();
    }, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNowPlaying, intervalMs]);

  // Interpolate progress locally every second for smooth bar updates
  useEffect(() => {
    if (state.track?.isPlaying) {
      progressRef.current = setInterval(() => {
        setState((prev) => {
          if (!prev.track || !prev.track.isPlaying) return prev;
          const elapsed = Date.now() - lastFetchRef.current;
          const newProgress = Math.min(
            prev.track.progress + elapsed,
            prev.track.duration,
          );
          // Only update the progress field without re-creating the track reference
          return {
            ...prev,
            track: { ...prev.track, progress: newProgress },
          };
        });
      }, 1000);
    }
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [state.track?.isPlaying, state.track?.name]);

  return state;
}
