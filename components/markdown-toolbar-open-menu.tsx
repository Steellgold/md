"use client";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
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
import { buildRecentFileMeta } from "@/lib/markdown-helpers";
import { type RecentMarkdownFile } from "@/types/markdown";
import {
  ChevronDownIcon,
  FolderOpenIcon,
  HistoryIcon,
  LinkIcon,
  Trash2Icon,
} from "lucide-react";

type MarkdownToolbarOpenMenuProps = {
  isBusy: boolean;
  onClearHistoryAction: () => void;
  onOpenFileAction: () => void;
  onOpenRecentAction: (id: string) => void;
  onOpenUrlAction: () => void;
  recentFiles: RecentMarkdownFile[];
};

export const MarkdownToolbarOpenMenu = ({
  isBusy,
  onClearHistoryAction,
  onOpenFileAction,
  onOpenRecentAction,
  onOpenUrlAction,
  recentFiles,
}: MarkdownToolbarOpenMenuProps) => {
  const visibleRecentFiles = recentFiles.slice(0, 6);
  const overflowRecentFiles = recentFiles.slice(6);

  return (
    <ButtonGroup>
      <Button variant="outline" onClick={onOpenFileAction} disabled={isBusy}>
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
          <DropdownMenuItem onSelect={onOpenFileAction}>
            <FolderOpenIcon />
            Open file
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={onOpenUrlAction}>
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
                    onSelect={() => onOpenRecentAction(file.id)}
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
                      onSelect={() => onOpenRecentAction(file.id)}
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
                onSelect={onClearHistoryAction}
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
  );
};
