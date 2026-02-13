"use client";

import { Toaster, toast } from "sonner";

// ---------------------------------------------------------------------------
// Toast Provider Component
//
// Wraps sonner's Toaster with neobrutalism-styled overrides (bold borders,
// hard shadows, matching the design system). Drop this into the root layout
// to enable toast notifications across the application.
//
// Usage:
//   import { toast } from "@/components/toast-provider";
//   toast.success("Feature marked as passing!");
//   toast.error("Agent failed to start");
// ---------------------------------------------------------------------------

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "neo-card rounded-none px-4 py-3 flex items-center gap-3 text-sm font-bold text-neo-foreground w-[356px]",
          title: "font-black text-neo-foreground",
          description: "text-neo-muted-foreground text-xs font-semibold mt-0.5",
          success: "!bg-neo-done",
          error: "!bg-neo-fail",
          warning: "!bg-neo-pending",
          info: "!bg-neo-progress",
        },
      }}
    />
  );
}

// Re-export toast for convenient imports from a single module
export { toast };
