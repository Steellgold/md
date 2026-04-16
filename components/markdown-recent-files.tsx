"use client";

import {
  FilePlusIcon,
  HistoryIcon,
  Trash2Icon,
  XIcon
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const formatRecentFileSecondaryMeta = (file: RecentMarkdownFile) =>
  file.path ?? `Opened ${new Date(file.lastOpenedAt).toLocaleDateString()}`;

export const MarkdownRecentFiles = ({
  recentFiles,
  openRecentAction,
  removeRecentAction,
  clearRecentAction,
}: MarkdownRecentFilesProps) => {
  const hasRecentFiles = recentFiles.length > 0;

  return (
    <Card className="w-full text-left" size="sm">
      {hasRecentFiles ? (
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-primary/5 p-2">
                <HistoryIcon className="size-4" />
              </div>

              <div>
                <CardTitle>Recent files</CardTitle>
                <CardDescription>
                  Reopen one of your last Markdown documents.
                </CardDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearRecentAction}
            >
              <Trash2Icon data-icon="inline-start" />
              Clear history
            </Button>
          </div>
        </CardHeader>
      ) : null}

      <CardContent className="px-3">
        {hasRecentFiles ? (
          <ItemGroup className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {recentFiles.slice(0, 5).map((file) => (
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
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
};
