"use client";

import { MarkdownEmptyState } from "@/components/markdown-empty-state";
import { MarkdownRecentFiles } from "@/components/markdown-recent-files";
import { useCtrlKey } from "@/hooks/use-ctrl-key";
import { type RecentMarkdownFile } from "@/types/markdown";
import { ArrowUpRightIcon } from "lucide-react";

type MarkdownAppEmptyHomeProps = {
  canPersistFiles: boolean;
  createNewAction: () => void;
  isBusy: boolean;
  isDragActive: boolean;
  openFileAction: () => void;
  openFolderAction: () => void;
  openRecentAction: (id: string) => void;
  openingRecentFileId: string | null;
  recentFiles: RecentMarkdownFile[];
  removeRecentAction: (id: string) => Promise<void>;
  clearRecentAction: () => Promise<void>;
  showCommandPaletteAction: () => void;
  showOpenUrlDialogAction: () => void;
};

export const MarkdownAppEmptyHome = ({
  canPersistFiles,
  createNewAction,
  isBusy,
  isDragActive,
  openFileAction,
  openFolderAction,
  openRecentAction,
  openingRecentFileId,
  recentFiles,
  removeRecentAction,
  clearRecentAction,
  showCommandPaletteAction,
  showOpenUrlDialogAction,
}: MarkdownAppEmptyHomeProps) => {
  const ctrlKey = useCtrlKey();

  return (
    <div className="flex flex-1 flex-col">
      <div className="pt-3 text-center text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Tip:</span> press{" "}
        <button
          type="button"
          onClick={showCommandPaletteAction}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {ctrlKey} + K
        </button>{" "}
        for quick actions.
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="flex w-full max-w-3xl flex-col gap-4">
          <MarkdownEmptyState
            isDragActive={isDragActive}
            isBusy={isBusy}
            canPersistFiles={canPersistFiles}
            openFileAction={openFileAction}
            openFolderAction={openFolderAction}
            showOpenUrlDialogAction={showOpenUrlDialogAction}
            createNewAction={createNewAction}
          />

          <MarkdownRecentFiles
            recentFiles={recentFiles}
            isBusy={isBusy}
            openingRecentFileId={openingRecentFileId}
            openRecentAction={openRecentAction}
            removeRecentAction={removeRecentAction}
            clearRecentAction={clearRecentAction}
          />
        </div>
      </div>

      <footer className="pb-3 text-center text-xs text-muted-foreground">
        <div className="flex flex-col items-center gap-1">
          <div>
            Made by{" "}
            <a
              href="https://github.com/steellgold"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-foreground transition-colors hover:text-primary hover:underline"
            >
              Gaëtan H
              <ArrowUpRightIcon className="size-3" />
            </a>
          </div>

          <div>
            Contribute on{" "}
            <a
              href="https://github.com/Steellgold/md"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-foreground transition-colors hover:text-primary hover:underline"
            >
              GitHub
              <ArrowUpRightIcon className="size-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
