"use client";

import { useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Keyboard Shortcuts Hook
//
// Listens for global keyboard events and dispatches to registered handlers.
// Automatically ignores key presses when the user is typing in an input,
// textarea, select, or contenteditable element to prevent accidental
// shortcut activation while editing text.
//
// Supported shortcuts:
//   G     - Toggle between Kanban and Graph view
//   N     - Open "new feature" modal
//   D     - Toggle debug panel
//   ,     - Open settings
//   ?     - Show keyboard shortcuts help
// ---------------------------------------------------------------------------

export interface KeyboardShortcutHandlers {
  /** Called when "G" is pressed to toggle graph/kanban view */
  onToggleGraph?: () => void;
  /** Called when "N" is pressed to open the new feature modal */
  onNewFeature?: () => void;
  /** Called when "D" is pressed to toggle the debug panel */
  onToggleDebug?: () => void;
  /** Called when "," is pressed to open settings */
  onOpenSettings?: () => void;
  /** Called when "?" is pressed to show shortcuts help */
  onShowHelp?: () => void;
}

/**
 * Determines whether the keyboard event target is an interactive element
 * where shortcuts should be suppressed (inputs, textareas, selects, or
 * contenteditable elements).
 */
function isInteractiveElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }

  if (target.isContentEditable) {
    return true;
  }

  return false;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Do not intercept shortcuts when modifier keys are held (allow browser defaults)
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      // Do not intercept when the user is typing in an interactive element
      if (isInteractiveElement(event.target)) return;

      switch (event.key.toLowerCase()) {
        case "g":
          event.preventDefault();
          handlers.onToggleGraph?.();
          break;
        case "n":
          event.preventDefault();
          handlers.onNewFeature?.();
          break;
        case "d":
          event.preventDefault();
          handlers.onToggleDebug?.();
          break;
        case ",":
          event.preventDefault();
          handlers.onOpenSettings?.();
          break;
        case "?":
          event.preventDefault();
          handlers.onShowHelp?.();
          break;
      }
    },
    [handlers],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
