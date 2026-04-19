"use client";

import { Spinner } from "@/components/ui/spinner";

type MarkdownBusyOverlayProps = {
  activeFilePresent: boolean;
  message: string | null;
  pendingRecentFilePresent: boolean;
  visible: boolean;
};

export const MarkdownBusyOverlay = ({
  activeFilePresent,
  message,
  pendingRecentFilePresent,
  visible,
}: MarkdownBusyOverlayProps) => {
  if (!visible) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/80 px-4 backdrop-blur-md">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border bg-background/95 px-6 py-5 text-center shadow-xl">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Spinner className="size-5" />
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{message}</p>
          <p className="text-sm text-muted-foreground">
            {pendingRecentFilePresent && !activeFilePresent
              ? "Loading the document into the editor."
              : "Please wait a moment."}
          </p>
        </div>
      </div>
    </div>
  );
};
