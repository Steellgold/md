"use client";

import { type RefObject, useEffect } from "react";

type UseMarkdownPreviewSynchronizationInput = {
  editorRef: RefObject<HTMLTextAreaElement | null>;
  activeDocumentId: string | null;
  activeFilePresent: boolean;
  content: string;
  isPreviewVisible: boolean;
  previewDetached: boolean;
  syncPreviewContent: (content: string, options?: { immediate?: boolean }) => void;
  syncPreviewToEditor: () => void;
  syncScrollEnabled: boolean;
  viewMode: "editor" | "split" | "preview";
};

export const useMarkdownPreviewSynchronization = ({
  editorRef,
  activeDocumentId,
  activeFilePresent,
  content,
  isPreviewVisible,
  previewDetached,
  syncPreviewContent,
  syncPreviewToEditor,
  syncScrollEnabled,
  viewMode,
}: UseMarkdownPreviewSynchronizationInput) => {
  useEffect(() => {
    const nextPreviewContent = isPreviewVisible
      ? (editorRef.current?.value ?? content)
      : content;
    syncPreviewContent(nextPreviewContent, { immediate: true });
  }, [activeDocumentId, content, editorRef, isPreviewVisible, syncPreviewContent]);

  useEffect(() => {
    if (!activeFilePresent || !syncScrollEnabled) {
      return;
    }

    if (previewDetached || viewMode === "editor") {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      syncPreviewToEditor();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [
    activeFilePresent,
    previewDetached,
    syncScrollEnabled,
    syncPreviewToEditor,
    viewMode,
  ]);
};
