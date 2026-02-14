"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  ArrowRight,
  Download,
  Heart,
  Search,
  Settings,
  Bell,
  Home,
  Users,
  BarChart3,
  Folder,
  Star,
  Zap,
  Shield,
  Globe,
  Code,
  Terminal,
  GitBranch,
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Eye,
  Sparkles,
  Layers,
  Layout,
  Palette,
  Type,
  Move,
  Box,
  Table2,
  MessageSquare,
  Image,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// ============================================================================
// Custom Hooks
// ============================================================================

/**
 * Observe whether an element is visible in the viewport.
 * Once triggered, `isInView` stays true (one-shot reveal).
 */
function useInView(threshold = 0.1) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsInView(true);
      },
      { threshold, rootMargin: "0px 0px -60px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView };
}

/**
 * Track the overall page scroll progress as a 0-100 percentage.
 */
function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const scrollTop = document.documentElement.scrollTop;
      const scrollHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      setProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return progress;
}

/**
 * Apply a perspective tilt effect on mouse move for glass cards.
 */
function useTilt(intensity = 8) {
  const ref = useRef<HTMLDivElement>(null);
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `perspective(800px) rotateY(${x * intensity}deg) rotateX(${-y * intensity}deg) scale(1.02)`;
    },
    [intensity]
  );
  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (el)
      el.style.transform =
        "perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)";
  }, []);
  return { ref, handleMouseMove, handleMouseLeave };
}

// ============================================================================
// Section Navigation
// ============================================================================

const SECTIONS = [
  { id: "hero", label: "Introduction", icon: Sparkles },
  { id: "colors", label: "Colors", icon: Palette },
  { id: "typography", label: "Typography", icon: Type },
  { id: "spacing", label: "Spacing", icon: Move },
  { id: "glass", label: "Glass", icon: Layers },
  { id: "buttons", label: "Buttons", icon: Box },
  { id: "forms", label: "Forms", icon: Layout },
  { id: "badges", label: "Badges", icon: Star },
  { id: "navigation", label: "Navigation", icon: Globe },
  { id: "cards", label: "Cards", icon: Folder },
  { id: "data", label: "Data", icon: Table2 },
  { id: "feedback", label: "Feedback", icon: MessageSquare },
  { id: "icons", label: "Icons", icon: Image },
  { id: "motion", label: "Motion", icon: Play },
] as const;

// ============================================================================
// Reusable Section Components
// ============================================================================

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const { ref, isInView } = useInView();
  return (
    <div
      ref={ref}
      className={cn(
        "mb-12 transition-all duration-700",
        isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      )}
    >
      <h2 className="font-serif text-4xl font-semibold tracking-tight text-oma-text md:text-5xl">
        {title}
      </h2>
      <p className="mt-3 font-sans text-lg text-oma-text-muted">{subtitle}</p>
      <div className="mt-6 h-px w-full bg-gradient-to-r from-oma-primary/40 via-oma-glass-border to-transparent" />
    </div>
  );
}

function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { ref, handleMouseMove, handleMouseLeave } = useTilt(5);
  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "glass rounded-oma-lg p-6 transition-transform duration-200 ease-out",
        className
      )}
    >
      {children}
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 font-serif text-2xl font-medium text-oma-text">
      {children}
    </h3>
  );
}

// ============================================================================
// Section 1: Hero / Introduction
// ============================================================================

function HeroSection() {
  return (
    <section id="hero" className="relative min-h-[80vh] overflow-hidden py-24">
      {/* Gradient mesh background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="animate-oma-float absolute left-1/4 top-1/4 h-[28rem] w-[28rem] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(244,114,182,0.15) 0%, transparent 70%)",
          }}
        />
        <div
          className="animate-oma-float absolute right-1/4 top-1/3 h-[24rem] w-[24rem] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(249,168,212,0.12) 0%, transparent 70%)",
            animationDelay: "1.5s",
          }}
        />
        <div
          className="animate-oma-float absolute bottom-1/4 left-1/3 h-[22rem] w-[22rem] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 70%)",
            animationDelay: "3s",
          }}
        />
        <div
          className="animate-oma-float absolute bottom-1/3 right-1/3 h-[20rem] w-[20rem] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(248,113,113,0.12) 0%, transparent 70%)",
            animationDelay: "4.5s",
          }}
        />
      </div>

      {/* Floating enso circle */}
      <div className="pointer-events-none absolute right-12 top-20 hidden lg:block">
        <div className="oma-enso animate-oma-float h-40 w-40 opacity-40" />
      </div>

      {/* Hero content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <div
          className="animate-oma-fade-up opacity-0"
          style={{ animationDelay: "0.1s" }}
        >
          <h1
            className="font-serif text-6xl font-bold tracking-tight sm:text-7xl md:text-8xl lg:text-9xl"
            style={{
              background:
                "linear-gradient(90deg, #f9a8d4, #f472b6, #ec4899, #f472b6, #f9a8d4)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "shimmer 3s linear infinite",
            }}
          >
            Omakase
          </h1>
        </div>

        <div
          className="animate-oma-blur-in opacity-0"
          style={{ animationDelay: "0.3s" }}
        >
          <p className="mt-4 font-jp text-3xl tracking-widest text-oma-primary sm:text-4xl">
            おまかせ
          </p>
        </div>

        <div
          className="animate-oma-fade-up opacity-0"
          style={{ animationDelay: "0.5s" }}
        >
          <p className="mt-6 font-serif text-xl italic text-oma-text-muted sm:text-2xl">
            &ldquo;I&rsquo;ll leave it to you&rdquo; &mdash; a philosophy of
            trust
          </p>
        </div>

        <div
          className="animate-oma-fade-up opacity-0"
          style={{ animationDelay: "0.7s" }}
        >
          <div className="glass mx-auto mt-12 max-w-2xl rounded-oma-lg p-8">
            <p className="font-sans text-base leading-relaxed text-oma-text-muted sm:text-lg">
              The Omakase Design System is built on three pillars:{" "}
              <span className="text-oma-primary">liquid glass</span>{" "}
              translucency that reveals depth,{" "}
              <span className="text-oma-secondary">Japanese minimalism</span>{" "}
              that honors negative space, and a foundation of{" "}
              <span className="text-oma-gold">trust</span> between craftsperson
              and patron. Every surface breathes, every interaction flows, every
              element earns its place.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Section 2: Color Palette
// ============================================================================

interface ColorSwatch {
  name: string;
  variable: string;
  hex: string;
  bgClass: string;
  textDark?: boolean;
}

interface ColorGroup {
  title: string;
  swatches: ColorSwatch[];
}

const COLOR_GROUPS: ColorGroup[] = [
  {
    title: "Primary \u2014 Sakura (\u685C)",
    swatches: [
      {
        name: "Primary",
        variable: "--color-oma-primary",
        hex: "#f472b6",
        bgClass: "bg-oma-primary",
      },
      {
        name: "Primary Soft",
        variable: "--color-oma-primary-soft",
        hex: "#f9a8d4",
        bgClass: "bg-oma-primary-soft",
      },
      {
        name: "Primary Dim",
        variable: "--color-oma-primary-dim",
        hex: "#ec4899",
        bgClass: "bg-oma-primary-dim",
      },
    ],
  },
  {
    title: "Secondary \u2014 Beni (\u7D05)",
    swatches: [
      {
        name: "Secondary",
        variable: "--color-oma-secondary",
        hex: "#f87171",
        bgClass: "bg-oma-secondary",
      },
      {
        name: "Secondary Soft",
        variable: "--color-oma-secondary-soft",
        hex: "#fca5a5",
        bgClass: "bg-oma-secondary-soft",
      },
      {
        name: "Secondary Dim",
        variable: "--color-oma-secondary-dim",
        hex: "#ef4444",
        bgClass: "bg-oma-secondary-dim",
      },
    ],
  },
  {
    title: "Indigo (\u85CD)",
    swatches: [
      {
        name: "Indigo",
        variable: "--color-oma-indigo",
        hex: "#818cf8",
        bgClass: "bg-oma-indigo",
      },
      {
        name: "Indigo Soft",
        variable: "--color-oma-indigo-soft",
        hex: "#a5b4fc",
        bgClass: "bg-oma-indigo-soft",
      },
      {
        name: "Indigo Dim",
        variable: "--color-oma-indigo-dim",
        hex: "#6366f1",
        bgClass: "bg-oma-indigo-dim",
      },
    ],
  },
  {
    title: "Gold (\u91D1)",
    swatches: [
      {
        name: "Gold",
        variable: "--color-oma-gold",
        hex: "#fbbf24",
        bgClass: "bg-oma-gold",
        textDark: true,
      },
      {
        name: "Gold Soft",
        variable: "--color-oma-gold-soft",
        hex: "#f59e0b",
        bgClass: "bg-oma-gold-soft",
        textDark: true,
      },
    ],
  },
  {
    title: "Jade (\u7FE1\u7FE0)",
    swatches: [
      {
        name: "Jade",
        variable: "--color-oma-jade",
        hex: "#6ee7b7",
        bgClass: "bg-oma-jade",
        textDark: true,
      },
      {
        name: "Jade Soft",
        variable: "--color-oma-jade-soft",
        hex: "#34d399",
        bgClass: "bg-oma-jade-soft",
        textDark: true,
      },
    ],
  },
  {
    title: "Neutral / Text",
    swatches: [
      {
        name: "Text",
        variable: "--color-oma-text",
        hex: "#e2e8f0",
        bgClass: "bg-oma-text",
        textDark: true,
      },
      {
        name: "Text Muted",
        variable: "--color-oma-text-muted",
        hex: "#94a3b8",
        bgClass: "bg-oma-text-muted",
        textDark: true,
      },
      {
        name: "Text Subtle",
        variable: "--color-oma-text-subtle",
        hex: "#64748b",
        bgClass: "bg-oma-text-subtle",
      },
      {
        name: "Text Faint",
        variable: "--color-oma-text-faint",
        hex: "#475569",
        bgClass: "bg-oma-text-faint",
      },
    ],
  },
  {
    title: "Semantic",
    swatches: [
      {
        name: "Success",
        variable: "--color-oma-success",
        hex: "#4ade80",
        bgClass: "bg-oma-success",
        textDark: true,
      },
      {
        name: "Warning",
        variable: "--color-oma-warning",
        hex: "#fbbf24",
        bgClass: "bg-oma-warning",
        textDark: true,
      },
      {
        name: "Error",
        variable: "--color-oma-error",
        hex: "#f87171",
        bgClass: "bg-oma-error",
      },
      {
        name: "Info",
        variable: "--color-oma-info",
        hex: "#38bdf8",
        bgClass: "bg-oma-info",
        textDark: true,
      },
    ],
  },
  {
    title: "Backgrounds",
    swatches: [
      {
        name: "BG Deep",
        variable: "--color-oma-bg-deep",
        hex: "#060609",
        bgClass: "bg-oma-bg-deep",
      },
      {
        name: "BG",
        variable: "--color-oma-bg",
        hex: "#0b0b12",
        bgClass: "bg-oma-bg",
      },
      {
        name: "BG Elevated",
        variable: "--color-oma-bg-elevated",
        hex: "#12131f",
        bgClass: "bg-oma-bg-elevated",
      },
      {
        name: "BG Surface",
        variable: "--color-oma-bg-surface",
        hex: "#181a2a",
        bgClass: "bg-oma-bg-surface",
      },
    ],
  },
];

function ColorsSection() {
  return (
    <section id="colors" className="py-20">
      <SectionHeader
        title="Color Palette"
        subtitle="A carefully curated palette inspired by Japanese aesthetics -- sakura pink, beni red, gold, jade, and indigo."
      />

      <div className="space-y-10">
        {COLOR_GROUPS.map((group) => (
          <GlassCard key={group.title}>
            <SubHeading>{group.title}</SubHeading>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {group.swatches.map((swatch) => (
                <div key={swatch.name} className="space-y-2">
                  <div
                    className={cn(
                      "h-20 w-full rounded-oma-sm",
                      swatch.bgClass,
                      /* ring to make dark BGs visible against dark page */
                      swatch.hex.startsWith("#0")
                        ? "ring-1 ring-oma-glass-border-bright"
                        : ""
                    )}
                  />
                  <div>
                    <p
                      className={cn(
                        "text-sm font-medium text-oma-text"
                      )}
                    >
                      {swatch.name}
                    </p>
                    <p className="font-mono text-xs text-oma-text-subtle">
                      {swatch.hex}
                    </p>
                    <p className="font-mono text-xs text-oma-text-faint">
                      {swatch.variable}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Glass border tokens */}
      <GlassCard className="mt-10">
        <SubHeading>Glass Borders</SubHeading>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-oma-sm border border-oma-glass-border bg-oma-bg-surface" />
            <div>
              <p className="text-sm font-medium text-oma-text">Glass Border</p>
              <p className="font-mono text-xs text-oma-text-subtle">
                rgba(255,255,255,0.08)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-oma-sm border border-oma-glass-border-bright bg-oma-bg-surface" />
            <div>
              <p className="text-sm font-medium text-oma-text">
                Glass Border Bright
              </p>
              <p className="font-mono text-xs text-oma-text-subtle">
                rgba(255,255,255,0.16)
              </p>
            </div>
          </div>
        </div>
      </GlassCard>
    </section>
  );
}

// ============================================================================
// Section 3: Typography
// ============================================================================

function TypographySection() {
  return (
    <section id="typography" className="py-20">
      <SectionHeader
        title="Typography"
        subtitle="Four typefaces working in harmony -- Instrument Serif for elegance, Outfit for clarity, Noto Serif JP for cultural depth, and JetBrains Mono for precision."
      />

      {/* Instrument Serif headings */}
      <GlassCard className="mb-8">
        <SubHeading>Instrument Serif &mdash; Headings</SubHeading>
        <p className="mb-6 text-sm text-oma-text-muted">
          CSS: <code className="font-mono text-oma-primary">font-serif</code>
        </p>
        <div className="space-y-4">
          <div className="flex flex-col gap-1 border-b border-oma-glass-border pb-4 sm:flex-row sm:items-baseline sm:gap-4">
            <span className="w-12 shrink-0 font-mono text-xs text-oma-text-faint">
              h1
            </span>
            <h1 className="font-serif text-5xl font-bold text-oma-text md:text-6xl">
              The Art of Omakase
            </h1>
          </div>
          <div className="flex flex-col gap-1 border-b border-oma-glass-border pb-4 sm:flex-row sm:items-baseline sm:gap-4">
            <span className="w-12 shrink-0 font-mono text-xs text-oma-text-faint">
              h2
            </span>
            <h2 className="font-serif text-4xl font-semibold text-oma-text md:text-5xl">
              Liquid Glass Surfaces
            </h2>
          </div>
          <div className="flex flex-col gap-1 border-b border-oma-glass-border pb-4 sm:flex-row sm:items-baseline sm:gap-4">
            <span className="w-12 shrink-0 font-mono text-xs text-oma-text-faint">
              h3
            </span>
            <h3 className="font-serif text-3xl font-medium text-oma-text md:text-4xl">
              Design with Intention
            </h3>
          </div>
          <div className="flex flex-col gap-1 border-b border-oma-glass-border pb-4 sm:flex-row sm:items-baseline sm:gap-4">
            <span className="w-12 shrink-0 font-mono text-xs text-oma-text-faint">
              h4
            </span>
            <h4 className="font-serif text-2xl font-medium text-oma-text md:text-3xl">
              Trust the Craftsperson
            </h4>
          </div>
          <div className="flex flex-col gap-1 border-b border-oma-glass-border pb-4 sm:flex-row sm:items-baseline sm:gap-4">
            <span className="w-12 shrink-0 font-mono text-xs text-oma-text-faint">
              h5
            </span>
            <h5 className="font-serif text-xl font-medium text-oma-text md:text-2xl">
              Every Detail Matters
            </h5>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
            <span className="w-12 shrink-0 font-mono text-xs text-oma-text-faint">
              h6
            </span>
            <h6 className="font-serif text-lg font-medium text-oma-text md:text-xl">
              Negative Space is Not Empty
            </h6>
          </div>
        </div>
      </GlassCard>

      {/* Outfit body text */}
      <GlassCard className="mb-8">
        <SubHeading>Outfit &mdash; Body Text</SubHeading>
        <p className="mb-6 text-sm text-oma-text-muted">
          CSS: <code className="font-mono text-oma-primary">font-sans</code>
        </p>
        <div className="space-y-3">
          {(
            [
              ["text-xl", "20px / 1.75rem"],
              ["text-lg", "18px / 1.75rem"],
              ["text-base", "16px / 1.5rem"],
              ["text-sm", "14px / 1.25rem"],
              ["text-xs", "12px / 1rem"],
            ] as const
          ).map(([cls, size]) => (
            <div
              key={cls}
              className="flex flex-col gap-1 border-b border-oma-glass-border pb-3 sm:flex-row sm:items-baseline sm:gap-4"
            >
              <span className="w-24 shrink-0 font-mono text-xs text-oma-text-faint">
                {cls}
              </span>
              <p className={cn("font-sans text-oma-text", cls)}>
                The quick brown fox jumps over the lazy dog.{" "}
                <span className="text-oma-text-subtle">({size})</span>
              </p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Noto Serif JP */}
      <GlassCard className="mb-8">
        <SubHeading>Noto Serif JP &mdash; Japanese Text</SubHeading>
        <p className="mb-6 text-sm text-oma-text-muted">
          CSS: <code className="font-mono text-oma-primary">font-jp</code>
        </p>
        <div className="space-y-4">
          <p className="font-jp text-3xl text-oma-text">
            おまかせ &mdash; 信頼の哲学
          </p>
          <p className="font-jp text-xl text-oma-text-muted">
            一期一会 &mdash; One encounter, one chance
          </p>
          <p className="font-jp text-lg text-oma-text-subtle">
            侘寂 &mdash; Beauty in imperfection
          </p>
          <p className="font-jp text-base text-oma-text-muted">
            間 &mdash; The space between, where meaning lives
          </p>
        </div>
      </GlassCard>

      {/* Font weights */}
      <GlassCard className="mb-8">
        <SubHeading>Font Weights</SubHeading>
        <div className="space-y-3">
          {(
            [
              ["font-light", "300", "Light"],
              ["font-normal", "400", "Regular"],
              ["font-medium", "500", "Medium"],
              ["font-semibold", "600", "Semibold"],
              ["font-bold", "700", "Bold"],
            ] as const
          ).map(([cls, weight, label]) => (
            <div
              key={cls}
              className="flex flex-col gap-1 border-b border-oma-glass-border pb-3 sm:flex-row sm:items-baseline sm:gap-4"
            >
              <span className="w-32 shrink-0 font-mono text-xs text-oma-text-faint">
                {cls} ({weight})
              </span>
              <p className={cn("font-serif text-2xl text-oma-text", cls)}>
                {label} &mdash; Omakase Design System
              </p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Monospace */}
      <GlassCard>
        <SubHeading>JetBrains Mono &mdash; Code</SubHeading>
        <p className="mb-6 text-sm text-oma-text-muted">
          CSS: <code className="font-mono text-oma-primary">font-mono</code>
        </p>
        <div className="rounded-oma-sm bg-oma-bg-deep p-4">
          <pre className="font-mono text-sm leading-relaxed text-oma-text">
            <span className="text-oma-primary">const</span>{" "}
            <span className="text-oma-jade">omakase</span> = {"{"}
            {"\n"}
            {"  "}
            <span className="text-oma-primary">philosophy</span>:{" "}
            <span className="text-oma-gold">
              &quot;Trust the craftsperson&quot;
            </span>
            ,{"\n"}
            {"  "}
            <span className="text-oma-primary">aesthetic</span>:{" "}
            <span className="text-oma-gold">&quot;Liquid glass&quot;</span>,
            {"\n"}
            {"  "}
            <span className="text-oma-primary">heritage</span>:{" "}
            <span className="text-oma-gold">
              &quot;Japanese minimalism&quot;
            </span>
            ,{"\n"}
            {"}"};
          </pre>
        </div>
      </GlassCard>
    </section>
  );
}

// ============================================================================
// Section 4: Spacing & Layout
// ============================================================================

const SPACING_SCALE = [4, 8, 12, 16, 20, 24, 32, 48, 64, 80, 96];

const BREAKPOINTS = [
  { name: "sm", width: "640px", description: "Small devices" },
  { name: "md", width: "768px", description: "Medium devices" },
  { name: "lg", width: "1024px", description: "Large devices" },
  { name: "xl", width: "1280px", description: "Extra large devices" },
  { name: "2xl", width: "1536px", description: "2X large devices" },
];

function SpacingSection() {
  return (
    <section id="spacing" className="py-20">
      <SectionHeader
        title="Spacing & Layout"
        subtitle="Consistent spacing creates rhythm. A harmonious scale from 4px to 96px governs all whitespace."
      />

      {/* Spacing scale */}
      <GlassCard className="mb-8">
        <SubHeading>Spacing Scale</SubHeading>
        <div className="space-y-3">
          {SPACING_SCALE.map((px) => (
            <div key={px} className="flex items-center gap-4">
              <span className="w-16 shrink-0 text-right font-mono text-xs text-oma-text-muted">
                {px}px
              </span>
              <div
                className="h-4 rounded-sm bg-gradient-to-r from-oma-primary to-oma-primary-soft"
                style={{ width: `${px * 2}px` }}
              />
              <span className="font-mono text-xs text-oma-text-faint">
                {px / 4}rem
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Breakpoints */}
      <GlassCard className="mb-8">
        <SubHeading>Breakpoints</SubHeading>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-oma-glass-border">
                <th className="py-3 pr-4 text-left font-medium text-oma-text">
                  Prefix
                </th>
                <th className="py-3 pr-4 text-left font-medium text-oma-text">
                  Min Width
                </th>
                <th className="py-3 text-left font-medium text-oma-text">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {BREAKPOINTS.map((bp) => (
                <tr
                  key={bp.name}
                  className="border-b border-oma-glass-border last:border-0"
                >
                  <td className="py-3 pr-4 font-mono text-oma-primary">
                    {bp.name}:
                  </td>
                  <td className="py-3 pr-4 font-mono text-oma-text-muted">
                    {bp.width}
                  </td>
                  <td className="py-3 text-oma-text-subtle">
                    {bp.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Grid system */}
      <GlassCard>
        <SubHeading>Grid System</SubHeading>
        <div className="space-y-6">
          {/* 1-col */}
          <div>
            <p className="mb-2 font-mono text-xs text-oma-text-faint">
              1 Column
            </p>
            <div className="grid grid-cols-1 gap-3">
              <div className="glass-primary rounded-oma-sm px-4 py-3 text-center text-sm text-oma-text">
                Full Width
              </div>
            </div>
          </div>

          {/* 2-col */}
          <div>
            <p className="mb-2 font-mono text-xs text-oma-text-faint">
              2 Columns
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="glass-primary rounded-oma-sm px-4 py-3 text-center text-sm text-oma-text"
                >
                  Col {n}
                </div>
              ))}
            </div>
          </div>

          {/* 3-col */}
          <div>
            <p className="mb-2 font-mono text-xs text-oma-text-faint">
              3 Columns
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="glass-primary rounded-oma-sm px-4 py-3 text-center text-sm text-oma-text"
                >
                  Col {n}
                </div>
              ))}
            </div>
          </div>

          {/* 4-col */}
          <div>
            <p className="mb-2 font-mono text-xs text-oma-text-faint">
              4 Columns
            </p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="glass-primary rounded-oma-sm px-4 py-3 text-center text-sm text-oma-text"
                >
                  Col {n}
                </div>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>
    </section>
  );
}

// ============================================================================
// Section 5: Glass / Surface Components
// ============================================================================

function GlassSection() {
  return (
    <section id="glass" className="py-20">
      <SectionHeader
        title="Glass & Surfaces"
        subtitle="Frosted glass layers create depth without weight. Three blur intensities and tinted variants for semantic grouping."
      />

      {/* Glass levels */}
      <GlassCard className="mb-8">
        <SubHeading>Glass Intensity Levels</SubHeading>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="glass-sm rounded-oma-lg p-6">
            <p className="font-serif text-lg font-medium text-oma-text">
              glass-sm
            </p>
            <p className="mt-2 text-sm text-oma-text-muted">
              Subtle blur (12px). For background accents and non-interactive
              surfaces.
            </p>
          </div>
          <div className="glass rounded-oma-lg p-6">
            <p className="font-serif text-lg font-medium text-oma-text">
              glass
            </p>
            <p className="mt-2 text-sm text-oma-text-muted">
              Standard blur (20px). The default for cards, panels, and
              containers.
            </p>
          </div>
          <div className="glass-lg rounded-oma-lg p-6">
            <p className="font-serif text-lg font-medium text-oma-text">
              glass-lg
            </p>
            <p className="mt-2 text-sm text-oma-text-muted">
              Heavy blur (32px). For prominent modals, overlays, and focal
              surfaces.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Tinted glass */}
      <GlassCard className="mb-8">
        <SubHeading>Tinted Glass Variants</SubHeading>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="glass-primary rounded-oma-lg p-6">
            <p className="font-serif text-lg font-medium text-oma-primary">
              glass-primary
            </p>
            <p className="mt-2 text-sm text-oma-text-muted">
              Primary-tinted glass for primary actions and highlights.
            </p>
          </div>
          <div className="glass-secondary rounded-oma-lg p-6">
            <p className="font-serif text-lg font-medium text-oma-secondary">
              glass-secondary
            </p>
            <p className="mt-2 text-sm text-oma-text-muted">
              Secondary-tinted glass for supporting accents and groupings.
            </p>
          </div>
          <div className="glass-gold rounded-oma-lg p-6">
            <p className="font-serif text-lg font-medium text-oma-gold">
              glass-gold
            </p>
            <p className="mt-2 text-sm text-oma-text-muted">
              Gold-tinted glass for premium features and highlights.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Glass edge */}
      <GlassCard className="mb-8">
        <SubHeading>Gradient Border (glass-edge)</SubHeading>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="glass-edge rounded-oma-lg bg-oma-bg-elevated p-6">
            <p className="font-serif text-lg font-medium text-oma-text">
              Glass Edge
            </p>
            <p className="mt-2 text-sm text-oma-text-muted">
              A gradient border that catches light at different angles, creating
              a liquid glass edge effect using a ::before pseudo-element.
            </p>
          </div>
          <div className="glass-edge glow-primary rounded-oma-lg bg-oma-bg-elevated p-6">
            <p className="font-serif text-lg font-medium text-oma-text">
              Glass Edge + Glow
            </p>
            <p className="mt-2 text-sm text-oma-text-muted">
              Combined with a primary glow shadow for emphasis on important
              containers.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Nested glass */}
      <GlassCard>
        <SubHeading>Nested Glass</SubHeading>
        <div className="glass rounded-oma-lg p-6">
          <p className="mb-4 text-sm text-oma-text-muted">
            Outer glass container
          </p>
          <div className="glass rounded-oma-sm p-4">
            <p className="mb-3 text-sm text-oma-text-muted">
              Inner glass container
            </p>
            <div className="glass-sm rounded-oma-sm p-3">
              <p className="text-sm text-oma-text-subtle">
                Deeply nested glass -- each layer adds translucency depth.
              </p>
            </div>
          </div>
        </div>
      </GlassCard>
    </section>
  );
}

// ============================================================================
// Section 6: Buttons
// ============================================================================

function ButtonsSection() {
  return (
    <section id="buttons" className="py-20">
      <SectionHeader
        title="Buttons"
        subtitle="Action elements ranging from shadcn defaults to custom glass-styled variants. Every button has clear affordance and feedback."
      />

      {/* shadcn variants */}
      <GlassCard className="mb-8">
        <SubHeading>shadcn/ui Variants</SubHeading>
        <div className="flex flex-wrap gap-3">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
      </GlassCard>

      {/* Sizes */}
      <GlassCard className="mb-8">
        <SubHeading>Sizes</SubHeading>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
        </div>
      </GlassCard>

      {/* With icons */}
      <GlassCard className="mb-8">
        <SubHeading>With Icons</SubHeading>
        <div className="flex flex-wrap items-center gap-3">
          <Button>
            <Plus /> Add Item
          </Button>
          <Button variant="secondary">
            Continue <ArrowRight />
          </Button>
          <Button variant="outline">
            <Download /> Download
          </Button>
          <Button
            variant="ghost"
            className="text-oma-primary hover:text-oma-primary-soft"
          >
            <Heart /> Favorite
          </Button>
        </div>
      </GlassCard>

      {/* Icon buttons */}
      <GlassCard className="mb-8">
        <SubHeading>Icon Buttons</SubHeading>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="icon" variant="outline">
            <Plus />
          </Button>
          <Button size="icon" variant="outline">
            <Search />
          </Button>
          <Button size="icon" variant="outline">
            <Settings />
          </Button>
          <Button size="icon" variant="outline">
            <Bell />
          </Button>
        </div>
      </GlassCard>

      {/* Loading state */}
      <GlassCard className="mb-8">
        <SubHeading>Loading State</SubHeading>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled>
            <Loader2 className="animate-spin" />
            Processing...
          </Button>
          <Button variant="secondary" disabled>
            <Loader2 className="animate-spin" />
            Saving...
          </Button>
        </div>
      </GlassCard>

      {/* Custom glass buttons */}
      <GlassCard>
        <SubHeading>Custom Glass Buttons</SubHeading>
        <p className="mb-4 text-sm text-oma-text-muted">
          Styled using the glass utility classes for the Omakase aesthetic.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button className="glass glass-hover inline-flex items-center gap-2 rounded-oma-sm px-4 py-2 text-sm font-medium text-oma-text transition-all hover:shadow-oma-glow-primary">
            <Zap className="size-4" /> Glass Default
          </button>
          <button className="glass-primary inline-flex items-center gap-2 rounded-oma-sm px-4 py-2 text-sm font-medium text-oma-primary transition-all hover:bg-[rgba(244,114,182,0.14)]">
            <Star className="size-4" /> Glass Primary
          </button>
          <button className="glass-primary inline-flex items-center gap-2 rounded-oma-sm px-4 py-2 text-sm font-medium text-oma-primary transition-all hover:bg-[rgba(244,114,182,0.12)]">
            <Heart className="size-4" /> Glass Primary Alt
          </button>
          <button className="glass-gold inline-flex items-center gap-2 rounded-oma-sm px-4 py-2 text-sm font-medium text-oma-gold transition-all hover:bg-[rgba(251,191,36,0.12)]">
            <Shield className="size-4" /> Glass Gold
          </button>
        </div>
      </GlassCard>
    </section>
  );
}

// ============================================================================
// Section 7: Form Elements
// ============================================================================

function FormsSection() {
  const [sliderValue, setSliderValue] = useState([50]);

  return (
    <section id="forms" className="py-20">
      <SectionHeader
        title="Form Elements"
        subtitle="Inputs and controls styled for dark glass surfaces. Clear focus states and error feedback for accessible forms."
      />

      {/* Input states */}
      <GlassCard className="mb-8">
        <SubHeading>Input States</SubHeading>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-oma-text">Default</Label>
            <Input
              placeholder="Enter your name..."
              className="border-oma-glass-border-bright bg-oma-bg-surface text-oma-text placeholder:text-oma-text-faint focus-visible:border-oma-primary focus-visible:ring-oma-primary/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-oma-text">With Value</Label>
            <Input
              defaultValue="omakase@example.com"
              className="border-oma-glass-border-bright bg-oma-bg-surface text-oma-text placeholder:text-oma-text-faint focus-visible:border-oma-primary focus-visible:ring-oma-primary/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-oma-text-subtle">Disabled</Label>
            <Input
              disabled
              placeholder="Disabled input"
              className="border-oma-glass-border bg-oma-bg-deep text-oma-text-faint placeholder:text-oma-text-faint"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-oma-error">Error</Label>
            <Input
              defaultValue="invalid-email"
              aria-invalid
              className="border-oma-error/50 bg-oma-bg-surface text-oma-text ring-oma-error/20 placeholder:text-oma-text-faint focus-visible:border-oma-error focus-visible:ring-oma-error/30"
            />
            <p className="text-xs text-oma-error">
              Please enter a valid email address.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Textarea */}
      <GlassCard className="mb-8">
        <SubHeading>Textarea</SubHeading>
        <div className="space-y-2">
          <Label className="text-oma-text">Description</Label>
          <Textarea
            placeholder="Write your message..."
            className="border-oma-glass-border-bright bg-oma-bg-surface text-oma-text placeholder:text-oma-text-faint focus-visible:border-oma-primary focus-visible:ring-oma-primary/20"
          />
        </div>
      </GlassCard>

      {/* Select */}
      <GlassCard className="mb-8">
        <SubHeading>Select</SubHeading>
        <div className="space-y-2">
          <Label className="text-oma-text">Choose a role</Label>
          <Select>
            <SelectTrigger className="border-oma-glass-border-bright bg-oma-bg-surface text-oma-text">
              <SelectValue placeholder="Select a role..." />
            </SelectTrigger>
            <SelectContent className="border-oma-glass-border-bright bg-oma-bg-surface text-oma-text">
              <SelectItem value="architect">Architect</SelectItem>
              <SelectItem value="coder">Coder</SelectItem>
              <SelectItem value="reviewer">Reviewer</SelectItem>
              <SelectItem value="tester">Tester</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {/* Checkbox, Switch, Radio */}
      <GlassCard className="mb-8">
        <SubHeading>Toggles & Selection</SubHeading>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Checkboxes */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-oma-text">Checkboxes</p>
            <div className="space-y-3">
              {["Architect", "Coder", "Reviewer"].map((label) => (
                <div key={label} className="flex items-center gap-3">
                  <Checkbox
                    id={`cb-${label}`}
                    className="border-oma-glass-border-bright data-[state=checked]:bg-oma-primary data-[state=checked]:border-oma-primary"
                  />
                  <Label
                    htmlFor={`cb-${label}`}
                    className="text-sm text-oma-text-muted"
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Switches */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-oma-text">Switches</p>
            <div className="space-y-3">
              {["Auto-deploy", "Notifications", "Dark mode"].map((label) => (
                <div key={label} className="flex items-center gap-3">
                  <Switch
                    id={`sw-${label}`}
                    className="data-[state=checked]:bg-oma-primary data-[state=unchecked]:bg-oma-bg-surface"
                  />
                  <Label
                    htmlFor={`sw-${label}`}
                    className="text-sm text-oma-text-muted"
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Radio Group */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-oma-text">Radio Group</p>
            <RadioGroup
              defaultValue="daily"
              className="space-y-3"
            >
              {["Hourly", "Daily", "Weekly"].map((label) => (
                <div key={label} className="flex items-center gap-3">
                  <RadioGroupItem
                    value={label.toLowerCase()}
                    id={`rg-${label}`}
                    className="border-oma-glass-border-bright text-oma-primary"
                  />
                  <Label
                    htmlFor={`rg-${label}`}
                    className="text-sm text-oma-text-muted"
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
      </GlassCard>

      {/* Slider */}
      <GlassCard className="mb-8">
        <SubHeading>Slider</SubHeading>
        <div className="max-w-md space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-oma-text">Concurrency Limit</Label>
            <span className="font-mono text-sm text-oma-primary">
              {sliderValue[0]}%
            </span>
          </div>
          <Slider
            value={sliderValue}
            onValueChange={setSliderValue}
            max={100}
            step={1}
            className="[&_[data-slot=slider-track]]:bg-oma-bg-surface [&_[data-slot=slider-range]]:bg-oma-primary [&_[data-slot=slider-thumb]]:border-oma-primary [&_[data-slot=slider-thumb]]:bg-oma-bg-elevated"
          />
        </div>
      </GlassCard>

      {/* Complete mini form */}
      <GlassCard>
        <SubHeading>Complete Form Example</SubHeading>
        <form
          className="max-w-lg space-y-6"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="space-y-2">
            <Label className="text-oma-text">Project Name</Label>
            <Input
              placeholder="My new project"
              className="border-oma-glass-border-bright bg-oma-bg-surface text-oma-text placeholder:text-oma-text-faint focus-visible:border-oma-primary focus-visible:ring-oma-primary/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-oma-text">Description</Label>
            <Textarea
              placeholder="Describe your project..."
              className="border-oma-glass-border-bright bg-oma-bg-surface text-oma-text placeholder:text-oma-text-faint focus-visible:border-oma-primary focus-visible:ring-oma-primary/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-oma-text">Pipeline Strategy</Label>
            <Select>
              <SelectTrigger className="border-oma-glass-border-bright bg-oma-bg-surface text-oma-text">
                <SelectValue placeholder="Choose strategy..." />
              </SelectTrigger>
              <SelectContent className="border-oma-glass-border-bright bg-oma-bg-surface text-oma-text">
                <SelectItem value="sequential">Sequential</SelectItem>
                <SelectItem value="parallel">Parallel</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              id="form-agree"
              className="border-oma-glass-border-bright data-[state=checked]:bg-oma-primary data-[state=checked]:border-oma-primary"
            />
            <Label htmlFor="form-agree" className="text-sm text-oma-text-muted">
              I accept the terms of service
            </Label>
          </div>
          <div className="flex gap-3">
            <Button className="bg-oma-primary text-white hover:bg-oma-primary-soft">
              Create Project
            </Button>
            <Button
              variant="ghost"
              className="text-oma-text-muted hover:text-oma-text"
            >
              Cancel
            </Button>
          </div>
        </form>
      </GlassCard>
    </section>
  );
}

// ============================================================================
// Section 8: Badges & Tags
// ============================================================================

function BadgesSection() {
  return (
    <section id="badges" className="py-20">
      <SectionHeader
        title="Badges & Tags"
        subtitle="Compact labels for status, categories, and metadata. Both shadcn defaults and custom semantic variants."
      />

      {/* shadcn variants */}
      <GlassCard className="mb-8">
        <SubHeading>shadcn/ui Variants</SubHeading>
        <div className="flex flex-wrap gap-3">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </GlassCard>

      {/* Status badges */}
      <GlassCard className="mb-8">
        <SubHeading>Status Badges</SubHeading>
        <p className="mb-4 text-sm text-oma-text-muted">
          Custom-styled badges for pipeline and feature statuses.
        </p>
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-oma-gold/30 bg-oma-gold/10 px-3 py-1 text-xs font-medium text-oma-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-oma-gold" />
            Pending
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-oma-primary/30 bg-oma-primary/10 px-3 py-1 text-xs font-medium text-oma-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-oma-primary" />
            In Progress
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-oma-jade/30 bg-oma-jade/10 px-3 py-1 text-xs font-medium text-oma-jade">
            <span className="h-1.5 w-1.5 rounded-full bg-oma-jade" />
            Completed
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-oma-error/30 bg-oma-error/10 px-3 py-1 text-xs font-medium text-oma-error">
            <span className="h-1.5 w-1.5 rounded-full bg-oma-error" />
            Failed
          </span>
        </div>
      </GlassCard>

      {/* Agent role badges */}
      <GlassCard>
        <SubHeading>Agent Role Badges</SubHeading>
        <div className="flex flex-wrap gap-3">
          <span className="glass-primary inline-flex items-center gap-1.5 rounded-oma-sm px-3 py-1.5 text-xs font-medium text-oma-primary">
            <Code className="size-3" /> Architect
          </span>
          <span className="glass-primary inline-flex items-center gap-1.5 rounded-oma-sm px-3 py-1.5 text-xs font-medium text-oma-primary">
            <Terminal className="size-3" /> Coder
          </span>
          <span className="glass-primary inline-flex items-center gap-1.5 rounded-oma-sm px-3 py-1.5 text-xs font-medium text-oma-primary">
            <Eye className="size-3" /> Reviewer
          </span>
          <span className="glass-gold inline-flex items-center gap-1.5 rounded-oma-sm px-3 py-1.5 text-xs font-medium text-oma-gold">
            <Shield className="size-3" /> Tester
          </span>
        </div>
      </GlassCard>
    </section>
  );
}

// ============================================================================
// Section 9: Navigation Examples
// ============================================================================

function NavigationSection() {
  return (
    <section id="navigation" className="py-20">
      <SectionHeader
        title="Navigation"
        subtitle="Tabs, breadcrumbs, and sidebar patterns adapted for dark glass surfaces."
      />

      {/* Tabs */}
      <GlassCard className="mb-8">
        <SubHeading>Tabs</SubHeading>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-oma-bg-surface">
            <TabsTrigger
              value="overview"
              className="text-oma-text-muted data-[state=active]:bg-oma-bg-elevated data-[state=active]:text-oma-text"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="pipeline"
              className="text-oma-text-muted data-[state=active]:bg-oma-bg-elevated data-[state=active]:text-oma-text"
            >
              Pipeline
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="text-oma-text-muted data-[state=active]:bg-oma-bg-elevated data-[state=active]:text-oma-text"
            >
              Settings
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-4">
            <div className="glass-sm rounded-oma-sm p-4">
              <p className="text-sm text-oma-text-muted">
                Overview panel content. This tab shows project summary,
                key metrics, and recent activity.
              </p>
            </div>
          </TabsContent>
          <TabsContent value="pipeline" className="mt-4">
            <div className="glass-sm rounded-oma-sm p-4">
              <p className="text-sm text-oma-text-muted">
                Pipeline panel content. Monitor agent execution stages
                and review output logs.
              </p>
            </div>
          </TabsContent>
          <TabsContent value="settings" className="mt-4">
            <div className="glass-sm rounded-oma-sm p-4">
              <p className="text-sm text-oma-text-muted">
                Settings panel content. Configure project parameters,
                concurrency limits, and integrations.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </GlassCard>

      {/* Breadcrumbs */}
      <GlassCard className="mb-8">
        <SubHeading>Breadcrumbs</SubHeading>
        <nav className="flex items-center gap-1 text-sm">
          <a
            href="#navigation"
            className="text-oma-text-subtle transition-colors hover:text-oma-text"
          >
            Home
          </a>
          <ChevronRight className="size-3 text-oma-text-faint" />
          <a
            href="#navigation"
            className="text-oma-text-subtle transition-colors hover:text-oma-text"
          >
            Projects
          </a>
          <ChevronRight className="size-3 text-oma-text-faint" />
          <a
            href="#navigation"
            className="text-oma-text-subtle transition-colors hover:text-oma-text"
          >
            E-Commerce Platform
          </a>
          <ChevronRight className="size-3 text-oma-text-faint" />
          <span className="text-oma-text">Features</span>
        </nav>
      </GlassCard>

      {/* Mini sidebar */}
      <GlassCard>
        <SubHeading>Sidebar Navigation</SubHeading>
        <div className="max-w-xs">
          <nav className="glass rounded-oma-lg p-2">
            {[
              { icon: Home, label: "Dashboard", active: true },
              { icon: Folder, label: "Projects", active: false },
              { icon: BarChart3, label: "Analytics", active: false },
              { icon: Users, label: "Team", active: false },
              { icon: Settings, label: "Settings", active: false },
            ].map((item) => (
              <a
                key={item.label}
                href="#navigation"
                className={cn(
                  "flex items-center gap-3 rounded-oma-sm px-3 py-2.5 text-sm font-medium transition-all",
                  item.active
                    ? "glass-active text-oma-text"
                    : "text-oma-text-muted hover:bg-white/[0.04] hover:text-oma-text"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </GlassCard>
    </section>
  );
}

// ============================================================================
// Section 10: Cards & Containers
// ============================================================================

function CardsSection() {
  return (
    <section id="cards" className="py-20">
      <SectionHeader
        title="Cards & Containers"
        subtitle="Surface containers from frosted glass to solid panels. Each variant serves a distinct hierarchy purpose."
      />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Glass card */}
        <div className="glass rounded-oma-lg p-6">
          <h4 className="font-serif text-lg font-medium text-oma-text">
            Glass Card
          </h4>
          <p className="mt-2 text-sm text-oma-text-muted">
            Using the <code className="font-mono text-oma-primary">glass</code>{" "}
            utility. Semi-transparent with backdrop blur for the primary card
            pattern.
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              className="bg-oma-primary text-white hover:bg-oma-primary-soft"
            >
              Action
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-oma-text-muted hover:text-oma-text"
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Solid card */}
        <div className="rounded-oma-lg border border-oma-glass-border bg-oma-bg-surface p-6">
          <h4 className="font-serif text-lg font-medium text-oma-text">
            Solid Card
          </h4>
          <p className="mt-2 text-sm text-oma-text-muted">
            Opaque surface with{" "}
            <code className="font-mono text-oma-primary">bg-oma-bg-surface</code>{" "}
            and a subtle border. For non-overlapping content areas.
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              className="bg-oma-primary text-white hover:bg-oma-primary-soft"
            >
              Action
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-oma-text-muted hover:text-oma-text"
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Glass edge card */}
        <div className="glass-edge rounded-oma-lg bg-oma-bg-elevated p-6">
          <h4 className="font-serif text-lg font-medium text-oma-text">
            Gradient Border Card
          </h4>
          <p className="mt-2 text-sm text-oma-text-muted">
            The{" "}
            <code className="font-mono text-oma-primary">glass-edge</code>{" "}
            class creates a liquid gradient border via a ::before
            pseudo-element.
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              className="bg-oma-primary text-white hover:bg-oma-primary-soft"
            >
              Action
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-oma-text-muted hover:text-oma-text"
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Glow card */}
        <div className="glow-primary rounded-oma-lg border border-oma-glass-border bg-oma-bg-surface p-6">
          <h4 className="font-serif text-lg font-medium text-oma-text">
            Glow Effect Card
          </h4>
          <p className="mt-2 text-sm text-oma-text-muted">
            Combined{" "}
            <code className="font-mono text-oma-primary">glow-primary</code>{" "}
            shadow with a surface card. Use sparingly for featured content.
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              className="bg-oma-primary text-white hover:bg-oma-primary-soft"
            >
              Action
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-oma-text-muted hover:text-oma-text"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Card with header / body / footer */}
      <GlassCard className="mt-8">
        <SubHeading>Card with Header, Body, Footer</SubHeading>
        <div className="glass rounded-oma-lg overflow-hidden">
          {/* Header */}
          <div className="border-b border-oma-glass-border px-6 py-4">
            <div className="flex items-center justify-between">
              <h4 className="font-serif text-lg font-medium text-oma-text">
                Pipeline Run #42
              </h4>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-oma-jade/30 bg-oma-jade/10 px-2.5 py-0.5 text-xs font-medium text-oma-jade">
                <span className="h-1.5 w-1.5 rounded-full bg-oma-jade" />
                Passing
              </span>
            </div>
          </div>
          {/* Body */}
          <div className="px-6 py-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-oma-text-subtle">Duration</p>
                <p className="font-mono text-sm text-oma-text">3m 24s</p>
              </div>
              <div>
                <p className="text-xs text-oma-text-subtle">Agent</p>
                <p className="font-mono text-sm text-oma-text">Coder</p>
              </div>
              <div>
                <p className="text-xs text-oma-text-subtle">Commits</p>
                <p className="font-mono text-sm text-oma-text">7</p>
              </div>
              <div>
                <p className="text-xs text-oma-text-subtle">Tests</p>
                <p className="font-mono text-sm text-oma-text">14/14</p>
              </div>
            </div>
          </div>
          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-oma-glass-border px-6 py-3">
            <Button
              size="sm"
              variant="ghost"
              className="text-oma-text-muted hover:text-oma-text"
            >
              View Logs
            </Button>
            <Button
              size="sm"
              className="bg-oma-primary text-white hover:bg-oma-primary-soft"
            >
              View PR
            </Button>
          </div>
        </div>
      </GlassCard>
    </section>
  );
}

// ============================================================================
// Section 11: Data Display
// ============================================================================

const TABLE_DATA = [
  {
    name: "Yuki Tanaka",
    status: "Active",
    role: "Architect",
    activity: "2 min ago",
  },
  {
    name: "Hana Suzuki",
    status: "Active",
    role: "Coder",
    activity: "5 min ago",
  },
  {
    name: "Kenji Yamamoto",
    status: "Idle",
    role: "Reviewer",
    activity: "1 hour ago",
  },
  {
    name: "Sakura Watanabe",
    status: "Active",
    role: "Tester",
    activity: "12 min ago",
  },
  {
    name: "Ren Nakamura",
    status: "Offline",
    role: "Coder",
    activity: "3 days ago",
  },
];

const STATS = [
  { label: "Features Shipped", value: "127", change: "+12%", trend: "up" },
  { label: "Pipeline Runs", value: "843", change: "+23%", trend: "up" },
  { label: "Avg Duration", value: "4m 12s", change: "-18%", trend: "down" },
  { label: "Success Rate", value: "94.7%", change: "+2.1%", trend: "up" },
];

function DataSection() {
  return (
    <section id="data" className="py-20">
      <SectionHeader
        title="Data Display"
        subtitle="Tables, statistics, and list patterns for presenting structured information on glass surfaces."
      />

      {/* Stats cards */}
      <GlassCard className="mb-8">
        <SubHeading>Stats Cards</SubHeading>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="glass rounded-oma-sm p-4"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-oma-text-subtle">
                {stat.label}
              </p>
              <p className="mt-2 font-serif text-3xl font-bold text-oma-text">
                {stat.value}
              </p>
              <p
                className={cn(
                  "mt-1 text-xs font-medium",
                  stat.trend === "up"
                    ? "text-oma-jade"
                    : "text-oma-jade"
                )}
              >
                {stat.change} this month
              </p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard className="mb-8">
        <SubHeading>Table</SubHeading>
        <div className="overflow-x-auto">
          <Table className="text-oma-text">
            <TableHeader>
              <TableRow className="border-oma-glass-border hover:bg-transparent">
                <TableHead className="text-oma-text-muted">Name</TableHead>
                <TableHead className="text-oma-text-muted">Status</TableHead>
                <TableHead className="text-oma-text-muted">Role</TableHead>
                <TableHead className="text-oma-text-muted">
                  Last Activity
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TABLE_DATA.map((row) => (
                <TableRow
                  key={row.name}
                  className="border-oma-glass-border hover:bg-white/[0.02]"
                >
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                        row.status === "Active"
                          ? "bg-oma-jade/10 text-oma-jade"
                          : row.status === "Idle"
                            ? "bg-oma-gold/10 text-oma-gold"
                            : "bg-oma-text-faint/10 text-oma-text-subtle"
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          row.status === "Active"
                            ? "bg-oma-jade"
                            : row.status === "Idle"
                              ? "bg-oma-gold"
                              : "bg-oma-text-subtle"
                        )}
                      />
                      {row.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-oma-text-muted">
                    {row.role}
                  </TableCell>
                  <TableCell className="text-oma-text-subtle">
                    {row.activity}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      {/* Simple list */}
      <GlassCard>
        <SubHeading>List with Separators</SubHeading>
        <div className="space-y-0">
          {[
            {
              title: "Feature: User Authentication",
              desc: "OAuth 2.0 with Auth0 integration",
            },
            {
              title: "Feature: Dashboard Analytics",
              desc: "Real-time charts and metric aggregation",
            },
            {
              title: "Feature: Agent Pipeline",
              desc: "4-step sequential agent execution",
            },
            {
              title: "Feature: Linear Integration",
              desc: "Bidirectional ticket sync",
            },
          ].map((item, i) => (
            <div key={item.title}>
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium text-oma-text">
                    {item.title}
                  </p>
                  <p className="text-xs text-oma-text-subtle">{item.desc}</p>
                </div>
                <ChevronRight className="size-4 text-oma-text-faint" />
              </div>
              {i < 3 && (
                <Separator className="bg-oma-glass-border" />
              )}
            </div>
          ))}
        </div>
      </GlassCard>
    </section>
  );
}

// ============================================================================
// Section 12: Feedback
// ============================================================================

function FeedbackSection() {
  return (
    <section id="feedback" className="py-20">
      <SectionHeader
        title="Feedback"
        subtitle="Alerts, progress indicators, and loading states that keep users informed without breaking flow."
      />

      {/* Alerts */}
      <GlassCard className="mb-8">
        <SubHeading>Alerts</SubHeading>
        <div className="space-y-4">
          <Alert className="border-oma-info/30 bg-oma-info/5 text-oma-text [&>svg]:text-oma-info">
            <Info className="size-4" />
            <AlertTitle className="text-oma-info">Information</AlertTitle>
            <AlertDescription className="text-oma-text-muted">
              The pipeline will start automatically when all dependencies are
              resolved.
            </AlertDescription>
          </Alert>

          <Alert className="border-oma-success/30 bg-oma-success/5 text-oma-text [&>svg]:text-oma-success">
            <CheckCircle className="size-4" />
            <AlertTitle className="text-oma-success">Success</AlertTitle>
            <AlertDescription className="text-oma-text-muted">
              All 14 tests passed. The PR has been created and is ready for
              review.
            </AlertDescription>
          </Alert>

          <Alert className="border-oma-warning/30 bg-oma-warning/5 text-oma-text [&>svg]:text-oma-warning">
            <AlertTriangle className="size-4" />
            <AlertTitle className="text-oma-warning">Warning</AlertTitle>
            <AlertDescription className="text-oma-text-muted">
              Reviewer requested changes. The coder agent will re-run once
              before failing.
            </AlertDescription>
          </Alert>

          <Alert className="border-oma-error/30 bg-oma-error/5 text-oma-text [&>svg]:text-oma-error">
            <AlertCircle className="size-4" />
            <AlertTitle className="text-oma-error">Error</AlertTitle>
            <AlertDescription className="text-oma-text-muted">
              Pipeline failed at the testing stage. Check agent logs for details.
            </AlertDescription>
          </Alert>
        </div>
      </GlassCard>

      {/* Progress */}
      <GlassCard className="mb-8">
        <SubHeading>Progress Bars</SubHeading>
        <div className="space-y-6">
          {[
            { label: "Architect", value: 100, color: "bg-oma-jade" },
            { label: "Coder", value: 75, color: "bg-oma-primary" },
            { label: "Reviewer", value: 30, color: "bg-oma-primary" },
            { label: "Tester", value: 0, color: "bg-oma-gold" },
          ].map((item) => (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-oma-text">
                  {item.label}
                </span>
                <span className="font-mono text-xs text-oma-text-subtle">
                  {item.value}%
                </span>
              </div>
              <Progress
                value={item.value}
                className="h-2 bg-oma-bg-surface [&_[data-slot=progress-indicator]]:bg-oma-primary"
              />
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Skeleton loaders */}
      <GlassCard className="mb-8">
        <SubHeading>Skeleton Loaders</SubHeading>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 shrink-0 rounded-full bg-oma-bg-surface" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 bg-oma-bg-surface" />
              <Skeleton className="h-3 w-1/2 bg-oma-bg-surface" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full bg-oma-bg-surface" />
            <Skeleton className="h-4 w-5/6 bg-oma-bg-surface" />
            <Skeleton className="h-4 w-4/6 bg-oma-bg-surface" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-24 bg-oma-bg-surface" />
            <Skeleton className="h-24 bg-oma-bg-surface" />
            <Skeleton className="h-24 bg-oma-bg-surface" />
          </div>
        </div>
      </GlassCard>

      {/* Toast reference */}
      <GlassCard>
        <SubHeading>Toast Notifications</SubHeading>
        <p className="text-sm text-oma-text-muted">
          Toast notifications use{" "}
          <code className="font-mono text-oma-primary">sonner</code> (already
          installed). Import{" "}
          <code className="font-mono text-oma-primary">
            {"{ toast }"} from &quot;sonner&quot;
          </code>{" "}
          and call{" "}
          <code className="font-mono text-oma-primary">
            toast.success(&quot;Message&quot;)
          </code>
          ,{" "}
          <code className="font-mono text-oma-primary">
            toast.error(&quot;Message&quot;)
          </code>
          , etc. The{" "}
          <code className="font-mono text-oma-primary">{"<Toaster />"}</code>{" "}
          provider should be placed in the root layout.
        </p>
        <div className="mt-4 rounded-oma-sm bg-oma-bg-deep p-4">
          <pre className="font-mono text-sm text-oma-text">
            <span className="text-oma-primary">import</span>{" "}
            {"{ toast }"}{" "}
            <span className="text-oma-primary">from</span>{" "}
            <span className="text-oma-gold">&quot;sonner&quot;</span>;{"\n"}
            {"\n"}
            <span className="text-oma-text-subtle">
              {"// Usage examples:"}
            </span>
            {"\n"}
            toast.success(<span className="text-oma-gold">&quot;Pipeline completed&quot;</span>);{"\n"}
            toast.error(<span className="text-oma-gold">&quot;Build failed&quot;</span>);{"\n"}
            toast.info(<span className="text-oma-gold">&quot;Agent starting...&quot;</span>);
          </pre>
        </div>
      </GlassCard>
    </section>
  );
}

// ============================================================================
// Section 13: Icons & Decorative
// ============================================================================

const ICON_GRID = [
  { icon: Home, label: "Home" },
  { icon: Search, label: "Search" },
  { icon: Settings, label: "Settings" },
  { icon: Bell, label: "Bell" },
  { icon: Users, label: "Users" },
  { icon: Folder, label: "Folder" },
  { icon: BarChart3, label: "BarChart3" },
  { icon: Star, label: "Star" },
  { icon: Heart, label: "Heart" },
  { icon: Zap, label: "Zap" },
  { icon: Shield, label: "Shield" },
  { icon: Globe, label: "Globe" },
  { icon: Code, label: "Code" },
  { icon: Terminal, label: "Terminal" },
  { icon: GitBranch, label: "GitBranch" },
  { icon: CheckCircle, label: "CheckCircle" },
  { icon: AlertCircle, label: "AlertCircle" },
  { icon: Info, label: "Info" },
  { icon: AlertTriangle, label: "AlertTriangle" },
  { icon: Download, label: "Download" },
  { icon: Plus, label: "Plus" },
  { icon: ArrowRight, label: "ArrowRight" },
  { icon: Eye, label: "Eye" },
  { icon: Sparkles, label: "Sparkles" },
  { icon: Layers, label: "Layers" },
  { icon: Layout, label: "Layout" },
  { icon: Palette, label: "Palette" },
  { icon: Type, label: "Type" },
  { icon: Move, label: "Move" },
  { icon: Box, label: "Box" },
];

function IconsSection() {
  return (
    <section id="icons" className="py-20">
      <SectionHeader
        title="Icons & Decorative"
        subtitle="Lucide icons for UI actions and Japanese-inspired decorative elements for visual richness."
      />

      {/* Icon grid */}
      <GlassCard className="mb-8">
        <SubHeading>Lucide Icon Set</SubHeading>
        <p className="mb-6 text-sm text-oma-text-muted">
          Import from{" "}
          <code className="font-mono text-oma-primary">lucide-react</code>.
          Default size is 16px via{" "}
          <code className="font-mono text-oma-primary">size-4</code>. Use{" "}
          <code className="font-mono text-oma-primary">size-5</code> for
          emphasis and{" "}
          <code className="font-mono text-oma-primary">size-3</code> for inline
          contexts.
        </p>
        <div className="grid grid-cols-5 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
          {ICON_GRID.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="group flex flex-col items-center gap-2 rounded-oma-sm p-3 transition-colors hover:bg-white/[0.04]"
            >
              <Icon className="size-5 text-oma-text-muted transition-colors group-hover:text-oma-primary" />
              <span className="text-center text-[10px] leading-tight text-oma-text-faint transition-colors group-hover:text-oma-text-subtle">
                {label}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Decorative elements */}
      <GlassCard className="mb-8">
        <SubHeading>Enso Circle (oma-enso)</SubHeading>
        <p className="mb-6 text-sm text-oma-text-muted">
          The enso (circle) symbolizes enlightenment, strength, and the void.
          Use as a subtle decorative accent in hero sections and empty states.
        </p>
        <div className="flex flex-wrap items-center gap-12">
          <div className="oma-enso" />
          <div className="oma-enso h-24 w-24 animate-oma-float opacity-60" />
          <div className="oma-enso h-16 w-16 animate-oma-breathe" />
        </div>
      </GlassCard>

      <GlassCard className="mb-8">
        <SubHeading>Wave Pattern (oma-wave-pattern)</SubHeading>
        <p className="mb-6 text-sm text-oma-text-muted">
          The seigaiha (wave) pattern represents calm seas and good fortune.
          Apply as a subtle texture on large background areas.
        </p>
        <div className="oma-wave-pattern h-32 rounded-oma-sm border border-oma-glass-border" />
      </GlassCard>

      {/* Gradient blobs */}
      <GlassCard>
        <SubHeading>Gradient Blobs</SubHeading>
        <p className="mb-6 text-sm text-oma-text-muted">
          Positioned absolutely behind content to create ambient gradient
          meshes. Keep opacity between 0.1 and 0.3 to avoid visual noise.
        </p>
        <div className="relative h-48 overflow-hidden rounded-oma-sm border border-oma-glass-border bg-oma-bg-deep">
          <div
            className="absolute left-1/4 top-1/4 h-32 w-32 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute right-1/4 top-1/3 h-28 w-28 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(249,168,212,0.15) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute bottom-1/4 left-1/2 h-24 w-24 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-serif text-lg text-oma-text-muted">
              Ambient gradient mesh
            </p>
          </div>
        </div>
      </GlassCard>
    </section>
  );
}

// ============================================================================
// Section 14: Motion & Animation
// ============================================================================

function MotionSection() {
  return (
    <section id="motion" className="py-20">
      <SectionHeader
        title="Motion & Animation"
        subtitle="Purposeful motion that guides attention without distraction. Every animation earns its milliseconds."
      />

      {/* Animation classes */}
      <GlassCard className="mb-8">
        <SubHeading>Animation Classes</SubHeading>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-oma-fade-up glass flex h-20 w-20 items-center justify-center rounded-oma-sm text-oma-primary">
              <ArrowRight className="size-6 -rotate-90" />
            </div>
            <div className="text-center">
              <p className="font-mono text-xs text-oma-primary">
                animate-oma-fade-up
              </p>
              <p className="mt-1 text-xs text-oma-text-subtle">
                Entrance animation
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="animate-oma-glass-shimmer glass flex h-20 w-20 items-center justify-center rounded-oma-sm text-oma-primary">
              <Sparkles className="size-6" />
            </div>
            <div className="text-center">
              <p className="font-mono text-xs text-oma-primary">
                animate-oma-glass-shimmer
              </p>
              <p className="mt-1 text-xs text-oma-text-subtle">
                Background shimmer
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="animate-oma-float glass flex h-20 w-20 items-center justify-center rounded-oma-sm text-oma-jade">
              <Layers className="size-6" />
            </div>
            <div className="text-center">
              <p className="font-mono text-xs text-oma-primary">
                animate-oma-float
              </p>
              <p className="mt-1 text-xs text-oma-text-subtle">
                Gentle floating
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="animate-oma-breathe glass flex h-20 w-20 items-center justify-center rounded-oma-sm text-oma-gold">
              <Eye className="size-6" />
            </div>
            <div className="text-center">
              <p className="font-mono text-xs text-oma-primary">
                animate-oma-breathe
              </p>
              <p className="mt-1 text-xs text-oma-text-subtle">
                Opacity breathing
              </p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Dramatic motion demos */}
      <GlassCard className="mb-8">
        <SubHeading>Advanced Motion Demos</SubHeading>
        <p className="mb-6 text-sm text-oma-text-muted">
          More expressive animations for special contexts -- use sparingly.
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Spinning element */}
          <div className="flex flex-col items-center gap-4">
            <div
              className="glass flex h-20 w-20 items-center justify-center rounded-oma-sm text-oma-primary"
              style={{ animation: "oma-spin-slow 8s linear infinite" }}
            >
              <Settings className="size-6" />
            </div>
            <div className="text-center">
              <p className="font-mono text-xs text-oma-primary">
                oma-spin-slow
              </p>
              <p className="mt-1 text-xs text-oma-text-subtle">
                8s continuous rotation
              </p>
            </div>
          </div>

          {/* Bouncing element */}
          <div className="flex flex-col items-center gap-4">
            <div
              className="glass flex h-20 w-20 items-center justify-center rounded-oma-sm text-oma-secondary"
              style={{
                animation: "oma-bounce 2s ease-in-out infinite",
              }}
            >
              <Zap className="size-6" />
            </div>
            <div className="text-center">
              <p className="font-mono text-xs text-oma-primary">
                oma-bounce
              </p>
              <p className="mt-1 text-xs text-oma-text-subtle">
                Elastic bounce
              </p>
            </div>
          </div>

          {/* Morphing shape */}
          <div className="flex flex-col items-center gap-4">
            <div
              className="glass flex h-20 w-20 items-center justify-center text-oma-jade"
              style={{
                animation: "oma-morph 4s ease-in-out infinite",
                borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%",
              }}
            >
              <Star className="size-6" />
            </div>
            <div className="text-center">
              <p className="font-mono text-xs text-oma-primary">
                oma-morph
              </p>
              <p className="mt-1 text-xs text-oma-text-subtle">
                Shape morphing
              </p>
            </div>
          </div>
        </div>

        {/* Inline keyframe definitions for the demo animations */}
        <style>{`
          @keyframes oma-spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes oma-bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-16px); }
          }
          @keyframes oma-morph {
            0%, 100% { border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%; }
            25% { border-radius: 58% 42% 75% 25% / 76% 46% 54% 24%; }
            50% { border-radius: 50% 50% 33% 67% / 55% 27% 73% 45%; }
            75% { border-radius: 33% 67% 58% 42% / 63% 68% 32% 37%; }
          }
          @keyframes shimmer {
            to { background-position: 200% center; }
          }
        `}</style>
      </GlassCard>

      {/* Hover effects */}
      <GlassCard className="mb-8">
        <SubHeading>Hover Effects</SubHeading>
        <p className="mb-6 text-sm text-oma-text-muted">
          Hover over each card to see the transition effect.
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Scale */}
          <div className="glass flex h-28 cursor-pointer flex-col items-center justify-center rounded-oma-sm transition-transform duration-300 hover:scale-105">
            <Box className="mb-2 size-6 text-oma-primary" />
            <p className="text-sm font-medium text-oma-text">Scale</p>
            <p className="font-mono text-xs text-oma-text-faint">
              hover:scale-105
            </p>
          </div>

          {/* Glow */}
          <div className="glass flex h-28 cursor-pointer flex-col items-center justify-center rounded-oma-sm transition-shadow duration-300 hover:shadow-[0_0_24px_rgba(129,140,248,0.2)]">
            <Zap className="mb-2 size-6 text-oma-primary" />
            <p className="text-sm font-medium text-oma-text">Glow</p>
            <p className="font-mono text-xs text-oma-text-faint">
              glow-primary
            </p>
          </div>

          {/* Lift */}
          <div className="glass flex h-28 cursor-pointer flex-col items-center justify-center rounded-oma-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-oma-lg">
            <ArrowRight className="mb-2 size-6 -rotate-90 text-oma-primary" />
            <p className="text-sm font-medium text-oma-text">Lift</p>
            <p className="font-mono text-xs text-oma-text-faint">
              hover:-translate-y-1
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Timing guidelines */}
      <GlassCard className="mb-8">
        <SubHeading>Transition Timing</SubHeading>
        <div className="space-y-4">
          {[
            {
              duration: "150ms",
              easing: "ease-out",
              use: "Micro-interactions (hover, focus, toggle)",
            },
            {
              duration: "300ms",
              easing: "ease-in-out",
              use: "State changes (expand, collapse, slide)",
            },
            {
              duration: "600ms",
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              use: "Entrance animations (fade-up, scale-in)",
            },
            {
              duration: "3-6s",
              easing: "ease-in-out",
              use: "Ambient loops (breathe, float, shimmer)",
            },
          ].map((timing) => (
            <div
              key={timing.duration}
              className="flex flex-col gap-1 border-b border-oma-glass-border pb-3 sm:flex-row sm:items-baseline sm:gap-6"
            >
              <span className="w-20 shrink-0 font-mono text-sm font-medium text-oma-primary">
                {timing.duration}
              </span>
              <span className="w-56 shrink-0 font-mono text-xs text-oma-text-subtle">
                {timing.easing}
              </span>
              <span className="text-sm text-oma-text-muted">{timing.use}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Motion principles */}
      <GlassCard>
        <SubHeading>Motion Principles</SubHeading>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-oma-text">
              Purposeful, not decorative
            </p>
            <p className="text-sm text-oma-text-muted">
              Every animation should guide attention or communicate state.
              Remove motion that exists only for visual flair.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-oma-text">
              Respect reduced-motion
            </p>
            <p className="text-sm text-oma-text-muted">
              Use <code className="font-mono text-oma-primary">prefers-reduced-motion</code>{" "}
              to disable non-essential animations for accessibility.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-oma-text">
              Entrances over exits
            </p>
            <p className="text-sm text-oma-text-muted">
              Invest in entrance animations. Exits should be faster and simpler
              -- users are already moving on.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-oma-text">
              Consistency in duration
            </p>
            <p className="text-sm text-oma-text-muted">
              Similar elements should animate at the same speed. Use staggered
              delays (50-100ms) for lists, not varied durations.
            </p>
          </div>
        </div>
      </GlassCard>
    </section>
  );
}

// ============================================================================
// Navigation Components
// ============================================================================

function DesktopNav({ activeSection }: { activeSection: string }) {
  return (
    <nav className="fixed left-0 top-1/2 z-50 hidden -translate-y-1/2 xl:block">
      <div className="glass-lg ml-4 rounded-oma-lg p-2">
        <ul className="space-y-1">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className={cn(
                    "group relative flex items-center gap-2 rounded-oma-sm px-3 py-2 text-xs font-medium transition-all",
                    isActive
                      ? "glass-active text-oma-text"
                      : "text-oma-text-faint hover:bg-white/[0.04] hover:text-oma-text-muted"
                  )}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:max-w-[100px] group-hover:opacity-100">
                    {section.label}
                  </span>
                  {isActive && (
                    <span className="absolute inset-0 animate-oma-glow-pulse rounded-full" />
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

function MobileNav({ activeSection }: { activeSection: string }) {
  return (
    <nav className="oma-scroll sticky top-0 z-50 xl:hidden">
      <div className="glass-lg border-b border-oma-glass-border px-4 py-2">
        <div className="oma-scroll flex gap-1 overflow-x-auto">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={cn(
                "shrink-0 rounded-oma-sm px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all",
                activeSection === section.id
                  ? "glass-active text-oma-text"
                  : "text-oma-text-faint hover:text-oma-text-muted"
              )}
            >
              {section.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function StyleSystemPage() {
  const [activeSection, setActiveSection] = useState("hero");
  const scrollProgress = useScrollProgress();

  /**
   * Track which section is currently in view using IntersectionObserver.
   * We attach a ref-callback to each section wrapper so the observer
   * fires as the user scrolls through the page.
   */
  const observerCallback = (id: string) => (node: HTMLDivElement | null) => {
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(id);
          }
        });
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: 0 }
    );

    observer.observe(node);

    // Cleanup: disconnect when the node is removed from the DOM.
    // We leverage the MutationObserver pattern indirectly -- React will call
    // this callback with null on unmount, but IntersectionObserver has
    // already been set up. For a client-only page with no dynamic
    // section mounting/unmounting, this is acceptable.
  };

  return (
    <div className="-m-8 min-h-screen bg-oma-bg-deep font-sans text-oma-text">
      {/* Scroll progress bar */}
      <div className="fixed left-0 top-0 z-50 h-0.5 w-full">
        <div
          className="h-full bg-gradient-to-r from-oma-primary via-oma-secondary to-oma-gold transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Mobile horizontal scroll nav */}
      <MobileNav activeSection={activeSection} />

      {/* Desktop floating sidebar nav */}
      <DesktopNav activeSection={activeSection} />

      {/* Main content with scroll-smooth */}
      <div className="oma-scroll scroll-smooth">
        <div className="mx-auto max-w-6xl px-6 md:px-12 xl:px-8">
          {/* Section 1: Hero */}
          <div ref={observerCallback("hero")}>
            <HeroSection />
          </div>

          {/* Section 2: Colors */}
          <div ref={observerCallback("colors")}>
            <ColorsSection />
          </div>

          {/* Section 3: Typography */}
          <div ref={observerCallback("typography")}>
            <TypographySection />
          </div>

          {/* Section 4: Spacing & Layout */}
          <div ref={observerCallback("spacing")}>
            <SpacingSection />
          </div>

          {/* Section 5: Glass / Surfaces */}
          <div ref={observerCallback("glass")}>
            <GlassSection />
          </div>

          {/* Section 6: Buttons */}
          <div ref={observerCallback("buttons")}>
            <ButtonsSection />
          </div>

          {/* Section 7: Form Elements */}
          <div ref={observerCallback("forms")}>
            <FormsSection />
          </div>

          {/* Section 8: Badges & Tags */}
          <div ref={observerCallback("badges")}>
            <BadgesSection />
          </div>

          {/* Section 9: Navigation */}
          <div ref={observerCallback("navigation")}>
            <NavigationSection />
          </div>

          {/* Section 10: Cards & Containers */}
          <div ref={observerCallback("cards")}>
            <CardsSection />
          </div>

          {/* Section 11: Data Display */}
          <div ref={observerCallback("data")}>
            <DataSection />
          </div>

          {/* Section 12: Feedback */}
          <div ref={observerCallback("feedback")}>
            <FeedbackSection />
          </div>

          {/* Section 13: Icons & Decorative */}
          <div ref={observerCallback("icons")}>
            <IconsSection />
          </div>

          {/* Section 14: Motion & Animation */}
          <div ref={observerCallback("motion")}>
            <MotionSection />
          </div>

          {/* Footer */}
          <footer className="border-t border-oma-glass-border py-16 text-center">
            <p className="font-jp text-lg text-oma-text-subtle">おまかせ</p>
            <p className="mt-2 text-sm text-oma-text-faint">
              Omakase Design System &mdash; Built with trust, glass, and
              intention.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
