import { EyeIcon } from "lucide-react";
import * as React from "react";

import { MarkdownPreview } from "@/components/markdown-preview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MarkdownPreviewPanelProps = {
  content: string;
  previewRef: React.RefObject<HTMLDivElement | null>;
  topOverlayHeight?: number;
  onScroll: () => void;
};

export const MarkdownPreviewPanel = ({
  content,
  previewRef,
  topOverlayHeight,
  onScroll,
}: MarkdownPreviewPanelProps) => {
  return (
    <Card className="flex h-full min-h-0 flex-col gap-0 rounded-none border-0 bg-transparent py-0 ring-0">
      <CardHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary/5 p-2">
            <EyeIcon className="size-4" />
          </div>

          <CardTitle>Viewer</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="relative flex-1 min-h-0 px-0">
        <div
          ref={previewRef}
          onScroll={onScroll}
          tabIndex={0}
          className="h-full overflow-y-auto outline-none"
        >
          <div
            className="sticky top-0 z-10 border-b bg-background/75 backdrop-blur-xl"
            style={
              topOverlayHeight && topOverlayHeight > 0
                ? { height: `${topOverlayHeight}px` }
                : undefined
            }
          />

          {content.trim() ? (
            <MarkdownPreview content={content} />
          ) : (
            <div className="flex h-full items-center justify-center px-6 py-8 text-sm text-muted-foreground">
              The preview will appear here as soon as markdown is present.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
