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
    <div className="border-b bg-muted/20">
      <div className="flex h-11 overflow-x-auto">
        {openDocuments.map((document) => {
          const isActive = document.id === activeDocumentId;
          const isRemoteDocument = document.file.source === "url";
          const SourceIcon = isRemoteDocument ? LinkIcon : FileTextIcon;

          return (
            <div
              key={document.id}
              className={cn(
                "group -mb-px flex h-full min-w-0 shrink-0 items-center gap-2 border-r px-3 first:border-l",
                isActive
                  ? "border-border border-b-background bg-background"
                  : "border-transparent bg-transparent hover:bg-background/60"
              )}
            >
              <button
                type="button"
                className="flex h-full min-w-0 flex-1 items-center gap-2 text-left"
                onClick={() => setActiveDocumentAction(document.id)}
                title={document.file.relativePath ?? document.file.name}
              >
                <SourceIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="max-w-56 truncate text-sm font-medium">
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
                className="h-7 w-7 shrink-0 rounded-none"
                aria-label={`Close ${document.file.name}`}
                title={
                  document.file.relativePath
                    ? `Close ${document.file.relativePath}`
                    : `Close ${document.file.name}`
                }
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
