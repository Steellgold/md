"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type OpenMarkdownDocument } from "@/types/markdown";
import { FileTextIcon, LinkIcon, XIcon } from "lucide-react";

type MarkdownDocumentTabsProps = {
  openDocuments: OpenMarkdownDocument[];
  activeDocumentId: string | null;
  setActiveDocumentAction: (id: string) => void;
  closeDocumentAction: (id: string) => void;
};

export const MarkdownDocumentTabs = ({
  openDocuments,
  activeDocumentId,
  setActiveDocumentAction,
  closeDocumentAction,
}: MarkdownDocumentTabsProps) => {
  if (openDocuments.length <= 1) {
    return null;
  }

  return (
    <div className="border-b bg-muted/30 px-3 py-2">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {openDocuments.map((document) => {
          const isActive = document.id === activeDocumentId;
          const isRemoteDocument = document.file.source === "url";
          const SourceIcon = isRemoteDocument ? LinkIcon : FileTextIcon;

          return (
            <div
              key={document.id}
              className={cn(
                "group flex min-w-0 shrink-0 items-center gap-2 rounded-lg border px-2 py-1.5",
                isActive
                  ? "border-border bg-background shadow-sm"
                  : "border-transparent bg-transparent hover:border-border/70 hover:bg-background/70"
              )}
            >
              <button
                type="button"
                className="flex min-w-0 items-center gap-2 text-left"
                onClick={() => setActiveDocumentAction(document.id)}
              >
                <SourceIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="max-w-52 truncate text-sm font-medium">
                  {document.file.name}
                </span>
                {document.isDirty ? (
                  <span
                    className="size-2 shrink-0 rounded-full bg-primary"
                    aria-label="Unsaved changes"
                    title="Unsaved changes"
                  />
                ) : null}
              </button>

              <Button
                variant="ghost"
                size="icon-xs"
                className="shrink-0"
                aria-label={`Close ${document.file.name}`}
                title={`Close ${document.file.name}`}
                onClick={() => closeDocumentAction(document.id)}
              >
                <XIcon />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
