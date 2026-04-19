"use client";

import type { ReactNode } from "react";

type MarkdownAppModalLayerProps = {
  busyOverlay: ReactNode;
  dialogs: ReactNode;
};

export const MarkdownAppModalLayer = ({
  busyOverlay,
  dialogs,
}: MarkdownAppModalLayerProps) => {
  return (
    <>
      {busyOverlay}
      {dialogs}
    </>
  );
};
