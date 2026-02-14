"use client";

import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

type RevealVariant =
  | "fade-up"
  | "fade-down"
  | "fade-left"
  | "fade-right"
  | "scale"
  | "blur";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  threshold?: number;
  as?: "div" | "section" | "article" | "li" | "span";
}

const HIDDEN_STYLES: Record<RevealVariant, string> = {
  "fade-up": "translate-y-8 opacity-0",
  "fade-down": "-translate-y-8 opacity-0",
  "fade-left": "translate-x-8 opacity-0",
  "fade-right": "-translate-x-8 opacity-0",
  scale: "scale-95 opacity-0",
  blur: "opacity-0 blur-sm",
};

const VISIBLE_STYLES: Record<RevealVariant, string> = {
  "fade-up": "translate-y-0 opacity-100",
  "fade-down": "translate-y-0 opacity-100",
  "fade-left": "translate-x-0 opacity-100",
  "fade-right": "translate-x-0 opacity-100",
  scale: "scale-100 opacity-100",
  blur: "opacity-100 blur-0",
};

export function ScrollReveal({
  children,
  className,
  variant = "fade-up",
  delay = 0,
  duration = 700,
  threshold = 0.1,
  as: Tag = "div",
}: ScrollRevealProps) {
  const { ref, isInView } = useInView(threshold);

  return (
    <Tag
      // @ts-expect-error -- polymorphic ref type mismatch with dynamic `as` tag
      ref={ref}
      className={cn(
        "transition-all ease-out",
        isInView ? VISIBLE_STYLES[variant] : HIDDEN_STYLES[variant],
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </Tag>
  );
}
