"use client";

import { MarkdownAppDialogs } from "@/components/markdown-app-dialogs";
import type { ComponentProps } from "react";

type MarkdownAppDialogsBridgeProps = ComponentProps<typeof MarkdownAppDialogs>;

export const MarkdownAppDialogsBridge = (props: MarkdownAppDialogsBridgeProps) => {
  return <MarkdownAppDialogs {...props} />;
};
