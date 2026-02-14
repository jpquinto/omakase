"use client";

import { Toaster, toast } from "sonner";

// ---------------------------------------------------------------------------
// Toast Provider Component
//
// Wraps sonner's Toaster with Omakase liquid glass design overrides (frosted
// glass surfaces, soft tinted backgrounds for status variants). Drop this
// into the root layout to enable toast notifications across the application.
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
            "glass rounded-oma-lg px-4 py-3 flex items-center gap-3 text-sm font-medium text-oma-text w-[356px]",
          title: "font-semibold text-oma-text",
          description: "text-oma-text-muted text-xs mt-0.5",
          success: "!border-oma-done/30 !bg-oma-done/10",
          error: "!border-oma-fail/30 !bg-oma-fail/10",
          warning: "!border-oma-pending/30 !bg-oma-pending/10",
          info: "!border-oma-progress/30 !bg-oma-progress/10",
        },
      }}
    />
  );
}

// Re-export toast for convenient imports from a single module
export { toast };
