"use client";

import { FilePlusIcon, FolderOpenIcon, UploadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type MarkdownEmptyStateProps = {
  isDragActive: boolean;
  isBusy: boolean;
  canPersistFiles: boolean;
  openFileAction: () => void;
  createNewAction: () => void;
};

export const MarkdownEmptyState = ({
  isDragActive,
  isBusy,
  canPersistFiles,
  openFileAction,
  createNewAction,
}: MarkdownEmptyStateProps) => {
  return (
    <Empty
      className={
        isDragActive
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border bg-card/60"
      }
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UploadIcon />
        </EmptyMedia>
        <EmptyTitle>Open a Markdown file</EmptyTitle>
        <EmptyDescription>
          Drop a <code>.md</code> file here, or open it from the browser to
          launch the editor and live preview.
        </EmptyDescription>
      </EmptyHeader>

      <EmptyContent className="max-w-md">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            onClick={openFileAction}
            disabled={isBusy || !canPersistFiles}
          >
            <FolderOpenIcon data-icon="inline-start" />
            Open file
          </Button>

          <Button
            onClick={createNewAction}
            disabled={isBusy}
            variant="outline"
          >
            <FilePlusIcon data-icon="inline-start" />
            Create new file
          </Button>
        </div>

        {!canPersistFiles ? (
          <p className="text-sm text-muted-foreground">
            This browser does not support persistent reopening through the local
            file access API.
          </p>
        ) : null}
      </EmptyContent>
    </Empty>
  );
};
