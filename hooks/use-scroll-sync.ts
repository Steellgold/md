"use client";

import * as React from "react";

import { getScrollRatio, setScrollRatio } from "@/lib/markdown-helpers";

type UseScrollSyncParams = {
  syncScrollEnabled: boolean;
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  previewRef: React.RefObject<HTMLDivElement | null>;
};

export const useScrollSync = ({
  syncScrollEnabled,
  editorRef,
  previewRef,
}: UseScrollSyncParams) => {
  const syncingSourceRef = React.useRef<"editor" | "preview" | null>(null);

  const syncScroll = React.useCallback(
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

  const handleEditorScroll = React.useCallback(() => {
    if (syncingSourceRef.current === "preview") {
      return;
    }

    syncScroll("editor");
  }, [syncScroll]);

  const handlePreviewScroll = React.useCallback(() => {
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