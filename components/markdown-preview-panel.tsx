import { useIsMobile } from "@/hooks/use-mobile";
import { MarkdownPreview } from "@/components/markdown-preview";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { type MarkdownViewerSelection } from "@/types/markdown-viewer-selection";
import { type RefObject } from "react";

type MarkdownPreviewPanelProps = {
  content: string;
  previewRef: RefObject<HTMLDivElement | null>;
  editorSelection: MarkdownViewerSelection | null;
  onOpenInternalLinkAction?: (href: string) => void;
  topOverlayHeight?: number;
  onScroll: () => void;
};

export const MarkdownPreviewPanel = ({
  content,
  previewRef,
  editorSelection,
  onOpenInternalLinkAction,
  topOverlayHeight,
  onScroll,
}: MarkdownPreviewPanelProps) => {
  const isMobile = useIsMobile();
  const shouldShowTopOverlay = !isMobile && !!topOverlayHeight && topOverlayHeight > 0;

  return (
    <Card className="flex h-full min-h-0 flex-col gap-0 rounded-none border-0 bg-transparent py-0 ring-0">
      <CardContent className="relative flex flex-1 min-h-0 flex-col px-0">
        {shouldShowTopOverlay ? (
          <div
            className="z-10 shrink-0 border-b bg-background/75 backdrop-blur-xl"
            style={{ height: `${topOverlayHeight}px` }}
          />
        ) : null}

        <div
          ref={previewRef}
          onScroll={onScroll}
          tabIndex={0}
          className="min-h-0 flex-1 overflow-y-auto outline-none"
        >
          {content.trim() ? (
            <MarkdownPreview
              content={content}
              editorSelection={editorSelection}
              onOpenInternalLinkAction={onOpenInternalLinkAction}
            />
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
