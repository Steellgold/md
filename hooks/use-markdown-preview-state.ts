"use client";

import { startTransition, useCallback, useDeferredValue, useEffect, useRef, useState } from "react";

type UseMarkdownPreviewStateParams = {
  content: string;
  isLargeDocument: boolean;
  largeFilePreviewSyncDelayMs: number;
  viewMode: "split" | "editor" | "preview";
};

export const useMarkdownPreviewState = ({
  content,
  isLargeDocument,
  largeFilePreviewSyncDelayMs,
  viewMode,
}: UseMarkdownPreviewStateParams) => {
  const [previewDetached, setPreviewDetached] = useState(false);
  const [previewRenderContent, setPreviewRenderContent] = useState(content);
  const previewSyncTimeoutRef = useRef<number | null>(null);
  const isPreviewVisible = previewDetached || viewMode !== "editor";
  const deferredPreviewContent = useDeferredValue(previewRenderContent);
  const previewContent = isLargeDocument ? previewRenderContent : deferredPreviewContent;

  const syncPreviewContent = useCallback(
    (nextValue: string, options?: { immediate?: boolean }) => {
      if (previewSyncTimeoutRef.current) {
        window.clearTimeout(previewSyncTimeoutRef.current);
        previewSyncTimeoutRef.current = null;
      }

      const applyPreviewContent = () => {
        startTransition(() => {
          setPreviewRenderContent((currentValue) =>
            currentValue === nextValue ? currentValue : nextValue
          );
        });
      };

      if (!isPreviewVisible || options?.immediate || !isLargeDocument) {
        applyPreviewContent();
        return;
      }

      previewSyncTimeoutRef.current = window.setTimeout(() => {
        applyPreviewContent();
        previewSyncTimeoutRef.current = null;
      }, largeFilePreviewSyncDelayMs);
    },
    [isLargeDocument, isPreviewVisible, largeFilePreviewSyncDelayMs]
  );

  const clearPendingPreviewSync = useCallback(() => {
    if (previewSyncTimeoutRef.current) {
      window.clearTimeout(previewSyncTimeoutRef.current);
      previewSyncTimeoutRef.current = null;
    }
  }, []);

  const closePreviewDetached = useCallback(() => {
    setPreviewDetached(false);
  }, []);

  useEffect(() => {
    return () => {
      if (previewSyncTimeoutRef.current) {
        window.clearTimeout(previewSyncTimeoutRef.current);
      }
    };
  }, []);

  return {
    clearPendingPreviewSync,
    closePreviewDetached,
    previewContent,
    previewDetached,
    previewRenderContent,
    isPreviewVisible,
    setPreviewDetached,
    syncPreviewContent,
  };
};
