"use client";

import * as React from "react";
import {
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

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { MarkdownOpenUrlDialog } from "@/components/markdown-open-url-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  buildActiveDocumentMeta,
  buildRecentFileMeta,
} from "@/lib/markdown-helpers";
import {
  type MarkdownOpenFromUrlActionResult,
  type RecentMarkdownFile,
} from "@/types/markdown";

type MarkdownToolbarProps = {
  activeFile: RecentMarkdownFile | null;
  content: string;
  recentFiles: RecentMarkdownFile[];
  isBusy: boolean;
  openFileAction: () => void;
  openUrlAction: (
    url: string,
    fileName?: string
  ) => Promise<MarkdownOpenFromUrlActionResult>;
  goHomeAction: () => void;
  saveFileAction: () => void;
  refreshFileAction: () => void;
  clearDocumentAction: () => void;
  openRecentAction: (id: string) => void;
  removeRecentAction: (id: string) => void;
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
  recentFiles,
  isBusy,
  openFileAction,
  openUrlAction,
  goHomeAction,
  saveFileAction,
  refreshFileAction,
  clearDocumentAction,
  openRecentAction,
  removeRecentAction,
  clearRecentAction,
  viewMode,
  setViewModeAction,
  syncScrollEnabled,
  toggleSyncScrollAction,
}: MarkdownToolbarProps) => {
  const secondaryLabel = buildActiveDocumentMeta(content, activeFile);
  const canSaveFile = activeFile?.source !== "url";
  const refreshLabel = activeFile?.source === "url" ? "Reload URL" : "Reopen file";
  const [isClearHistoryConfirmOpen, setIsClearHistoryConfirmOpen] =
    React.useState(false);

  return (
    <div className="border-b bg-background/80 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={goHomeAction}
            title="Close document"
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={recentFiles.length === 0}>
                <HistoryIcon data-icon="inline-start" />
                Recent
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Reopen a file</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {recentFiles.length > 0 ? (
                <DropdownMenuGroup>
                  {recentFiles.map((file) => {
                    const itemLabel = buildRecentFileMeta(file);

                    return (
                      <DropdownMenuItem
                        key={file.id}
                        className="justify-between gap-3"
                        onSelect={() => openRecentAction(file.id)}
                      >
                        <div className="flex min-w-0 items-start gap-2">
                          <FolderOpenIcon />
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate">{file.name}</span>
                            <span className="truncate text-xs text-muted-foreground">
                              {itemLabel}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void removeRecentAction(file.id);
                          }}
                          aria-label={`Remove ${file.name} from recent files`}
                        >
                          <Trash2Icon className="size-4" />
                        </button>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              ) : (
                <DropdownMenuItem disabled>No recent files</DropdownMenuItem>
              )}
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

          <ConfirmDialog
            open={isClearHistoryConfirmOpen}
            onOpenChange={setIsClearHistoryConfirmOpen}
            title="Clear recent history?"
            content="This removes every recent file entry from the history menu."
            confirmButton="Clear history"
            onConfirm={clearRecentAction}
          />

          <Button variant="outline" onClick={openFileAction} disabled={isBusy}>
            <FolderOpenIcon data-icon="inline-start" />
            Open
          </Button>

          <MarkdownOpenUrlDialog isBusy={isBusy} openUrlAction={openUrlAction}>
            <Button variant="outline" disabled={isBusy}>
              <LinkIcon data-icon="inline-start" />
              Open URL
            </Button>
          </MarkdownOpenUrlDialog>

          <Button onClick={saveFileAction} disabled={!activeFile || !canSaveFile || isBusy}>
            <SaveIcon data-icon="inline-start" />
            Save
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
                Close document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
