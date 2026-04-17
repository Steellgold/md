"use client";

import { MarkdownOpenUrlDialog } from "@/components/markdown-open-url-dialog";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { type MarkdownOpenFromUrlActionResult } from "@/types/markdown";
import {
  ChevronDownIcon,
  FilePlusIcon,
  FolderOpenIcon,
  LinkIcon,
  UploadIcon,
} from "lucide-react";
import { useState } from "react";

type MarkdownEmptyStateProps = {
  isDragActive: boolean;
  isBusy: boolean;
  canPersistFiles: boolean;
  openFileAction: () => void;
  openUrlAction: (
    url: string,
    fileName?: string
  ) => Promise<MarkdownOpenFromUrlActionResult>;
  createNewAction: () => void;
};

export const MarkdownEmptyState = ({
  isDragActive,
  isBusy,
  canPersistFiles,
  openFileAction,
  openUrlAction,
  createNewAction,
}: MarkdownEmptyStateProps) => {
  const [isOpenUrlDialogOpen, setIsOpenUrlDialogOpen] = useState(false);

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
          <MarkdownOpenUrlDialog
            isBusy={isBusy}
            openUrlAction={openUrlAction}
            open={isOpenUrlDialogOpen}
            onOpenChange={setIsOpenUrlDialogOpen}
          />

          <ButtonGroup>
            <Button
              onClick={openFileAction}
              disabled={isBusy || !canPersistFiles}
            >
              <FolderOpenIcon data-icon="inline-start" />
              Open file
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  disabled={isBusy}
                  aria-label="Open options"
                >
                  <ChevronDownIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-44">
                <DropdownMenuItem
                  onSelect={() => {
                    if (!canPersistFiles) {
                      return;
                    }

                    openFileAction();
                  }}
                  disabled={!canPersistFiles}
                >
                  <FolderOpenIcon />
                  Open file
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setIsOpenUrlDialogOpen(true)}>
                  <LinkIcon />
                  Open URL
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>

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
