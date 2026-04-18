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
import { continueListOnEnterAction } from "@/lib/markdown-editor";
import { buildActiveDocumentMeta } from "@/lib/markdown-helpers";
import {
  type MarkdownDocumentStats,
  type RecentMarkdownFile,
} from "@/types/markdown";
import {
  BoldIcon,
  Code2Icon,
  FileCode2Icon,
  Heading1Icon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  ListTodoIcon,
  PencilIcon,
  Redo2Icon,
  Undo2Icon,
} from "lucide-react";
import {
  ChangeEvent,
  KeyboardEvent,
  RefObject,
  SyntheticEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";

type MarkdownEditorPanelProps = {
  activeFile: RecentMarkdownFile;
  content: string;
  stats: MarkdownDocumentStats;
  editorRef: RefObject<HTMLTextAreaElement | null>;
  onTopbarHeightChange?: (height: number) => void;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur: () => void;
  onSelectionChange: (editor: HTMLTextAreaElement) => void;
  onScroll: () => void;
  undoAction: () => void;
  redoAction: () => void;
  boldAction: () => void;
  italicAction: () => void;
  headingAction: (level: 1 | 2 | 3 | 4 | 5 | 6) => void;
  inlineCodeAction: () => void;
  codeBlockAction: () => void;
  bulletListAction: () => void;
  orderedListAction: () => void;
  taskListAction: () => void;
};

const quickActions = [
  { label: "Undo", icon: Undo2Icon, actionKey: "undoAction" },
  { label: "Redo", icon: Redo2Icon, actionKey: "redoAction" },
  { label: "Bold", icon: BoldIcon, actionKey: "boldAction" },
  { label: "Italic", icon: ItalicIcon, actionKey: "italicAction" },
  { label: "Inline code", icon: Code2Icon, actionKey: "inlineCodeAction" },
  { label: "Code block", icon: FileCode2Icon, actionKey: "codeBlockAction" },
] as const;

const listActions = [
  { label: "Bullet list", icon: ListIcon, actionKey: "bulletListAction" },
  { label: "Numbered list", icon: ListOrderedIcon, actionKey: "orderedListAction" },
  { label: "Checklist", icon: ListTodoIcon, actionKey: "taskListAction" },
] as const;

const headingLevels = [1, 2, 3, 4, 5, 6] as const;

export const MarkdownEditorPanel = ({
  activeFile,
  content,
  stats,
  editorRef,
  onTopbarHeightChange,
  onChange,
  onBlur,
  onSelectionChange,
  onScroll,
  undoAction,
  redoAction,
  boldAction,
  italicAction,
  headingAction,
  inlineCodeAction,
  codeBlockAction,
  bulletListAction,
  orderedListAction,
  taskListAction,
}: MarkdownEditorPanelProps) => {
  const topbarRef = useRef<HTMLDivElement | null>(null);
  const actionMap = {
    undoAction,
    redoAction,
    boldAction,
    italicAction,
    inlineCodeAction,
    codeBlockAction,
    bulletListAction,
    orderedListAction,
    taskListAction,
  };

  useEffect(() => {
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

  useEffect(() => {
    const editorElement = editorRef.current;

    if (!editorElement || editorElement.value === content) {
      return;
    }

    editorElement.value = content;
  }, [content, editorRef]);

  const handleEditorChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(event);
      onSelectionChange(event.currentTarget);
    },
    [onChange, onSelectionChange]
  );

  const handleEditorSelectionChange = useCallback(
    (event: SyntheticEvent<HTMLTextAreaElement>) => {
      onSelectionChange(event.currentTarget);
    },
    [onSelectionChange]
  );

  const handleEditorKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        event.key !== "Enter" ||
        event.shiftKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }

      if (!continueListOnEnterAction(event.currentTarget)) {
        return;
      }

      event.preventDefault();
      onSelectionChange(event.currentTarget);
    },
    [onSelectionChange]
  );

  return (
    <Card className="flex h-full min-h-0 flex-col gap-0 rounded-none border-0 bg-transparent py-0 ring-0">
      <CardHeader className="border-b px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-2">
            <PencilIcon className="size-4" />
          </div>

          <CardTitle>Editor</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="relative flex-1 min-h-0 p-0">
        <InputGroup className="h-full! flex-1 min-h-0 flex-col items-stretch overflow-hidden rounded-none border-0 bg-transparent has-[[data-slot=input-group-control]:focus-visible]:border-input has-[[data-slot=input-group-control]:focus-visible]:ring-0">
          <InputGroupAddon
            ref={topbarRef}
            align="block-start"
            className="cursor-default border-b px-6 py-3"
          >
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {activeFile.name}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {buildActiveDocumentMeta(stats, activeFile)}
                </div>
              </div>

              <ButtonGroup className="max-w-full flex-wrap">
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

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="List type"
                      aria-label="List type"
                    >
                      <ListIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44">
                    {listActions.map((item) => {
                      const Icon = item.icon;

                      return (
                        <DropdownMenuItem
                          key={item.label}
                          onSelect={actionMap[item.actionKey]}
                        >
                          <Icon />
                          {item.label}
                        </DropdownMenuItem>
                      );
                    })}
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
            onChange={handleEditorChange}
            onBlur={onBlur}
            onScroll={onScroll}
            onFocus={handleEditorSelectionChange}
            onMouseUp={handleEditorSelectionChange}
            onKeyDown={handleEditorKeyDown}
            onSelect={handleEditorSelectionChange}
            placeholder="Write or paste your markdown here..."
            className="h-full min-h-0 flex-1 basis-0 px-6 py-5 font-mono text-sm"
          />
        </InputGroup>
      </CardContent>
    </Card>
  );
};
