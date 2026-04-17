"use client";

import { getScrollRatio, setScrollRatio } from "@/lib/markdown-helpers";
import { RefObject, useCallback, useRef } from "react";

type UseScrollSyncParams = {
  syncScrollEnabled: boolean;
  editorRef: RefObject<HTMLTextAreaElement | null>;
  previewRef: RefObject<HTMLDivElement | null>;
};

export const useScrollSync = ({
  syncScrollEnabled,
  editorRef,
  previewRef,
}: UseScrollSyncParams) => {
  const syncingSourceRef = useRef<"editor" | "preview" | null>(null);

  const syncScroll = useCallback(
    (source: "editor" | "preview") => {
      const editorElement = editorRef.current;
      const previewElement = previewRef.current;

      if (!editorElement || !previewElement || !syncScrollEnabled) {
        return;
      }

      const sourceElement =
        source === "editor" ? editorElement : previewElement;
      const targetElement =
        source === "editor" ? previewElement : editorElement;

      syncingSourceRef.current = source;
      setScrollRatio(targetElement, getScrollRatio(sourceElement));

      window.requestAnimationFrame(() => {
        syncingSourceRef.current = null;
      });
    },
    [editorRef, previewRef, syncScrollEnabled]
  );

  const handleEditorScroll = useCallback(() => {
    if (syncingSourceRef.current === "preview") {
      return;
    }

    syncScroll("editor");
  }, [syncScroll]);

  const handlePreviewScroll = useCallback(() => {
    if (syncingSourceRef.current === "editor") {
      return;
    }

    syncScroll("preview");
  }, [syncScroll]);

  return {
    handleEditorScroll,
    handlePreviewScroll,
  };
};