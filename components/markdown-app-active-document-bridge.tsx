"use client";

import { MarkdownActiveDocument } from "@/components/markdown-active-document";
import type { ComponentProps } from "react";

type MarkdownAppActiveDocumentBridgeProps = ComponentProps<
  typeof MarkdownActiveDocument
>;

export const MarkdownAppActiveDocumentBridge = (
  props: MarkdownAppActiveDocumentBridgeProps
) => {
  return <MarkdownActiveDocument {...props} />;
};
