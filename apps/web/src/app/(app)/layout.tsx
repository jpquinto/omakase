"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Folder,
  Palette,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_ITEMS = [
  { href: "/projects", label: "Projects", icon: Folder },
  { href: "/style-system", label: "Style System", icon: Palette },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-oma-bg font-sans">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "glass-lg fixed inset-y-0 left-0 z-40 flex flex-col border-r border-oma-glass-border transition-all duration-300",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-oma-glass-border px-4">
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            {/* Sakura dot logo */}
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
              <div className="absolute inset-0 animate-oma-glow-pulse rounded-full bg-oma-primary/20" />
              <div className="relative h-5 w-5 rounded-full bg-gradient-to-br from-oma-primary to-oma-primary-dim" />
            </div>
            {!collapsed && (
              <span className="animate-oma-blur-in font-serif text-xl font-semibold tracking-tight text-oma-text opacity-0">
                Omakase
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-oma-sm px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "glass-primary text-oma-primary"
                        : "text-oma-text-muted hover:bg-white/[0.04] hover:text-oma-text"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "size-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                        isActive && "text-oma-primary"
                      )}
                    />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Collapse toggle + user */}
        <div className="border-t border-oma-glass-border p-3">
          {/* Theme toggle */}
          <div
            className={cn(
              "mb-2 flex",
              collapsed ? "justify-center" : "justify-end"
            )}
          >
            <ThemeToggle />
          </div>

          {/* User avatar */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-oma-primary to-oma-secondary text-xs font-bold text-white">
              U
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-oma-text">
                  User
                </p>
                <p className="truncate text-xs text-oma-text-subtle">
                  Developer
                </p>
              </div>
            )}
          </div>

          {/* Collapse button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="mt-3 flex w-full items-center justify-center rounded-oma-sm border border-oma-glass-border py-1.5 text-oma-text-subtle transition-all duration-200 hover:border-oma-glass-border-bright hover:text-oma-text"
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-300",
          collapsed ? "pl-16" : "pl-60"
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-oma-glass-border px-6 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            {/* Breadcrumb-like current section */}
            <span className="text-xs font-medium uppercase tracking-widest text-oma-text-subtle">
              {NAV_ITEMS.find(
                (item) =>
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/")
              )?.label ?? "Dashboard"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-xs text-oma-text-faint sm:block">
              <span className="font-jp">おまかせ</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
