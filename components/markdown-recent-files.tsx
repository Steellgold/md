"use client";

import { Clock3Icon, FilePlusIcon, HistoryIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { buildFileLabel } from "@/lib/markdown-helpers";
import { type RecentMarkdownFile } from "@/lib/markdown-types";

type MarkdownRecentFilesProps = {
  recentFiles: RecentMarkdownFile[];
  openRecentAction: (id: string) => void;
  createNewAction: () => void;
};

export const MarkdownRecentFiles = ({
  recentFiles,
  openRecentAction,
  createNewAction,
}: MarkdownRecentFilesProps) => {
  return (
    <Card className="w-full text-left" size="sm">
      <CardHeader className="border-b">
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
      </CardHeader>
      <CardContent className="px-3">
        <ItemGroup className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {recentFiles.slice(0, 5).map((file) => (
            <Item
              key={file.id}
              asChild
              variant="muted"
              className="cursor-pointer border border-transparent bg-muted/40 hover:border-border hover:bg-muted"
            >
              <button type="button" onClick={() => openRecentAction(file.id)}>
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
                    {buildFileLabel(file, "Locally authorized file")}
                  </ItemDescription>
                </ItemContent>
              </button>
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
