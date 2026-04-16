"use client";

import {
  Clock3Icon,
  FilePlusIcon,
  HistoryIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

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
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { buildRecentFileMeta } from "@/lib/markdown-helpers";
import { type RecentMarkdownFile } from "@/types/markdown";

type MarkdownRecentFilesProps = {
  recentFiles: RecentMarkdownFile[];
  openRecentAction: (id: string) => void;
  removeRecentAction: (id: string) => void;
  clearRecentAction: () => void;
  createNewAction: () => void;
};

export const MarkdownRecentFiles = ({
  recentFiles,
  openRecentAction,
  removeRecentAction,
  clearRecentAction,
  createNewAction,
}: MarkdownRecentFilesProps) => {
  return (
    <Card className="w-full text-left" size="sm">
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

          {recentFiles.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearRecentAction}
            >
              <Trash2Icon data-icon="inline-start" />
              Clear history
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="px-3">
        <ItemGroup className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {recentFiles.slice(0, 5).map((file) => (
            <Item
              key={file.id}
              variant="muted"
              className="border border-transparent bg-muted/40 hover:border-border hover:bg-muted"
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                onClick={() => openRecentAction(file.id)}
              >
                <ItemMedia variant="icon">
                  <Clock3Icon />
                </ItemMedia>
                <ItemContent>
                  <ItemHeader>
                    <ItemTitle className="min-w-0 truncate">
                      {file.name}
                    </ItemTitle>
                  </ItemHeader>
                  <ItemDescription className="truncate">
                    {buildRecentFileMeta(file)}
                  </ItemDescription>
                </ItemContent>
              </button>

              <ItemActions>
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

          <Item
            asChild
            variant="muted"
            className="cursor-pointer border border-transparent bg-muted/40 hover:border-border hover:bg-muted"
          >
            <button type="button" onClick={createNewAction}>
              <ItemMedia variant="icon">
                <FilePlusIcon />
              </ItemMedia>

              <ItemContent>
                <ItemHeader>
                  <ItemTitle>Create new</ItemTitle>
                </ItemHeader>
                <ItemDescription>
                  Create a new Markdown document
                </ItemDescription>
              </ItemContent>
            </button>
          </Item>
        </ItemGroup>
      </CardContent>
    </Card>
  );
};
