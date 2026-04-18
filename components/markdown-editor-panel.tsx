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
  getTextareaCaretCoordinates,
  getTextareaRangeCoordinates,
  type TextareaRangeCoordinates,
} from "@/lib/textarea-caret";
import {
  type CollaborationParticipant,
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
  useState,
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
  collaboratorSelections: CollaborationParticipant[];
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

type RemoteMarker = {
  id: string;
  name: string;
  color: string;
  top: number;
  left: number;
  height: number;
  selectionRects: TextareaRangeCoordinates[];
};

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
  collaboratorSelections,
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
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [remoteMarkers, setRemoteMarkers] = useState<RemoteMarker[]>([]);
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

  const recomputeRemoteMarkers = useCallback(() => {
    const editorElement = editorRef.current;
    const overlayElement = overlayRef.current;

    if (!editorElement || !overlayElement) {
      setRemoteMarkers([]);
      return;
    }

    const editorRect = editorElement.getBoundingClientRect();
    const overlayRect = overlayElement.getBoundingClientRect();
    const editorTop = editorRect.top - overlayRect.top;
    const editorLeft = editorRect.left - overlayRect.left;

    const nextMarkers = collaboratorSelections
      .filter(
        (participant) =>
          !participant.isLocal && participant.selection && participant.name
      )
      .map((participant) => {
        const selection = participant.selection!;
        const marker = getTextareaCaretCoordinates(editorElement, selection.end);

        return {
          id: participant.id,
          name: participant.name,
          color: participant.color,
          top: editorTop + marker.top,
          left: editorLeft + marker.left,
          height: marker.height,
          selectionRects:
            selection.start !== selection.end
              ? getTextareaRangeCoordinates(
                  editorElement,
                  selection.start,
                  selection.end
                ).map((selectionRect) => ({
                  top: editorTop + selectionRect.top,
                  left: editorLeft + selectionRect.left,
                  width: Math.max(selectionRect.width, 2),
                  height: Math.max(selectionRect.height, 14),
                }))
              : [],
        };
      });

    setRemoteMarkers(nextMarkers);
  }, [collaboratorSelections, editorRef]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      recomputeRemoteMarkers();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [content, recomputeRemoteMarkers]);

  const handleEditorScroll = useCallback(() => {
    onScroll();
    recomputeRemoteMarkers();
  }, [onScroll, recomputeRemoteMarkers]);

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
        <InputGroup
          ref={overlayRef}
          className="h-full! flex-1 min-h-0 flex-col items-stretch overflow-hidden rounded-none border-0 bg-transparent has-[[data-slot=input-group-control]:focus-visible]:border-input has-[[data-slot=input-group-control]:focus-visible]:ring-0"
        >
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
            onScroll={handleEditorScroll}
            onFocus={handleEditorSelectionChange}
            onMouseUp={handleEditorSelectionChange}
            onKeyDown={handleEditorKeyDown}
            onSelect={handleEditorSelectionChange}
            placeholder="Write or paste your markdown here..."
            className="h-full min-h-0 flex-1 basis-0 px-6 py-5 font-mono text-sm"
          />

          {remoteMarkers.map((marker) => (
            <div
              key={marker.id}
              className="pointer-events-none absolute z-10"
              style={{
                top: `${marker.top}px`,
                left: `${marker.left}px`,
              }}
            >
              <div
                className="w-[2px] rounded-full"
                style={{
                  backgroundColor: marker.color,
                  height: `${Math.max(marker.height, 14)}px`,
                }}
              />
              <div
                className="mt-1 w-max rounded px-1.5 py-0.5 text-[10px] font-medium text-white shadow"
                style={{ backgroundColor: marker.color + "80" }}
              >
                {marker.name}
              </div>
            </div>
          ))}

          {remoteMarkers.flatMap((marker) =>
            marker.selectionRects.map((selectionRect, index) => (
              <div
                key={`${marker.id}-selection-${index}`}
                className="pointer-events-none absolute z-[9] rounded-sm opacity-25"
                style={{
                  top: `${selectionRect.top}px`,
                  left: `${selectionRect.left}px`,
                  width: `${selectionRect.width}px`,
                  height: `${selectionRect.height}px`,
                  backgroundColor: marker.color,
                }}
              />
            ))
          )}
        </InputGroup>
      </CardContent>
    </Card>
  );
};
