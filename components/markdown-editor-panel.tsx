import {
  BoldIcon,
  Code2Icon,
  FileCode2Icon,
  Heading1Icon,
  ItalicIcon,
  ListIcon,
  PencilIcon,
  Redo2Icon,
  Undo2Icon,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { buildActiveDocumentMeta } from "@/lib/markdown-helpers";
import { type RecentMarkdownFile } from "@/types/markdown";

type MarkdownEditorPanelProps = {
  activeFile: RecentMarkdownFile;
  content: string;
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onScroll: () => void;
  undoAction: () => void;
  redoAction: () => void;
  boldAction: () => void;
  italicAction: () => void;
  headingAction: () => void;
  inlineCodeAction: () => void;
  codeBlockAction: () => void;
  bulletListAction: () => void;
};

const quickActions = [
  {
    label: "Undo",
    icon: Undo2Icon,
    actionKey: "undoAction",
  },
  {
    label: "Redo",
    icon: Redo2Icon,
    actionKey: "redoAction",
  },
  {
    label: "Heading",
    icon: Heading1Icon,
    actionKey: "headingAction",
  },
  {
    label: "Bold",
    icon: BoldIcon,
    actionKey: "boldAction",
  },
  {
    label: "Italic",
    icon: ItalicIcon,
    actionKey: "italicAction",
  },
  {
    label: "Inline code",
    icon: Code2Icon,
    actionKey: "inlineCodeAction",
  },
  {
    label: "Code block",
    icon: FileCode2Icon,
    actionKey: "codeBlockAction",
  },
  {
    label: "List",
    icon: ListIcon,
    actionKey: "bulletListAction",
  },
] as const;

export const MarkdownEditorPanel = ({
  activeFile,
  content,
  editorRef,
  onChange,
  onScroll,
  undoAction,
  redoAction,
  boldAction,
  italicAction,
  headingAction,
  inlineCodeAction,
  codeBlockAction,
  bulletListAction,
}: MarkdownEditorPanelProps) => {
  const actionMap = {
    undoAction,
    redoAction,
    boldAction,
    italicAction,
    headingAction,
    inlineCodeAction,
    codeBlockAction,
    bulletListAction,
  };

  return (
    <Card className="flex h-full min-h-0 flex-col gap-0 rounded-none border-0 bg-transparent py-0 ring-0">
      <CardHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary/5 p-2">
            <PencilIcon className="size-4" />
          </div>

          <CardTitle>Editor</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="relative flex-1 min-h-0 p-0">
        <InputGroup className="!h-full flex-1 min-h-0 flex-col items-stretch overflow-hidden rounded-none border-0 bg-transparent">
          <InputGroupAddon
            align="block-start"
            className="cursor-default border-b px-6 py-3"
          >
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {activeFile.name}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {buildActiveDocumentMeta(content, activeFile)}
                </div>
              </div>

              <ButtonGroup className="max-w-full flex-wrap">
                {quickActions.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Button
                      key={item.label}
                      variant="ghost"
                      size="icon-sm"
                      onClick={actionMap[item.actionKey]}
                      title={item.label}
                      aria-label={item.label}
                    >
                      <Icon />
                    </Button>
                  );
                })}
              </ButtonGroup>
            </div>
          </InputGroupAddon>

          <InputGroupTextarea
            ref={editorRef}
            value={content}
            onChange={onChange}
            onScroll={onScroll}
            placeholder="Write or paste your markdown here..."
            className="h-full min-h-0 flex-1 basis-0 px-6 py-5 font-mono text-sm"
          />
        </InputGroup>
      </CardContent>
    </Card>
  );
};
