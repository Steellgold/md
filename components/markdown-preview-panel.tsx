import { useIsMobile } from "@/hooks/use-mobile";
import { MarkdownPreview } from "@/components/markdown-preview";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { type MarkdownViewerSelection } from "@/types/markdown-viewer-selection";
import { ArrowUpRightIcon, Maximize2Icon, Minimize2Icon } from "lucide-react";
import { type RefObject, useState } from "react";

type MarkdownPreviewPanelProps = {
  content: string;
  previewRef: RefObject<HTMLDivElement | null>;
  editorSelection: MarkdownViewerSelection | null;
  onOpenInternalLinkAction?: (href: string) => void;
  topOverlayHeight?: number;
  onScroll: () => void;
  previewDetached: boolean;
  togglePreviewDetachedAction: () => void;
};

export const MarkdownPreviewPanel = ({
  content,
  previewRef,
  editorSelection,
  onOpenInternalLinkAction,
  topOverlayHeight,
  onScroll,
  previewDetached,
  togglePreviewDetachedAction,
}: MarkdownPreviewPanelProps) => {
  const isMobile = useIsMobile();
  const [focusMode, setFocusMode] = useState(false);
  const shouldShowTopOverlay = !isMobile && !!topOverlayHeight && topOverlayHeight > 0;

  return (
    <Card className="flex h-full min-h-0 flex-col gap-0 rounded-none border-0 bg-transparent py-0 ring-0">
      <CardContent className="relative flex flex-1 min-h-0 flex-col px-0">
        {shouldShowTopOverlay ? (
          <div
            className="z-10 flex shrink-0 items-center justify-end gap-2 border-b bg-background/75 px-3 backdrop-blur-xl"
            style={{ height: `${topOverlayHeight}px` }}
          >
            <Button
              variant={focusMode ? "secondary" : "outline"}
              size="sm"
              onClick={() => setFocusMode((currentValue) => !currentValue)}
              title={
                focusMode
                  ? "Exit focus mode"
                  : "Enable focus mode for distraction-free reading"
              }
            >
              {focusMode ? (
                <Minimize2Icon data-icon="inline-start" />
              ) : (
                <Maximize2Icon data-icon="inline-start" />
              )}
              {focusMode ? "Exit focus" : "Focus mode"}
            </Button>
            <Button
              variant={previewDetached ? "secondary" : "outline"}
              size="sm"
              onClick={togglePreviewDetachedAction}
              title={
                previewDetached
                  ? "Move the preview back into the main window"
                  : "Open the preview in a separate window"
              }
            >
              <ArrowUpRightIcon data-icon="inline-start" />
              {previewDetached ? "Attach preview" : "Detach preview"}
            </Button>
          </div>
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
              focusMode={focusMode}
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
