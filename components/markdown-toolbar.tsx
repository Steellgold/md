"use client";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  buildActiveDocumentMeta,
  buildRecentFileMeta,
} from "@/lib/markdown-helpers";
import { type RecentMarkdownFile } from "@/types/markdown";
import {
  ChevronDownIcon,
  CommandIcon,
  EllipsisIcon,
  FolderOpenIcon,
  HistoryIcon,
  HouseIcon,
  LinkIcon,
  MonitorUpIcon,
  PanelLeftIcon,
  PanelRightIcon,
  RefreshCcwIcon,
  SaveIcon,
  Trash2Icon,
  TypeIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";

type MarkdownToolbarProps = {
  activeFile: RecentMarkdownFile | null;
  content: string;
  openDocumentsCount: number;
  recentFiles: RecentMarkdownFile[];
  isBusy: boolean;
  openFileAction: () => void;
  showCommandPaletteAction: () => void;
  showOpenUrlDialogAction: () => void;
  goHomeAction: () => void;
  saveFileAction: () => void;
  refreshFileAction: () => void;
  clearDocumentAction: () => void;
  openRecentAction: (id: string) => void;
  clearRecentAction: () => void;
  viewMode: "split" | "editor" | "preview";
  setViewModeAction: (value: "split" | "editor" | "preview") => void;
  syncScrollEnabled: boolean;
  toggleSyncScrollAction: () => void;
};

const viewOptions = [
  {
    value: "split" as const,
    label: "Split",
    icon: PanelLeftIcon,
  },
  {
    value: "editor" as const,
    label: "Editor",
    icon: TypeIcon,
  },
  {
    value: "preview" as const,
    label: "Preview",
    icon: PanelRightIcon,
  },
];

export const MarkdownToolbar = ({
  activeFile,
  content,
  openDocumentsCount,
  recentFiles,
  isBusy,
  openFileAction,
  showCommandPaletteAction,
  showOpenUrlDialogAction,
  goHomeAction,
  saveFileAction,
  refreshFileAction,
  clearDocumentAction,
  openRecentAction,
  clearRecentAction,
  viewMode,
  setViewModeAction,
  syncScrollEnabled,
  toggleSyncScrollAction,
}: MarkdownToolbarProps) => {
  const secondaryLabel = buildActiveDocumentMeta(content, activeFile);
  const canSaveFile = activeFile?.source !== "url";
  const refreshLabel =
    activeFile?.source === "url" ? "Reload URL" : "Reopen file";
  const closeLabel = openDocumentsCount > 1 ? "Close tab" : "Close document";
  const [isClearHistoryConfirmOpen, setIsClearHistoryConfirmOpen] =
    useState(false);
  const visibleRecentFiles = recentFiles.slice(0, 6);
  const overflowRecentFiles = recentFiles.slice(6);

  return (
    <div className="border-b bg-background/80 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={goHomeAction}
            title="Back to home"
          >
            <HouseIcon />
          </Button>

          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {activeFile?.name ?? "Untitled document"}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {secondaryLabel}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ButtonGroup className="flex-wrap">
            {viewOptions.map((option) => {
              const Icon = option.icon;

              return (
                <Button
                  key={option.value}
                  variant={viewMode === option.value ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setViewModeAction(option.value)}
                >
                  <Icon data-icon="inline-start" />
                  {option.label}
                </Button>
              );
            })}
          </ButtonGroup>

          <ConfirmDialog
            open={isClearHistoryConfirmOpen}
            onOpenChange={setIsClearHistoryConfirmOpen}
            title="Clear recent history?"
            content="This removes every recent file entry from the history menu."
            confirmButton="Clear history"
            onConfirm={clearRecentAction}
          />

          <ButtonGroup>
            <Button
              variant="outline"
              onClick={openFileAction}
              disabled={isBusy}
            >
              <FolderOpenIcon data-icon="inline-start" />
              Open file
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={isBusy}
                  aria-label="Open options"
                >
                  <ChevronDownIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuItem onSelect={openFileAction}>
                  <FolderOpenIcon />
                  Open file
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={showOpenUrlDialogAction}>
                  <LinkIcon />
                  Open URL
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Recent</DropdownMenuLabel>
                {visibleRecentFiles.length > 0 ? (
                  <DropdownMenuGroup>
                    {visibleRecentFiles.map((file) => {
                      const itemLabel = buildRecentFileMeta(file);

                      return (
                        <DropdownMenuItem
                          key={file.id}
                          className="justify-between gap-3"
                          onSelect={() => openRecentAction(file.id)}
                        >
                          <div className="flex min-w-0 items-start gap-2">
                            <HistoryIcon />
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate">{file.name}</span>
                              <span className="truncate text-xs text-muted-foreground">
                                {itemLabel}
                              </span>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuGroup>
                ) : (
                  <DropdownMenuItem disabled>No recent files</DropdownMenuItem>
                )}
                {overflowRecentFiles.length > 0 ? (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <HistoryIcon />
                      See more
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-72">
                      {overflowRecentFiles.map((file) => {
                        const itemLabel = buildRecentFileMeta(file);

                        return (
                          <DropdownMenuItem
                            key={file.id}
                            className="justify-between gap-3"
                            onSelect={() => openRecentAction(file.id)}
                          >
                            <div className="flex min-w-0 items-start gap-2">
                              <HistoryIcon />
                              <div className="flex min-w-0 flex-col">
                                <span className="truncate">{file.name}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                  {itemLabel}
                                </span>
                              </div>
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ) : null}
                {recentFiles.length > 0 ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => setIsClearHistoryConfirmOpen(true)}
                      variant="destructive"
                    >
                      <Trash2Icon />
                      Clear history
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>

          <Button
            onClick={saveFileAction}
            disabled={!activeFile || !canSaveFile || isBusy}
          >
            <SaveIcon data-icon="inline-start" />
            Save
          </Button>

          <Button variant="outline" onClick={showCommandPaletteAction}>
            <CommandIcon data-icon="inline-start" />
            Quick switcher
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" title="More actions">
                <EllipsisIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Document actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={refreshFileAction}
                disabled={!activeFile || isBusy}
              >
                <RefreshCcwIcon />
                {refreshLabel}
              </DropdownMenuItem>
              <DropdownMenuCheckboxItem
                checked={syncScrollEnabled}
                onCheckedChange={toggleSyncScrollAction}
              >
                <MonitorUpIcon />
                Sync scrolling
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={clearDocumentAction}
                disabled={!activeFile}
                variant="destructive"
              >
                <XIcon />
                {closeLabel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
