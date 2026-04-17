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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { buildActiveDocumentMeta } from "@/lib/markdown-helpers";
import { type RecentMarkdownFile } from "@/types/markdown";

type TextLocation = {
  index: number;
  line: number;
  column: number;
};

type EditorInspectorState = {
  cursor: TextLocation;
  selectionStart: TextLocation;
  selectionEnd: TextLocation;
  selectionPreview: string | null;
};

type MousePosition = {
  x: number;
  y: number;
};

type MarkdownEditorPanelProps = {
  activeFile: RecentMarkdownFile;
  content: string;
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  onTopbarHeightChange?: (height: number) => void;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onScroll: () => void;
  undoAction: () => void;
  redoAction: () => void;
  boldAction: () => void;
  italicAction: () => void;
  headingAction: (level: 1 | 2 | 3 | 4 | 5 | 6) => void;
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

const headingLevels = [1, 2, 3, 4, 5, 6] as const;

const getTextLocation = (value: string, index: number): TextLocation => {
  const safeIndex = Math.max(0, Math.min(index, value.length));
  const textBeforeIndex = value.slice(0, safeIndex);
  const lines = textBeforeIndex.split("\n");

  return {
    index: safeIndex,
    line: lines.length,
    column: (lines.at(-1) ?? "").length + 1,
  };
};

const buildSelectionPreview = (value: string, maxLength = 72) => {
  const preview = value.replace(/\r?\n/gu, "\\n").replace(/\t/gu, "\\t");

  if (preview.length <= maxLength) {
    return preview;
  }

  return `${preview.slice(0, maxLength - 3).trimEnd()}...`;
};

const buildEditorInspectorState = (
  value: string,
  selectionStart: number,
  selectionEnd: number
): EditorInspectorState => {
  const safeSelectionStart = Math.max(0, Math.min(selectionStart, value.length));
  const safeSelectionEnd = Math.max(
    safeSelectionStart,
    Math.min(selectionEnd, value.length)
  );
  const selectedText = value.slice(safeSelectionStart, safeSelectionEnd);

  return {
    cursor: getTextLocation(value, safeSelectionEnd),
    selectionStart: getTextLocation(value, safeSelectionStart),
    selectionEnd: getTextLocation(value, safeSelectionEnd),
    selectionPreview: selectedText ? buildSelectionPreview(selectedText) : null,
  };
};

const getEditorInspectorState = (editor: HTMLTextAreaElement) =>
  buildEditorInspectorState(
    editor.value,
    editor.selectionStart,
    editor.selectionEnd
  );

const formatTextLocation = ({ line, column }: TextLocation) =>
  `L${line}:C${column}`;

export const MarkdownEditorPanel = ({
  activeFile,
  content,
  editorRef,
  onTopbarHeightChange,
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
  const topbarRef = React.useRef<HTMLDivElement | null>(null);
  const [mousePosition, setMousePosition] = React.useState<MousePosition | null>(
    null
  );
  const [editorInspectorState, setEditorInspectorState] =
    React.useState<EditorInspectorState>(() =>
      buildEditorInspectorState(content, 0, 0)
    );
  const actionMap = {
    undoAction,
    redoAction,
    boldAction,
    italicAction,
    inlineCodeAction,
    codeBlockAction,
    bulletListAction,
  };

  React.useEffect(() => {
    const topbarElement = topbarRef.current;

    if (!topbarElement || !onTopbarHeightChange) {
      return;
    }

    const updateHeight = () => {
      onTopbarHeightChange(topbarElement.getBoundingClientRect().height);
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(topbarElement);

    return () => {
      observer.disconnect();
    };
  }, [onTopbarHeightChange]);

  React.useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      setEditorInspectorState(buildEditorInspectorState(content, 0, 0));
      return;
    }

    setEditorInspectorState(getEditorInspectorState(editor));
  }, [content, editorRef]);

  const handleEditorChange = React.useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(event);
      setEditorInspectorState(getEditorInspectorState(event.currentTarget));
    },
    [onChange]
  );

  const handleEditorSelectionChange = React.useCallback(
    (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
      setEditorInspectorState(getEditorInspectorState(event.currentTarget));
    },
    []
  );

  const handleEditorMouseMove = React.useCallback(
    (event: React.MouseEvent<HTMLTextAreaElement>) => {
      const textarea = event.currentTarget;
      const rect = textarea.getBoundingClientRect();
      const nextMousePosition = {
        x: Math.max(
          0,
          Math.round(event.clientX - rect.left + textarea.scrollLeft)
        ),
        y: Math.max(
          0,
          Math.round(event.clientY - rect.top + textarea.scrollTop)
        ),
      };

      setMousePosition((currentValue) =>
        currentValue?.x === nextMousePosition.x &&
        currentValue?.y === nextMousePosition.y
          ? currentValue
          : nextMousePosition
      );

      if (event.buttons === 1) {
        setEditorInspectorState(getEditorInspectorState(textarea));
      }
    },
    []
  );

  const handleEditorMouseLeave = React.useCallback(() => {
    setMousePosition(null);
  }, []);

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
            ref={topbarRef}
            align="block-start"
            className="cursor-default border-b px-6 py-3"
          >
            <div className="flex w-full flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {activeFile.name}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {buildActiveDocumentMeta(content, activeFile)}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <div className="inline-flex items-center rounded-md border bg-background px-2 py-1 font-mono text-muted-foreground">
                    Mouse{" "}
                    {mousePosition
                      ? `x:${mousePosition.x} y:${mousePosition.y}`
                      : "x:- y:-"}
                  </div>

                  <div className="inline-flex items-center rounded-md border bg-background px-2 py-1 font-mono text-muted-foreground">
                    Cursor {formatTextLocation(editorInspectorState.cursor)}
                  </div>

                  <div className="inline-flex items-center rounded-md border bg-background px-2 py-1 font-mono text-muted-foreground">
                    Selection{" "}
                    {editorInspectorState.selectionPreview
                      ? `${formatTextLocation(editorInspectorState.selectionStart)} -> ${formatTextLocation(editorInspectorState.selectionEnd)}`
                      : "none"}
                  </div>

                  <div className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md border bg-background px-2 py-1">
                    <span className="shrink-0 text-muted-foreground">
                      Selected text
                    </span>
                    <span
                      className={
                        editorInspectorState.selectionPreview
                          ? "truncate text-foreground"
                          : "truncate text-muted-foreground"
                      }
                    >
                      {editorInspectorState.selectionPreview
                        ? `"${editorInspectorState.selectionPreview}"`
                        : "none"}
                    </span>
                  </div>
                </div>
              </div>

              <ButtonGroup className="max-w-full shrink-0 flex-wrap">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Heading level"
                      aria-label="Heading level"
                    >
                      <Heading1Icon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    {headingLevels.map((level) => (
                      <DropdownMenuItem
                        key={level}
                        onSelect={() => headingAction(level)}
                      >
                        <Heading1Icon />
                        Heading {level}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

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
            onChange={handleEditorChange}
            onScroll={onScroll}
            onFocus={handleEditorSelectionChange}
            onKeyUp={handleEditorSelectionChange}
            onMouseUp={handleEditorSelectionChange}
            onSelect={handleEditorSelectionChange}
            onMouseMove={handleEditorMouseMove}
            onMouseLeave={handleEditorMouseLeave}
            placeholder="Write or paste your markdown here..."
            className="h-full min-h-0 flex-1 basis-0 px-6 py-5 font-mono text-sm"
          />
        </InputGroup>
      </CardContent>
    </Card>
  );
};
