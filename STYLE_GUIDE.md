# Omakase Style Guide — Liquid Glass Design System

A Japanese-inspired glassmorphism design language with light/dark modes. All tokens are defined in `apps/web/src/app/globals.css`. The interactive showcase lives at `/style-system`.

> **"Omakase" (お任せ)** — "I'll leave it to you." Trust in the craftsperson.

## Design Pillars

1. **Liquid Glass Translucency** — Frosted glassmorphism that reveals depth through layered surfaces
2. **Japanese Minimalism** — Negative space is intentional; every element earns its place
3. **Trust & Intention** — Purposeful motion, restrained decoration, confident typography

---

## Typography

| Role | Font Family | CSS Variable |
|------|-------------|--------------|
| Headings | Instrument Serif | `--font-serif` |
| Body | Outfit | `--font-sans` |
| Japanese | Noto Serif JP | `--font-jp` |
| Code | JetBrains Mono | `--font-mono` |

**Heading scale:**
- h1: `text-5xl md:text-6xl font-bold font-serif`
- h2: `text-4xl md:text-5xl font-semibold font-serif`
- h3: `text-3xl md:text-4xl font-medium font-serif`
- h4: `text-2xl md:text-3xl font-medium`
- h5: `text-xl md:text-2xl font-medium`
- h6: `text-lg md:text-xl font-medium`

**Body sizes:** `text-xl` (20px), `text-lg` (18px), `text-base` (16px), `text-sm` (14px), `text-xs` (12px)

**Weights:** `font-light` (300), `font-normal` (400), `font-medium` (500), `font-semibold` (600), `font-bold` (700)

---

## Color Palette

### Brand Colors (static, theme-independent)

| Name | Token | Default | Soft | Dim |
|------|-------|---------|------|-----|
| **Sakura** (桜) Primary | `oma-primary` | `#f472b6` | `#f9a8d4` | `#ec4899` |
| **Beni** (紅) Secondary | `oma-secondary` | `#f87171` | `#fca5a5` | `#ef4444` |
| **Gold** (金) Accent | `oma-gold` | `#fbbf24` | `#f59e0b` | `#d97706` |
| **Jade** (翡翠) Accent | `oma-jade` | `#6ee7b7` | `#34d399` | `#10b981` |
| **Indigo** (藍) Accent | `oma-indigo` | `#818cf8` | `#a5b4fc` | `#6366f1` |

Usage: `text-oma-primary`, `bg-oma-gold`, `border-oma-jade-dim`, etc.

### Semantic Colors

| Purpose | Token | Value |
|---------|-------|-------|
| Success | `oma-success` | `#4ade80` |
| Warning | `oma-warning` | `#fbbf24` |
| Error | `oma-error` | `#f87171` |
| Info | `oma-info` | `#38bdf8` |

### Status Colors

| Status | Token | Value |
|--------|-------|-------|
| Pending | `oma-pending` | `#fbbf24` |
| In Progress | `oma-progress` | `#38bdf8` |
| Done | `oma-done` | `#4ade80` |
| Failed | `oma-fail` | `#f87171` |

### Dark Mode (default `:root`)

| Role | Token | Value |
|------|-------|-------|
| Deepest BG | `oma-bg-deep` | `#060609` |
| Main BG | `oma-bg` | `#0b0b12` |
| Elevated | `oma-bg-elevated` | `#12131f` |
| Surface | `oma-bg-surface` | `#181a2a` |
| Primary text | `oma-text` | `#e2e8f0` |
| Muted text | `oma-text-muted` | `#94a3b8` |
| Subtle text | `oma-text-subtle` | `#64748b` |
| Faint text | `oma-text-faint` | `#475569` |
| Glass border | `oma-glass-border` | `rgba(255,255,255,0.08)` |
| Glass border bright | `oma-glass-border-bright` | `rgba(255,255,255,0.16)` |

### Light Mode (`.light` class)

| Role | Token | Value |
|------|-------|-------|
| Deepest BG | `oma-bg-deep` | `#f8f6f3` |
| Main BG | `oma-bg` | `#faf9f7` |
| Elevated | `oma-bg-elevated` | `#ffffff` |
| Surface | `oma-bg-surface` | `#f1eeeb` |
| Primary text | `oma-text` | `#1a1a2e` |
| Glass border | `oma-glass-border` | `rgba(0,0,0,0.06)` |
| Glass border bright | `oma-glass-border-bright` | `rgba(0,0,0,0.12)` |

---

## Glass Surfaces

The core visual language. Always use these utility classes rather than manually setting `backdrop-filter`.

| Class | Blur | BG (dark) | BG (light) | Border |
|-------|------|-----------|------------|--------|
| `.glass-sm` | 12px | `rgba(255,255,255,0.02)` | `rgba(255,255,255,0.4)` | `oma-glass-border` |
| `.glass` | 20px | `rgba(255,255,255,0.03)` | `rgba(255,255,255,0.6)` | `oma-glass-border` |
| `.glass-lg` | 32px | `rgba(255,255,255,0.05)` | `rgba(255,255,255,0.75)` | `oma-glass-border-bright` |

### Color-Tinted Glass

| Class | Tint Color | Use Case |
|-------|------------|----------|
| `.glass-primary` | Sakura pink | Primary actions, highlighted cards |
| `.glass-secondary` | Beni red | Secondary emphasis |
| `.glass-gold` | Gold | Accent highlights, agent badges |

### Interactive Glass States

| Class | Effect |
|-------|--------|
| `.glass-hover` | Brightens on hover (apply alongside `.glass`) |
| `.glass-active` | Pressed/active state with elevated border |

### Special Effects

| Class | Effect |
|-------|--------|
| `.glass-edge` | Gradient border via `::before` pseudo-element — liquid glass edge |
| `.glow-primary` | Pink shadow aura |
| `.glow-secondary` | Red shadow aura |
| `.glow-gold` | Gold shadow aura |

**Nesting:** Glass surfaces can be layered for depth. A `.glass` card inside a `.glass-sm` container creates visual hierarchy.

---

## Border Radius

| Token | Value | Tailwind Class |
|-------|-------|----------------|
| `--radius-oma-sm` | 8px | `rounded-oma-sm` |
| `--radius-oma` | 12px | `rounded-oma` |
| `--radius-oma-lg` | 16px | `rounded-oma-lg` |
| `--radius-oma-xl` | 24px | `rounded-oma-xl` |
| `--radius-oma-full` | 9999px | `rounded-oma-full` |

Default for cards/containers: `rounded-oma-lg` (16px). Buttons: `rounded-oma` (12px). Pills/badges: `rounded-oma-full`.

---

## Shadows

| Token | Value | Use |
|-------|-------|-----|
| `--shadow-oma-sm` | `0 1px 2px rgba(0,0,0,0.4)` | Subtle elevation |
| `--shadow-oma` | `0 4px 16px rgba(0,0,0,0.4)` | Standard card shadow |
| `--shadow-oma-lg` | `0 8px 32px rgba(0,0,0,0.5)` | Modals, dropdowns |
| `--shadow-oma-glow-primary` | `0 0 24px rgba(244,114,182,0.2)` | Pink glow |
| `--shadow-oma-glow-secondary` | `0 0 24px rgba(248,113,113,0.15)` | Red glow |
| `--shadow-oma-glow-gold` | `0 0 24px rgba(251,191,36,0.15)` | Gold glow |

---

## Spacing & Layout

**Scale:** Standard Tailwind 4px increments — `1` (4px), `2` (8px), `3` (12px), `4` (16px), `5` (20px), `6` (24px), `8` (32px), `12` (48px), `16` (64px), `20` (80px), `24` (96px).

**Breakpoints:** `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px), `2xl` (1536px).

**Grid:** Use `grid grid-cols-{n} gap-3` or `gap-4`. Responsive: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.

---

## Animations & Motion

### Animation Classes

| Class | Duration | Effect | Use Case |
|-------|----------|--------|----------|
| `animate-oma-fade-up` | 0.6s | Translate up + fade in | Page/section reveals |
| `animate-oma-slide-in-right` | 0.5s | Translate from right + fade | List item reveals |
| `animate-oma-scale-in` | 0.4s | Scale 0.9→1 + fade | Pop-in effects |
| `animate-oma-blur-in` | 0.6s | Blur(10px)→0 + fade | Soft entrances |
| `animate-oma-glass-shimmer` | 3s loop | BG position shift | Ambient shimmer |
| `animate-oma-float` | 6s loop | Vertical ±8px | Decorative float |
| `animate-oma-breathe` | 4s loop | Opacity 0.4↔0.8 | Alive/present indicator |
| `animate-oma-glow-pulse` | 3s loop | Shadow expand/contract | Attention indicator |

### Transition Timing

| Duration | Easing | Use |
|----------|--------|-----|
| 150ms | `ease-out` | Micro-interactions (hover, focus, toggle) |
| 300ms | `ease-in-out` | State changes (expand, collapse) |
| 600ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Entrance animations |
| 3–6s | `ease-in-out` | Ambient loops (breathe, float) |

### Motion Principles

- **Purposeful, not decorative** — every animation communicates something
- **Respect `prefers-reduced-motion`** — always provide reduced alternatives
- **Entrances over exits** — invest in how things appear, let them leave simply
- **Consistent duration** — same-class elements should animate identically
- **Staggered delays** — 50–100ms between list items

---

## Component Patterns

### Buttons

Use shadcn/ui `<Button>` with these variants: `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`.

Sizes: `xs`, `sm`, `default`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`.

Custom glass buttons use the glass utility classes directly:
```tsx
<button className="glass glass-hover rounded-oma px-4 py-2 text-oma-text">Glass Button</button>
<button className="glass-primary rounded-oma px-4 py-2 text-oma-primary">Glass Primary</button>
```

### Cards

Four card patterns:

1. **Glass Card** — `className="glass rounded-oma-lg p-6"`
2. **Solid Card** — `className="bg-oma-bg-surface border border-oma-glass-border rounded-oma-lg p-6"`
3. **Gradient Border** — `className="glass glass-edge rounded-oma-lg p-6"`
4. **Glow Card** — `className="glass glow-primary rounded-oma-lg p-6"`

### Form Elements

- **Input:** `border-oma-glass-border-bright bg-oma-bg-surface focus-visible:border-oma-primary`
- **Select/Textarea:** Same glass-surface styling as inputs
- **Checkbox/Switch:** `data-[state=checked]:bg-oma-primary`
- **Slider:** Custom track `bg-oma-bg-surface`, range `bg-oma-primary`

### Badges

- **Status badges:** Colored dot + label with glass background
- **Agent role badges:** Color-coded — Architect (`.glass-primary`), Coder (`.glass-gold`), Reviewer (indigo tint), Tester (jade tint)
- **shadcn variants:** `default`, `secondary`, `destructive`, `outline`

### Navigation

- **Tabs:** `bg-oma-bg-surface` list container, `data-[state=active]` highlight
- **Breadcrumbs:** `text-oma-text-subtle` links, separator arrows
- **Sidebar:** `.glass` background, `.glass-active` for current item

### Data Display

- **Stats cards:** `.glass` container with large number + label
- **Tables:** `border-oma-glass-border` row borders, `hover:bg-white/[0.02]` row hover
- **Lists:** Separator lines with `bg-oma-glass-border`

### Feedback

- **Alerts:** Color-coded by severity — info (blue), success (green), warning (amber), error (red) with matching icons
- **Progress bars:** `bg-oma-bg-surface` track, `bg-oma-primary` fill bar
- **Skeleton loaders:** `bg-oma-bg-surface` with shimmer
- **Toasts:** Via `sonner` library — `toast.success()`, `toast.error()`, `toast.info()`

---

## Decorative Elements

| Class | Element | Use |
|-------|---------|-----|
| `.oma-enso` | Zen circle (円相) | Hero sections, empty states |
| `.oma-wave-pattern` | Seigaiha wave (青海波) | Background texture |
| Gradient blobs | Radial gradients (indigo/pink/gold) | Ambient background mesh |

Use sparingly. These are accent elements, not primary UI.

---

## Icons

Use [Lucide React](https://lucide.dev/) exclusively. Import from `lucide-react`:

```tsx
import { Home, Settings, GitBranch, Sparkles } from "lucide-react";
```

Standard sizes: 16px (`w-4 h-4`), 20px (`w-5 h-5`), 24px (`w-6 h-6`).

---

## Utilities

- **`cn()`** from `src/lib/utils.ts` — merges Tailwind classes via `clsx` + `tailwind-merge`
- **Theme toggle** — via `next-themes` provider, classes `.dark` / `.light` on `<html>`

---

## Quick Reference: Building a New Component

```tsx
// Standard glass card with heading
<div className="glass rounded-oma-lg p-6">
  <h3 className="font-serif text-xl text-oma-text mb-2">Title</h3>
  <p className="text-sm text-oma-text-muted">Description</p>
</div>

// Status badge
<span className="inline-flex items-center gap-1.5 rounded-oma-full bg-oma-done/10 px-2.5 py-0.5 text-xs text-oma-done">
  <span className="h-1.5 w-1.5 rounded-full bg-oma-done" />
  Passing
</span>

// Glass button with icon
<button className="glass glass-hover rounded-oma px-4 py-2 text-sm text-oma-text inline-flex items-center gap-2">
  <Sparkles className="w-4 h-4" />
  Action
</button>
```
