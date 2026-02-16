"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// LiquidTabs — Animated pill-indicator tab component
//
// A tab bar where the active indicator is a floating, glowing pill that
// smoothly slides and morphs between triggers. Built on Radix UI Tabs
// primitives and styled with the Omakase liquid glass design system.
// ---------------------------------------------------------------------------

// ---- Context for pill measurement coordination ----

interface PillState {
  left: number
  width: number
  height: number
}

interface LiquidTabsContextValue {
  registerTrigger: (value: string, el: HTMLButtonElement | null) => void
  listRef: React.RefObject<HTMLDivElement | null>
}

const LiquidTabsContext = React.createContext<LiquidTabsContextValue | null>(null)

function useLiquidTabsContext() {
  const ctx = React.useContext(LiquidTabsContext)
  if (!ctx) throw new Error("LiquidTabs compound components must be used within <LiquidTabs>")
  return ctx
}

// ---- Root ----

function LiquidTabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const triggerMap = React.useRef<Map<string, HTMLButtonElement>>(new Map())
  const listRef = React.useRef<HTMLDivElement | null>(null)

  const registerTrigger = React.useCallback(
    (value: string, el: HTMLButtonElement | null) => {
      if (el) {
        triggerMap.current.set(value, el)
      } else {
        triggerMap.current.delete(value)
      }
    },
    [],
  )

  const ctx = React.useMemo(
    () => ({ registerTrigger, listRef }),
    [registerTrigger],
  )

  return (
    <LiquidTabsContext.Provider value={ctx}>
      <TabsPrimitive.Root
        data-slot="liquid-tabs"
        className={cn("flex flex-col gap-2", className)}
        {...props}
      />
    </LiquidTabsContext.Provider>
  )
}

// ---- List (container with the animated pill) ----

function LiquidTabsList({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const { listRef } = useLiquidTabsContext()
  const [pill, setPill] = React.useState<PillState | null>(null)
  const [isInitial, setIsInitial] = React.useState(true)

  // Observe active trigger changes via MutationObserver on data-state attr
  React.useEffect(() => {
    const list = listRef.current
    if (!list) return

    const measure = () => {
      const active = list.querySelector<HTMLButtonElement>(
        '[data-slot="liquid-tabs-trigger"][data-state="active"]',
      )
      if (!active) return

      const listRect = list.getBoundingClientRect()
      const triggerRect = active.getBoundingClientRect()

      setPill({
        left: triggerRect.left - listRect.left,
        width: triggerRect.width,
        height: triggerRect.height,
      })
    }

    // Initial measurement
    measure()
    // After first paint, enable transitions
    const raf = requestAnimationFrame(() => setIsInitial(false))

    const observer = new MutationObserver(measure)
    observer.observe(list, {
      attributes: true,
      attributeFilter: ["data-state"],
      subtree: true,
    })

    // Also re-measure on resize
    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(list)

    return () => {
      observer.disconnect()
      resizeObserver.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [listRef])

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="liquid-tabs-list"
      className={cn(
        "glass-sm relative inline-flex w-fit items-center overflow-x-clip rounded-oma-lg p-1",
        className,
      )}
      {...props}
    >
      {/* Animated pill indicator */}
      {pill && (
        <span
          aria-hidden
          className={cn(
            "absolute z-0 rounded-oma border border-oma-primary/20 bg-oma-primary/10",
            "shadow-[0_0_12px_rgba(244,114,182,0.15)]",
            !isInitial &&
              "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          )}
          style={{
            left: pill.left,
            width: pill.width,
            height: pill.height,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        />
      )}
      {children}
    </TabsPrimitive.List>
  )
}

// ---- Trigger ----

function LiquidTabsTrigger({
  className,
  value,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { registerTrigger } = useLiquidTabsContext()
  const ref = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    registerTrigger(value, ref.current)
    return () => registerTrigger(value, null)
  }, [value, registerTrigger])

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      data-slot="liquid-tabs-trigger"
      className={cn(
        "relative z-10 inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-oma px-5 py-2.5 text-sm font-medium tracking-wide transition-all duration-200",
        "text-oma-text-muted hover:text-oma-text hover:shadow-[0_0_16px_rgba(244,114,182,0.12)]",
        "data-[state=active]:text-oma-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oma-primary/30",
        "disabled:pointer-events-none disabled:opacity-40 disabled:cursor-default",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

// ---- Content ----

function LiquidTabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="liquid-tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { LiquidTabs, LiquidTabsList, LiquidTabsTrigger, LiquidTabsContent }
