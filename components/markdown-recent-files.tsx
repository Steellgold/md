"use client";

import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent, ItemGroup,
  ItemHeader, ItemTitle
} from "@/components/ui/item";
import {
  useMarkdownUiStore,
} from "@/lib/markdown-ui-store";
import { cn } from "@/lib/utils";
import { type RecentMarkdownFile } from "@/types/markdown";
import {
  ChevronDownIcon,
  HistoryIcon, XIcon
} from "lucide-react";

type MarkdownRecentFilesProps = {
  recentFiles: RecentMarkdownFile[];
  isBusy: boolean;
  openingRecentFileId: string | null;
  openRecentAction: (id: string) => void;
  removeRecentAction: (id: string) => void;
  clearRecentAction: () => void;
};

const compactNumberFormatter = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

const collapsedRecentFilesCount = 3;
const expandedRecentFilesCount = 9;

export const MarkdownRecentFiles = ({
  recentFiles,
  isBusy,
  openingRecentFileId,
  openRecentAction,
  removeRecentAction,
}: MarkdownRecentFilesProps) => {
  const hasRecentFiles = recentFiles.length > 0;

  const recentFilesExpanded = useMarkdownUiStore(
    (state) => state.recentFilesExpanded
  );

  const setRecentFilesExpanded = useMarkdownUiStore(
    (state) => state.setRecentFilesExpanded
  );

  const setRecentFilesVisibleCount = useMarkdownUiStore(
    (state) => state.setRecentFilesVisibleCount
  );

  if (!hasRecentFiles) {
    return <></>;
  }

  const canToggleRecentFiles = recentFiles.length > collapsedRecentFilesCount;
  const effectiveVisibleCount = recentFilesExpanded
    ? expandedRecentFilesCount
    : collapsedRecentFilesCount;
  const visibleRecentFiles = recentFiles.slice(
    0,
    canToggleRecentFiles ? effectiveVisibleCount : recentFiles.length
  );
  const shownRecentFilesCount = visibleRecentFiles.length;
  const handleRecentFilesToggle = () => {
    const nextExpanded = !recentFilesExpanded;

    setRecentFilesExpanded(nextExpanded);
    setRecentFilesVisibleCount(
      nextExpanded ? expandedRecentFilesCount : collapsedRecentFilesCount
    );
  };

  return (
    <div className="group/recent relative w-full pb-4">
      <Card
        className="w-full gap-0 text-left transition-all"
        size="sm"
      >
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-left">
              <div className="rounded-md bg-primary/5 p-2">
                <HistoryIcon className="size-4" />
              </div>

              <div className="min-w-0">
                <CardTitle>Recent files</CardTitle>
                <CardDescription>
                  {canToggleRecentFiles
                    ? `Showing ${shownRecentFilesCount} recent files.`
                    : `Showing ${recentFiles.length} recent files.`}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-3 py-1.5">
          <div className="pr-1">
            <ItemGroup
              data-recent-files-grid
              className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3"
            >
              {visibleRecentFiles.map((file) => (
                <Item
                  key={file.id}
                  variant="muted"
                  className={cn(
                    "items-start border border-transparent bg-muted/40 hover:border-border hover:bg-muted",
                    openingRecentFileId === file.id &&
                      "border-primary/30 bg-primary/5"
                  )}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-start gap-2 overflow-hidden text-left disabled:cursor-wait disabled:opacity-80"
                    onClick={() => openRecentAction(file.id)}
                    disabled={isBusy}
                  >
                    {openingRecentFileId === file.id ? (
                      <div className="pt-0.5 text-primary">
                        <Spinner />
                      </div>
                    ) : null}

                    <ItemContent className="min-w-0 overflow-hidden">
                      <ItemHeader className="min-w-0">
                        <ItemTitle className="block w-full min-w-0 truncate">
                          {file.name}
                        </ItemTitle>
                      </ItemHeader>

                      {file.stats ? (
                        <div className="mt-1 flex flex-wrap gap-1 overflow-hidden">
                          {file.source === "workspace" ? (
                            <>
                              <Badge variant="outline">Folder</Badge>
                              <Badge variant="outline">
                                {compactNumberFormatter.format(
                                  file.stats.fileCount ?? 0
                                )}{" "}
                                files
                              </Badge>
                            </>
                          ) : (
                            <>
                              <Badge variant="outline">
                                {compactNumberFormatter.format(
                                  file.stats.characterCount
                                )}{" "}
                                chars
                              </Badge>

                              <Badge variant="outline">
                                {compactNumberFormatter.format(
                                  file.stats.wordCount
                                )}{" "}
                                words
                              </Badge>

                              <Badge variant="outline">
                                {compactNumberFormatter.format(
                                  file.stats.lineCount
                                )}{" "}
                                lines
                              </Badge>
                            </>
                          )}
                        </div>
                      ) : null}
                    </ItemContent>
                  </button>

                  <ItemActions className="shrink-0 self-start">
                    <Button
                      variant="outline"
                      size="icon-xs"
                      aria-label={`Remove ${file.name} from recent files`}
                      title={`Remove ${file.name}`}
                      onClick={() => removeRecentAction(file.id)}
                      disabled={isBusy}
                    >
                      <XIcon />
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          </div>
        </CardContent>
      </Card>

      {canToggleRecentFiles ? (
        <>
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-1 h-px w-[90%] -translate-x-1/2 scale-x-0 bg-linear-to-r from-transparent via-primary to-transparent transition-all duration-200 group-hover/recent:scale-x-100 group-hover/recent:opacity-100 group-focus-within/recent:scale-x-100 group-focus-within/recent:opacity-100" />

          <Button
            variant="default"
            size="xs"
            className="absolute bottom-1 left-1/2 z-10 -translate-x-1/2 rounded-full shadow-sm opacity-0 pointer-events-none transition-opacity duration-200 group-hover/recent:opacity-100 group-hover/recent:pointer-events-auto group-focus-within/recent:opacity-100 group-focus-within/recent:pointer-events-auto"
            onClick={handleRecentFilesToggle}
          >
            {recentFilesExpanded ? "Show less" : "Show more"}
            <ChevronDownIcon
              className={cn(
                "size-4 transition-transform duration-200",
                recentFilesExpanded && "rotate-180"
              )}
            />
          </Button>
        </>
      ) : null}
    </div>
  );
};
