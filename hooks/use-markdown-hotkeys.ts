"use client";

import {
  insertBlockAction,
  prefixLinesAction,
  wrapSelectionAction,
} from "@/lib/markdown-editor";
import { RefObject, useEffect } from "react";

type UseMarkdownHotkeysParams = {
  enabled: boolean;
  saveEnabled: boolean;
  onSaveAction: () => Promise<void> | void;
  onOpenSwitcherAction: () => void;
  onToggleFocusModeAction: () => void;
  onUndoAction: () => void;
  onRedoAction: () => void;
  editorRef: RefObject<HTMLTextAreaElement | null>;
};

export const useMarkdownHotkeys = ({
  enabled,
  saveEnabled,
  onSaveAction,
  onOpenSwitcherAction,
  onToggleFocusModeAction,
  onUndoAction,
  onRedoAction,
  editorRef,
}: UseMarkdownHotkeysParams) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const isPrimaryModifier = event.ctrlKey || event.metaKey;

      if (!isPrimaryModifier || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "z" && event.shiftKey) {
        event.preventDefault();
        onRedoAction();
        return;
      }

      switch (key) {
        case "b": {
          event.preventDefault();
          wrapSelectionAction(editorRef.current, "**", "**", "bold text");
          return;
        }
        case "i": {
          event.preventDefault();
          wrapSelectionAction(editorRef.current, "_", "_", "italic text");
          return;
        }
        case "k": {
          event.preventDefault();
          if (event.shiftKey) {
            wrapSelectionAction(
              editorRef.current,
              "[",
              "](https://example.com)",
              "link text"
            );
            return;
          }

          onOpenSwitcherAction();
          return;
        }
        case "m": {
          if (!event.shiftKey) {
            return;
          }

          event.preventDefault();
          onToggleFocusModeAction();
          return;
        }
        case "e": {
          event.preventDefault();
          wrapSelectionAction(editorRef.current, "`", "`", "inline code");
          return;
        }
        case "l": {
          event.preventDefault();
          prefixLinesAction(editorRef.current, "- ", "List item");
          return;
        }
        case "1": {
          event.preventDefault();
          insertBlockAction(editorRef.current, "# ", "", "Heading");
          return;
        }
        case "s": {
          if (!saveEnabled) {
            return;
          }

          event.preventDefault();
          void onSaveAction();
          return;
        }
        case "y": {
          event.preventDefault();
          onRedoAction();
          return;
        }
        case "z": {
          event.preventDefault();
          onUndoAction();
          return;
        }
        default: {
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    editorRef,
    enabled,
    onOpenSwitcherAction,
    onToggleFocusModeAction,
    onRedoAction,
    onSaveAction,
    onUndoAction,
    saveEnabled,
  ]);
};
