"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Play, Pause, Volume2 } from "lucide-react";
import type { AgentRunRole } from "@omakase/db";
import { WELCOME_GLOW } from "@/lib/chat-constants";

// ---------------------------------------------------------------------------
// AudioArtifact — compact inline audio playback card for voice responses
// ---------------------------------------------------------------------------

// Pre-generated waveform bar heights (deterministic per-audioUrl)
function generateWaveform(seed: string, count: number): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    hash = ((hash * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    // Generate heights between 0.2 and 1.0 with a natural envelope
    const t = i / (count - 1);
    const envelope = Math.sin(t * Math.PI) * 0.6 + 0.4;
    const raw = (hash % 100) / 100;
    bars.push(Math.max(0.15, raw * envelope));
  }
  return bars;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface AudioArtifactProps {
  /** URL of the audio file to play */
  audioUrl: string;
  /** Duration in seconds (used for display before audio loads) */
  duration: number;
  /** Agent role — determines accent color */
  role: AgentRunRole;
  /** Agent display name */
  agentName: string;
  /** Additional class names */
  className?: string;
}

const BAR_COUNT = 32;

export function AudioArtifact({
  audioUrl,
  duration,
  role,
  agentName,
  className,
}: AudioArtifactProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0–1
  const [currentTime, setCurrentTime] = useState(0);
  const [actualDuration, setActualDuration] = useState(duration);

  const colorRgb = WELCOME_GLOW[role];
  const waveform = generateWaveform(audioUrl, BAR_COUNT);

  // Lazily create audio element
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio(audioUrl);
      audio.preload = "metadata";
      audio.addEventListener("loadedmetadata", () => {
        if (audio.duration && isFinite(audio.duration)) {
          setActualDuration(audio.duration);
        }
      });
      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      });
      audioRef.current = audio;
    }
    return audioRef.current;
  }, [audioUrl]);

  // Animation loop for progress tracking
  useEffect(() => {
    if (!isPlaying) return;
    const audio = audioRef.current;
    if (!audio) return;

    const tick = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setProgress(audio.currentTime / audio.duration);
        setCurrentTime(audio.currentTime);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlayback = () => {
    const audio = getAudio();
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = getAudio();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const clamped = Math.max(0, Math.min(1, x));
    if (audio.duration && isFinite(audio.duration)) {
      audio.currentTime = clamped * audio.duration;
      setProgress(clamped);
      setCurrentTime(audio.currentTime);
    }
  };

  const displayTime = isPlaying || progress > 0
    ? formatDuration(currentTime)
    : formatDuration(actualDuration);

  const progressIndex = Math.floor(progress * BAR_COUNT);

  return (
    <div
      className={cn(
        "glass-sm inline-flex items-center gap-3 rounded-oma-lg px-3.5 py-2.5",
        "border border-oma-glass-border transition-all duration-300",
        "hover:border-oma-glass-border-bright hover:shadow-oma-sm",
        "max-w-[320px] select-none",
        className,
      )}
    >
      {/* Play / Pause button */}
      <button
        onClick={togglePlayback}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          backgroundColor: `rgba(${colorRgb}, 0.15)`,
          boxShadow: isPlaying ? `0 0 16px rgba(${colorRgb}, 0.25)` : "none",
        }}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause
            className="h-4 w-4"
            style={{ color: `rgba(${colorRgb}, 1)` }}
          />
        ) : (
          <Play
            className="h-4 w-4 ml-0.5"
            style={{ color: `rgba(${colorRgb}, 1)` }}
          />
        )}
      </button>

      {/* Waveform + metadata */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* Waveform bars — clickable to seek */}
        <div
          className="flex h-6 cursor-pointer items-end gap-[2px]"
          onClick={seekTo}
          role="slider"
          aria-label="Audio progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          {waveform.map((height, i) => {
            const isPast = i <= progressIndex && (isPlaying || progress > 0);
            return (
              <span
                key={i}
                className="flex-1 rounded-full transition-all duration-150"
                style={{
                  height: `${height * 100}%`,
                  minHeight: "2px",
                  backgroundColor: isPast
                    ? `rgba(${colorRgb}, 0.85)`
                    : `rgba(${colorRgb}, 0.2)`,
                  animation: isPlaying
                    ? `audio-bar-pulse 1.2s ease-in-out ${i * 0.04}s infinite`
                    : "none",
                  transformOrigin: "bottom",
                }}
              />
            );
          })}
        </div>

        {/* Footer: label + duration */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Volume2
              className="h-3 w-3"
              style={{ color: `rgba(${colorRgb}, 0.6)` }}
            />
            <span className="text-[10px] font-medium text-oma-text-subtle">
              {agentName}&apos;s voice
            </span>
          </div>
          <span
            className="font-mono text-[10px] tabular-nums"
            style={{ color: `rgba(${colorRgb}, 0.7)` }}
          >
            {displayTime}
          </span>
        </div>
      </div>
    </div>
  );
}
