"use client";

import * as React from "react";

import {
  insertBlockAction,
  prefixLinesAction,
  runEditorCommandAction,
  wrapSelectionAction,
} from "@/lib/markdown-editor";

type UseMarkdownHotkeysParams = {
  enabled: boolean;
  saveEnabled: boolean;
  onSave: () => Promise<void> | void;
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
};

export const useMarkdownHotkeys = ({
  enabled,
  saveEnabled,
  onSave,
  editorRef,
}: UseMarkdownHotkeysParams) => {
  React.useEffect(() => {
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
        void runEditorCommandAction("redo", editorRef.current);
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
          wrapSelectionAction(
            editorRef.current,
            "[",
            "](https://example.com)",
            "link text"
          );
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
          void onSave();
          return;
        }
        case "y": {
          event.preventDefault();
          void runEditorCommandAction("redo", editorRef.current);
          return;
        }
        case "z": {
          event.preventDefault();
          void runEditorCommandAction("undo", editorRef.current);
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
  }, [editorRef, enabled, onSave, saveEnabled]);
};
