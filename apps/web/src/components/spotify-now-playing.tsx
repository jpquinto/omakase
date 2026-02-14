"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Music, Pause, ExternalLink } from "lucide-react";
import { useSpotifyNowPlaying } from "@/hooks/use-spotify-now-playing";

/**
 * SpotifyNowPlaying — Compact glass mini-player for the navbar.
 *
 * Shows the currently playing Spotify track with album art, scrolling
 * track name, artist, and a thin progress bar. When nothing is playing
 * or Spotify isn't connected, it shows a minimal idle/connect state.
 */
export function SpotifyNowPlaying() {
  const { track, connected, isLoading } = useSpotifyNowPlaying(5000);
  const [hovered, setHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const prevTrackRef = useRef<string | null>(null);
  const [trackChanged, setTrackChanged] = useState(false);

  // Detect track changes for the crossfade animation
  useEffect(() => {
    if (track?.name && track.name !== prevTrackRef.current) {
      setTrackChanged(true);
      setImgLoaded(false);
      const t = setTimeout(() => setTrackChanged(false), 500);
      prevTrackRef.current = track.name;
      return () => clearTimeout(t);
    }
  }, [track?.name]);

  const progressPct = track
    ? Math.min((track.progress / track.duration) * 100, 100)
    : 0;

  // Not connected or not configured — hide entirely
  if (!isLoading && !connected) return null;

  // Loading or nothing playing — minimal idle state
  if (isLoading || !track) {
    if (!connected) return null;
    return (
      <div className="flex items-center gap-2 rounded-oma px-3 py-1.5 text-xs text-oma-text-faint">
        <SpotifyIcon className="size-3.5 text-oma-primary opacity-30" />
        <span className="hidden sm:inline">Not playing</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group/player relative flex items-center gap-2.5 rounded-oma-lg transition-all duration-500",
        "glass-sm px-2 py-1.5",
        hovered && "shadow-oma-sm",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Album art */}
      <div className="relative size-8 shrink-0 overflow-hidden rounded-oma-sm">
        {/* Glow behind album art */}
        {track.albumArt && imgLoaded && (
          <div
            className="pointer-events-none absolute -inset-2 -z-10 opacity-40 blur-lg transition-opacity duration-700"
            style={{
              backgroundImage: `url(${track.albumArt})`,
              backgroundSize: "cover",
            }}
          />
        )}
        {track.albumArt ? (
          <img
            src={track.albumArt}
            alt={track.album}
            className={cn(
              "size-full object-cover transition-all duration-500",
              trackChanged ? "scale-110 opacity-0" : "scale-100 opacity-100",
              track.isPlaying && "animate-[spin_8s_linear_infinite]",
              !track.isPlaying && "[animation-play-state:paused]",
            )}
            style={{
              animationPlayState: track.isPlaying ? "running" : "paused",
              borderRadius: "50%",
            }}
            onLoad={() => setImgLoaded(true)}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-oma-bg-surface">
            <Music className="size-3.5 text-oma-text-subtle" />
          </div>
        )}

        {/* Pause overlay on hover */}
        {!track.isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Pause className="size-3 text-white" />
          </div>
        )}
      </div>

      {/* Track info */}
      <div className="flex min-w-0 max-w-[140px] flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          {/* Playing indicator bars */}
          {track.isPlaying && (
            <div className="flex items-end gap-[2px]">
              <span className="inline-block w-[2px] animate-[equalizer_0.8s_ease-in-out_infinite] rounded-full bg-oma-primary" style={{ height: "8px" }} />
              <span className="inline-block w-[2px] animate-[equalizer_0.8s_ease-in-out_infinite_0.2s] rounded-full bg-oma-primary" style={{ height: "12px" }} />
              <span className="inline-block w-[2px] animate-[equalizer_0.8s_ease-in-out_infinite_0.4s] rounded-full bg-oma-primary" style={{ height: "6px" }} />
            </div>
          )}
          <MarqueeText
            text={track.name}
            className="text-[11px] font-semibold leading-tight text-oma-text"
          />
        </div>
        <MarqueeText
          text={track.artist}
          className="text-[10px] leading-tight text-oma-text-subtle"
        />
      </div>

      {/* Spotify link — appears on hover */}
      <a
        href={track.trackUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full transition-all duration-300",
          "opacity-0 group-hover/player:opacity-100",
          "hover:bg-oma-primary/15 hover:text-oma-primary",
          "text-oma-text-subtle",
        )}
        title="Open in Spotify"
      >
        <ExternalLink className="size-3" />
      </a>

      {/* Progress bar — thin line at the bottom */}
      <div className="absolute inset-x-2 -bottom-px h-[2px] overflow-hidden rounded-full bg-oma-bg-surface/50">
        <div
          className="h-full rounded-full bg-oma-primary/60 transition-[width] duration-1000 ease-linear"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Marquee text — scrolls if content overflows
// ---------------------------------------------------------------------------

function MarqueeText({ text, className }: { text: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;
    setShouldScroll(textEl.scrollWidth > container.clientWidth);
  }, [text]);

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden whitespace-nowrap", className)}>
      <span
        ref={textRef}
        className={cn(
          "inline-block",
          shouldScroll && "animate-[marquee_8s_linear_infinite]",
        )}
      >
        {text}
      </span>
      {shouldScroll && (
        <span className="inline-block animate-[marquee_8s_linear_infinite] pl-8" aria-hidden>
          {text}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spotify brand icon (inline SVG for consistency)
// ---------------------------------------------------------------------------

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}
