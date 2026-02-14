"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button className="flex h-9 w-9 items-center justify-center rounded-oma-sm">
        <span className="sr-only">Toggle theme</span>
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="group relative flex h-9 w-9 items-center justify-center rounded-oma-sm border border-oma-glass-border bg-transparent transition-all duration-300 hover:border-oma-glass-border-bright hover:bg-white/[0.04]"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <Sun className="absolute size-4 rotate-0 scale-100 text-oma-gold transition-all duration-500 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 text-oma-primary transition-all duration-500 dark:rotate-0 dark:scale-100" />
    </button>
  );
}
