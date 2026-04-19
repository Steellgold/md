"use client";

import { computeMarkdownContentHash } from "@/lib/markdown-share";
import type { RecentMarkdownFile } from "@/types/markdown";
import { useEffect, useState } from "react";

type UseMarkdownContentHashInput = {
  activeDocumentId: string | null;
  activeFile: RecentMarkdownFile | null;
  content: string;
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
};

export const useMarkdownContentHash = ({
  activeDocumentId,
  activeFile,
  content,
  editorRef,
}: UseMarkdownContentHashInput) => {
  const [contentHash, setContentHash] = useState<string | null>(null);

  useEffect(() => {
    if (!activeFile) {
      return;
    }

    let cancelled = false;
    const nextContent = editorRef.current?.value ?? content;

    void computeMarkdownContentHash(nextContent)
      .then((nextHash) => {
        if (!cancelled) {
          setContentHash(nextHash);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setContentHash(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeDocumentId, activeFile, content, editorRef]);

  return {
    contentHash: activeFile ? contentHash : null,
    setContentHash,
  };
};
