"use client";

import { type DragEvent as ReactDragEvent, useCallback, useState } from "react";

type UseMarkdownDragDropParams = {
  openDroppedFilesAction: (
    files: File[],
    items?: DataTransferItemList | null
  ) => Promise<void>;
};

export const useMarkdownDragDrop = ({
  openDroppedFilesAction,
}: UseMarkdownDragDropParams) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDragOver = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragActive(true);
    },
    []
  );

  const handleDragLeave = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (
        event.currentTarget instanceof HTMLElement &&
        event.currentTarget.contains(event.relatedTarget as Node | null)
      ) {
        return;
      }

      setIsDragActive(false);
    },
    []
  );

  const handleDrop = useCallback(
    async (event: ReactDragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragActive(false);

      const files = Array.from(event.dataTransfer?.files ?? []);

      if (files.length === 0) {
        return;
      }

      await openDroppedFilesAction(files, event.dataTransfer?.items ?? null);
    },
    [openDroppedFilesAction]
  );

  return {
    handleDragLeave,
    handleDragOver,
    handleDrop,
    isDragActive,
  };
};
