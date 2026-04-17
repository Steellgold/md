"use client";

import * as React from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  FilePlusIcon,
  HistoryIcon,
  Trash2Icon,
  XIcon
} from "lucide-react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent, ItemGroup,
  ItemHeader, ItemTitle
} from "@/components/ui/item";
import { useMarkdownUiStore } from "@/lib/markdown-ui-store";
import { type RecentMarkdownFile } from "@/types/markdown";

type MarkdownRecentFilesProps = {
  recentFiles: RecentMarkdownFile[];
  openRecentAction: (id: string) => void;
  removeRecentAction: (id: string) => void;
  clearRecentAction: () => void;
};

const compactNumberFormatter = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

export const MarkdownRecentFiles = ({
  recentFiles,
  openRecentAction,
  removeRecentAction,
  clearRecentAction,
}: MarkdownRecentFilesProps) => {
  const hasRecentFiles = recentFiles.length > 0;
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const listViewportRef = React.useRef<HTMLDivElement | null>(null);
  const [maxListHeight, setMaxListHeight] = React.useState<number | null>(null);
  const recentFilesExpanded = useMarkdownUiStore(
    (state) => state.recentFilesExpanded
  );
  const setRecentFilesExpanded = useMarkdownUiStore(
    (state) => state.setRecentFilesExpanded
  );

  React.useEffect(() => {
    const listViewportElement = listViewportRef.current;

    if (!hasRecentFiles || !recentFilesExpanded || !listViewportElement) {
      setMaxListHeight(null);
      return;
    }

    const updateMaxHeight = () => {
      const listGridElement =
        listViewportElement.querySelector<HTMLElement>("[data-recent-files-grid]");

      if (!listGridElement) {
        setMaxListHeight(null);
        return;
      }

      const itemElements = Array.from(
        listGridElement.querySelectorAll<HTMLElement>('[data-slot="item"]')
      );

      if (itemElements.length === 0) {
        setMaxListHeight(null);
        return;
      }

      const rowOffsets = itemElements.reduce<number[]>((rows, itemElement) => {
        const existingRowIndex = rows.findIndex(
          (offset) => Math.abs(offset - itemElement.offsetTop) <= 1
        );

        if (existingRowIndex === -1) {
          rows.push(itemElement.offsetTop);
        }

        return rows;
      }, []);

      if (rowOffsets.length <= 3) {
        setMaxListHeight(null);
        return;
      }

      const thirdRowOffset = rowOffsets[2];
      const thirdRowBottom = itemElements
        .filter((itemElement) => Math.abs(itemElement.offsetTop - thirdRowOffset) <= 1)
        .reduce(
          (bottom, itemElement) =>
            Math.max(bottom, itemElement.offsetTop + itemElement.offsetHeight),
          0
        );

      setMaxListHeight(thirdRowBottom);
    };

    updateMaxHeight();

    const observer = new ResizeObserver(() => {
      updateMaxHeight();
    });

    observer.observe(listViewportElement);

    const listGridElement =
      listViewportElement.querySelector<HTMLElement>("[data-recent-files-grid]");

    if (listGridElement) {
      observer.observe(listGridElement);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasRecentFiles, recentFiles, recentFilesExpanded]);

  return (
    <Card className="w-full gap-0 text-left" size="sm">
      {hasRecentFiles ? (
        <Collapsible
          open={recentFilesExpanded}
          onOpenChange={setRecentFilesExpanded}
        >
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-3">
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto flex-1 justify-start px-0 py-0 hover:bg-transparent"
                >
                  <div className="flex min-w-0 items-center gap-2 text-left">
                    <div className="rounded-md bg-primary/5 p-2">
                      <HistoryIcon className="size-4" />
                    </div>

                    <div className="min-w-0">
                      <CardTitle>Recent files</CardTitle>
                      <CardDescription>
                        Up to 9 items stay visible here. Beyond that, the list
                        scrolls.
                      </CardDescription>
                    </div>
                  </div>

                  {recentFilesExpanded ? (
                    <ChevronUpIcon className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDownIcon className="size-4 text-muted-foreground" />
                  )}
                </Button>
              </CollapsibleTrigger>

              <ConfirmDialog
                open={isConfirmOpen}
                onOpenChange={setIsConfirmOpen}
                title="Clear recent history?"
                content="This removes every recent file entry from the list."
                confirmButton="Clear history"
                onConfirm={clearRecentAction}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                >
                  <Trash2Icon data-icon="inline-start" />
                  Clear history
                </Button>
              </ConfirmDialog>
            </div>
          </CardHeader>

          <CollapsibleContent className="overflow-hidden data-open:animate-accordion-down data-closed:animate-accordion-up">
            <CardContent className="px-3 pt-3">
              <div
                ref={listViewportRef}
                className="overflow-y-auto pr-1"
                style={
                  maxListHeight
                    ? {
                        maxHeight: `${maxListHeight}px`,
                      }
                    : undefined
                }
              >
                <ItemGroup
                  data-recent-files-grid
                  className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3"
                >
                  {recentFiles.map((file) => (
                    <Item
                      key={file.id}
                      variant="muted"
                      className="items-start border border-transparent bg-muted/40 hover:border-border hover:bg-muted"
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-start gap-2 overflow-hidden text-left"
                        onClick={() => openRecentAction(file.id)}
                      >
                        <ItemContent className="min-w-0 overflow-hidden">
                          <ItemHeader className="min-w-0">
                            <ItemTitle className="block w-full min-w-0 truncate">
                              {file.name}
                            </ItemTitle>
                          </ItemHeader>

                          {file.stats ? (
                            <div className="mt-1 flex flex-wrap gap-1 overflow-hidden">
                              <Badge variant="outline">
                                {compactNumberFormatter.format(
                                  file.stats.characterCount
                                )}{" "}
                                chars
                              </Badge>

                              <Badge variant="outline">
                                {compactNumberFormatter.format(file.stats.wordCount)} words
                              </Badge>

                              <Badge variant="outline">
                                {compactNumberFormatter.format(file.stats.lineCount)} lines
                              </Badge>
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
                        >
                          <XIcon />
                        </Button>
                      </ItemActions>
                    </Item>
                  ))}
                </ItemGroup>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {!hasRecentFiles ? (
        <CardContent className="px-3 pt-3">
          <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
            <div className="rounded-md bg-primary/5 p-2">
              <FilePlusIcon className="size-4" />
            </div>
            <p className="text-sm font-medium">No recent files yet</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Files you open locally will appear here so you can reopen them
              faster next time.
            </p>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
};
