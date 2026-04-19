"use client";

import type { ReactNode } from "react";

type MarkdownAppMainViewProps = {
  activeFilePresent: boolean;
  isSharedViewerMode: boolean;
  sharedViewer: ReactNode;
  activeDocumentView: ReactNode;
  emptyHomeView: ReactNode;
};

export const MarkdownAppMainView = ({
  activeFilePresent,
  isSharedViewerMode,
  sharedViewer,
  activeDocumentView,
  emptyHomeView,
}: MarkdownAppMainViewProps) => {
  if (activeFilePresent && isSharedViewerMode) {
    return <>{sharedViewer}</>;
  }

  if (activeFilePresent) {
    return <>{activeDocumentView}</>;
  }

  return <>{emptyHomeView}</>;
};
