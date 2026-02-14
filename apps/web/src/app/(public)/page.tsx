"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

// ---------------------------------------------------------------------------
// Floating Glass Orb
//
// Renders a translucent gradient orb that floats gently in the background.
// Each orb has randomized size, position, and animation timing to create an
// organic, layered depth effect behind the main glass card.
// ---------------------------------------------------------------------------

interface GlassOrb {
  id: number;
  size: number;
  x: number;
  y: number;
  delay: number;
  duration: number;
  color: "pink" | "red" | "indigo" | "gold";
}

const ORB_GRADIENT_MAP: Record<GlassOrb["color"], string> = {
  pink: "radial-gradient(circle, rgba(244,114,182,0.15) 0%, rgba(244,114,182,0) 70%)",
  red: "radial-gradient(circle, rgba(248,113,113,0.12) 0%, rgba(248,113,113,0) 70%)",
  indigo: "radial-gradient(circle, rgba(129,140,248,0.12) 0%, rgba(129,140,248,0) 70%)",
  gold: "radial-gradient(circle, rgba(251,191,36,0.08) 0%, rgba(251,191,36,0) 70%)",
};

/** Generates a set of randomized orb configurations */
function generateOrbs(count: number): GlassOrb[] {
  const colors: GlassOrb["color"][] = ["pink", "red", "indigo", "gold"];
  const orbs: GlassOrb[] = [];

  for (let i = 0; i < count; i++) {
    orbs.push({
      id: i,
      size: 200 + Math.random() * 400,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 6 + Math.random() * 4,
      color: colors[i % colors.length],
    });
  }

  return orbs;
}

// ---------------------------------------------------------------------------
// Floating Particle
//
// Small translucent dots scattered across the viewport that drift upward
// slowly, evoking a sense of ambient motion like dust motes in light.
// ---------------------------------------------------------------------------

interface Particle {
  id: number;
  x: number;
  startY: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
}

function generateParticles(count: number): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      x: Math.random() * 100,
      startY: 60 + Math.random() * 40,
      size: 1.5 + Math.random() * 2.5,
      delay: Math.random() * 8,
      duration: 10 + Math.random() * 10,
      opacity: 0.2 + Math.random() * 0.4,
    });
  }

  return particles;
}

// ---------------------------------------------------------------------------
// Landing Page
//
// The primary public-facing page for the application. Features a hero
// viewport with floating glass orbs, ambient particles, a centered glass
// card with staggered entrance animations, and a gradient CTA button.
// ---------------------------------------------------------------------------

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  // Generate orbs and particles once on mount to avoid hydration mismatches
  // (random values must be computed client-side only)
  const orbs = useMemo(() => (mounted ? generateOrbs(6) : []), [mounted]);
  const particles = useMemo(
    () => (mounted ? generateParticles(20) : []),
    [mounted],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16 sm:px-8">
      {/* ── Background Gradient Blobs ── */}
      {/* Large, soft gradient shapes that sit behind everything. They use
          float and breathe animations for gentle organic movement. */}
      <div
        className="pointer-events-none absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full opacity-30 blur-3xl animate-oma-float"
        style={{
          background:
            "radial-gradient(circle, rgba(244,114,182,0.4) 0%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute -right-1/4 top-1/3 h-[500px] w-[500px] rounded-full opacity-20 blur-3xl animate-oma-breathe"
        style={{
          background:
            "radial-gradient(circle, rgba(129,140,248,0.4) 0%, transparent 70%)",
          animationDelay: "2s",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-1/4 left-1/3 h-[500px] w-[500px] rounded-full opacity-25 blur-3xl animate-oma-float"
        style={{
          background:
            "radial-gradient(circle, rgba(248,113,113,0.35) 0%, transparent 70%)",
          animationDelay: "4s",
        }}
      />

      {/* ── Floating Glass Orbs ── */}
      {/* Smaller translucent orbs scattered at random positions. They add
          parallax-like depth and reinforce the liquid glass aesthetic. */}
      {orbs.map((orb) => (
        <div
          key={orb.id}
          className="pointer-events-none absolute rounded-full animate-oma-float"
          style={{
            width: orb.size,
            height: orb.size,
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            background: ORB_GRADIENT_MAP[orb.color],
            animationDelay: `${orb.delay}s`,
            animationDuration: `${orb.duration}s`,
            filter: "blur(1px)",
          }}
        />
      ))}

      {/* ── Ambient Particles ── */}
      {/* Tiny dots that drift upward to suggest warmth and energy. */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="pointer-events-none absolute rounded-full bg-oma-primary-soft"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.startY}%`,
            opacity: 0,
            animation: `particle-rise ${p.duration}s ease-out ${p.delay}s infinite`,
          }}
        />
      ))}

      {/* ── Decorative Enso Circle ── */}
      {/* A traditional Japanese calligraphy circle motif placed subtly in
          the upper-right area to tie into the Japanese design language. */}
      <div
        className="oma-enso pointer-events-none absolute right-[8%] top-[12%] opacity-40 animate-oma-breathe"
        style={{ animationDelay: "1s" }}
      />

      {/* ── Hero Glass Card ── */}
      <div
        className="glass-lg glass-edge relative z-10 w-full max-w-lg rounded-oma-xl px-8 py-12 text-center shadow-oma-lg animate-oma-glass-shimmer sm:px-12 sm:py-16"
      >
        {/* Sparkle accent */}
        <div className="mb-6 flex justify-center">
          <div className="glass-primary flex h-12 w-12 items-center justify-center rounded-full animate-oma-glow-pulse">
            <Sparkles className="h-5 w-5 text-oma-primary" />
          </div>
        </div>

        {/* Title with gradient shimmer effect */}
        <h1
          className="font-serif text-5xl font-normal tracking-tight opacity-0 sm:text-6xl lg:text-7xl animate-oma-fade-up"
          style={{ animationDelay: "0.1s" }}
        >
          <span
            className="inline-block bg-gradient-to-r from-oma-primary via-oma-secondary to-oma-indigo bg-[length:200%_auto] bg-clip-text text-transparent"
            style={{ animation: "shimmer 4s linear infinite" }}
          >
            Omakase
          </span>
        </h1>

        {/* Japanese subtitle */}
        <p
          className="mt-3 font-jp text-2xl tracking-widest text-oma-text-muted opacity-0 sm:text-3xl animate-oma-blur-in"
          style={{ animationDelay: "0.4s" }}
        >
          おまかせ
        </p>

        {/* Tagline */}
        <p
          className="mx-auto mt-5 max-w-xs text-base leading-relaxed text-oma-text-muted opacity-0 sm:text-lg animate-oma-fade-up"
          style={{ animationDelay: "0.7s" }}
        >
          Autonomous development, orchestrated by AI agents
        </p>

        {/* Decorative separator */}
        <div
          className="mx-auto mt-8 flex items-center justify-center gap-3 opacity-0 animate-oma-fade-up"
          style={{ animationDelay: "0.9s" }}
        >
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-oma-glass-border-bright" />
          <div className="h-1.5 w-1.5 rounded-full bg-oma-primary/40" />
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-oma-glass-border-bright" />
        </div>

        {/* CTA Button */}
        <div
          className="mt-8 opacity-0 animate-oma-fade-up"
          style={{ animationDelay: "1.1s" }}
        >
          <Link
            href="/projects"
            className="group relative inline-flex items-center gap-2 rounded-oma-lg bg-gradient-to-r from-oma-primary to-oma-secondary px-8 py-3.5 text-base font-semibold text-white shadow-oma transition-all duration-300 hover:shadow-oma-glow-primary hover:brightness-110 sm:text-lg"
          >
            Get Started
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Secondary link */}
        <p
          className="mt-5 text-sm text-oma-text-subtle opacity-0 animate-oma-fade-up"
          style={{ animationDelay: "1.3s" }}
        >
          Built with Claude Code + ECS Fargate
        </p>
      </div>

      {/* ── Bottom Enso (mirrored) ── */}
      <div
        className="oma-enso pointer-events-none absolute bottom-[10%] left-[6%] opacity-25 animate-oma-float"
        style={{
          width: 80,
          height: 80,
          animationDelay: "3s",
        }}
      />

      {/* ── Inline Keyframes ── */}
      {/* Particle rise animation is component-scoped because it uses a
          custom translateY range that differs from the design system's
          standard float animation. */}
      <style>{`
        @keyframes particle-rise {
          0% {
            opacity: 0;
            transform: translateY(0) scale(0.5);
          }
          15% {
            opacity: var(--particle-opacity, 0.3);
            transform: translateY(-10vh) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-60vh) scale(0.3);
          }
        }
      `}</style>
    </main>
  );
}
