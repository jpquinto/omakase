"use client";

import { useEffect, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Celebration Overlay Component
//
// Renders a fullscreen confetti animation using pure CSS keyframes. No
// external libraries required. The overlay auto-hides after 5 seconds.
// Confetti pieces are randomly positioned and colored using the Omakase
// design system's brand and accent colors.
// ---------------------------------------------------------------------------

interface CelebrationOverlayProps {
  /** Whether the overlay is currently visible */
  show: boolean;
  /** Optional callback when the celebration ends */
  onComplete?: () => void;
}

/** Colors used for confetti pieces, drawn from the Omakase design system */
const CONFETTI_COLORS = [
  "#f472b6", // oma-primary (sakura pink)
  "#f87171", // oma-secondary (beni red)
  "#fbbf24", // oma-gold
  "#6ee7b7", // oma-jade
  "#818cf8", // oma-indigo
  "#38bdf8", // oma-info (sky blue)
  "#f9a8d4", // oma-primary-soft
  "#fca5a5", // oma-secondary-soft
];

interface ConfettiPiece {
  id: number;
  left: number;       // percentage from left
  delay: number;      // animation delay in seconds
  duration: number;   // animation duration in seconds
  color: string;
  size: number;       // width in pixels
  rotation: number;   // initial rotation in degrees
  shape: "square" | "rect" | "circle";
}

/** Generates an array of randomly configured confetti pieces */
function generateConfetti(count: number): ConfettiPiece[] {
  const pieces: ConfettiPiece[] = [];
  for (let i = 0; i < count; i++) {
    const shapes = ["square", "rect", "circle"] as const;
    pieces.push({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2.5 + Math.random() * 2,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 10,
      rotation: Math.random() * 360,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
    });
  }
  return pieces;
}

export function CelebrationOverlay({ show, onComplete }: CelebrationOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [confetti] = useState(() => generateConfetti(60));

  const handleComplete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        handleComplete();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, handleComplete]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      aria-hidden="true"
    >
      {/* Confetti pieces */}
      {confetti.map((piece) => {
        const width = piece.shape === "rect" ? piece.size * 0.4 : piece.size;
        const height = piece.size;
        const borderRadius = piece.shape === "circle" ? "50%" : "0";

        return (
          <div
            key={piece.id}
            style={{
              position: "absolute",
              left: `${piece.left}%`,
              top: "-20px",
              width: `${width}px`,
              height: `${height}px`,
              backgroundColor: piece.color,
              borderRadius,
              transform: `rotate(${piece.rotation}deg)`,
              animation: `confetti-fall ${piece.duration}s ease-in ${piece.delay}s forwards`,
              opacity: 0,
              border: "1px solid rgba(0,0,0,0.15)",
            }}
          />
        );
      })}

      {/* Inline keyframes for confetti animation */}
      <style>{`
        @keyframes confetti-fall {
          0% {
            opacity: 1;
            transform: translateY(0) rotate(0deg) scale(1);
          }
          25% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(100vh) rotate(720deg) scale(0.5);
          }
        }
      `}</style>
    </div>
  );
}
