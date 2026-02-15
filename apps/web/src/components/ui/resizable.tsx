"use client"

import * as React from "react"
import { GripVertical } from "lucide-react"
import {
  Group,
  Panel,
  Separator,
} from "react-resizable-panels"

import { cn } from "@/lib/utils"

function ResizablePanelGroup({
  className,
  direction,
  ...props
}: React.ComponentProps<typeof Group> & {
  direction?: "horizontal" | "vertical"
}) {
  return (
    <Group
      data-slot="resizable-panel-group"
      orientation={direction ?? props.orientation}
      className={cn(
        "flex h-full w-full",
        className
      )}
      {...props}
    />
  )
}

const ResizablePanel = Panel

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean
}) {
  return (
    <Separator
      data-slot="resizable-handle"
      className={cn(
        "bg-oma-glass-border relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:-left-1 after:-right-1 focus-visible:ring-1 focus-visible:ring-oma-primary focus-visible:outline-none",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-6 w-3 items-center justify-center rounded-oma border border-oma-glass-border bg-oma-bg-elevated">
          <GripVertical className="h-3 w-3 text-oma-text-subtle" />
        </div>
      )}
    </Separator>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
