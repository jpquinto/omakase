"use client";

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// VoiceBlob — animated SVG blob overlay shown during TTS playback
// ---------------------------------------------------------------------------

interface VoiceBlobProps {
  /** Whether the blob is visible (TTS speaking) */
  active: boolean;
  /** Agent's RGB color string, e.g. "251, 191, 36" */
  colorRgb: string;
  /** Agent mascot emoji */
  mascot: string;
  /** Called when the user taps the overlay to stop speaking */
  onStop?: () => void;
  /** Live caption text (streaming content) displayed below the blob */
  caption?: string;
  /** Additional class names on the root overlay */
  className?: string;
}

export function VoiceBlob({ active, colorRgb, mascot, onStop, caption, className }: VoiceBlobProps) {
  if (!active) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex items-center justify-center overflow-hidden",
        className,
      )}
      onClick={onStop}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Escape" || e.key === " ") onStop?.(); }}
      aria-label="Stop speaking"
    >
      {/* Frosted glass backdrop */}
      <div className="absolute inset-0 bg-oma-bg/60 backdrop-blur-xl" />

      {/* Live caption */}
      {caption && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-[80%] max-w-md pointer-events-none">
          <p className="text-center text-sm leading-relaxed text-oma-text-muted line-clamp-3">
            {caption}
          </p>
        </div>
      )}

      {/* Hint text */}
      <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-oma-text-faint animate-[oma-fade-up_0.6s_ease-out_0.5s_both]">
        Tap anywhere to stop
      </span>

      {/* Blob container — centered with enter animation */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: "320px",
          height: "320px",
          animation: "voice-blob-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
      >
        {/* Layer 1 — outermost, slowest drift */}
        <svg
          viewBox="-100 -100 200 200"
          className="absolute inset-0 h-full w-full"
          style={{
            animation: "oma-blob-drift-1 12s ease-in-out infinite",
            filter: `drop-shadow(0 0 40px rgba(${colorRgb}, 0.3))`,
          }}
        >
          <path
            fill={`rgba(${colorRgb}, 0.08)`}
            style={{
              animation: "voice-blob-morph-1 8s ease-in-out infinite",
              transformOrigin: "center",
            }}
          />
        </svg>

        {/* Layer 2 — mid layer */}
        <svg
          viewBox="-100 -100 200 200"
          className="absolute inset-0 h-full w-full"
          style={{
            animation: "oma-blob-drift-2 10s ease-in-out infinite",
            filter: `drop-shadow(0 0 30px rgba(${colorRgb}, 0.25))`,
          }}
        >
          <path
            fill={`rgba(${colorRgb}, 0.12)`}
            style={{
              animation: "voice-blob-morph-2 7s ease-in-out infinite",
              transformOrigin: "center",
            }}
          />
        </svg>

        {/* Layer 3 — inner, fastest morph */}
        <svg
          viewBox="-100 -100 200 200"
          className="absolute inset-0 h-full w-full"
          style={{
            animation: "oma-blob-drift-3 8s ease-in-out infinite",
            filter: `drop-shadow(0 0 60px rgba(${colorRgb}, 0.4))`,
          }}
        >
          <path
            fill={`rgba(${colorRgb}, 0.18)`}
            style={{
              animation: "voice-blob-morph-3 5s ease-in-out infinite",
              transformOrigin: "center",
            }}
          />
        </svg>

        {/* Core glow — solid center radial */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: "140px",
            height: "140px",
            background: `radial-gradient(circle, rgba(${colorRgb}, 0.25) 0%, rgba(${colorRgb}, 0.08) 50%, transparent 70%)`,
            animation: "oma-breathe 3s ease-in-out infinite",
          }}
        />

        {/* Mascot emoji — breathing in the center */}
        <span
          className="absolute left-1/2 top-1/2 text-6xl select-none"
          style={{
            animation: "voice-mascot-breathe 2.5s ease-in-out infinite",
          }}
        >
          {mascot}
        </span>

        {/* Orbiting particle ring */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: "240px",
            height: "240px",
            animation: "voice-orbit 20s linear infinite",
          }}
        >
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <span
              key={deg}
              className="absolute left-1/2 top-0 -translate-x-1/2 rounded-full"
              style={{
                width: "4px",
                height: "4px",
                backgroundColor: `rgba(${colorRgb}, 0.5)`,
                transform: `rotate(${deg}deg) translateY(-120px)`,
                transformOrigin: "50% 120px",
                animation: `oma-breathe ${2 + (deg % 3) * 0.5}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
