"use client";

import { MarkdownPreview } from "@/components/markdown-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type RecentMarkdownFile } from "@/types/markdown";
import { SquarePenIcon } from "lucide-react";
import { type RefObject } from "react";

type MarkdownSharedViewerProps = {
  activeFile: RecentMarkdownFile;
  content: string;
  isBusy: boolean;
  previewRef: RefObject<HTMLDivElement | null>;
  editLocallyAction: () => void;
};

export const MarkdownSharedViewer = ({
  content,
  isBusy,
  previewRef,
  editLocallyAction,
}: MarkdownSharedViewerProps) => {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <div className="border-b bg-background/95">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 rounded-2xl border bg-muted/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Would you like to edit this file?
              </p>
              <p className="text-sm text-muted-foreground">
                This shared document is read-only. Editing creates a local
                copy and asks where to save it.
              </p>
            </div>

            <Button onClick={editLocallyAction} disabled={isBusy}>
              <SquarePenIcon data-icon="inline-start" />
              Edit locally
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        <Card className="min-h-0 flex-1 overflow-hidden border bg-card shadow-sm">
          <CardContent className="h-full p-0">
            <div ref={previewRef} className="h-full overflow-y-auto">
              {content.trim() ? (
                <MarkdownPreview content={content} editorSelection={null} />
              ) : (
                <div className="flex h-full items-center justify-center px-6 py-10 text-sm text-muted-foreground">
                  This shared document is empty.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
