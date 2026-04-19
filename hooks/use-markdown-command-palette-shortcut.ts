"use client";

import { useEffect } from "react";

type UseMarkdownCommandPaletteShortcutInput = {
  enabled: boolean;
  onOpenAction: () => void;
};

export const useMarkdownCommandPaletteShortcut = ({
  enabled,
  onOpenAction,
}: UseMarkdownCommandPaletteShortcutInput) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) {
        return;
      }

      if (event.shiftKey) {
        return;
      }

      if (event.key.toLowerCase() !== "k") {
        return;
      }

      event.preventDefault();
      onOpenAction();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, onOpenAction]);
};
