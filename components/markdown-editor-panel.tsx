import { MarkdownEditorToolbar } from "@/components/markdown-editor-toolbar";
import { Card, CardContent } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { useMarkdownSearch } from "@/hooks/use-markdown-search";
import {
  continueListOnEnterAction,
  indentListOnTabAction,
} from "@/lib/markdown-editor";
import {
  getTextareaCaretCoordinates,
  getTextareaRangeCoordinates,
  type TextareaRangeCoordinates,
} from "@/lib/textarea-caret";
import { cn } from "@/lib/utils";
import {
  type CollaborationParticipant,
  type MarkdownDocumentStats,
  type RecentMarkdownFile,
} from "@/types/markdown";
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
  alphaListAction: () => void;
  taskListAction: () => void;
  insertTableAction: (columns: number, rows: number) => void;
  internalLinkTargets: string[];
  insertInternalLinkAction: (relativePath: string) => void;
  insertExternalLinkAction: () => void;
  hideToolbar?: boolean;
  focusMode?: boolean;
  onExitFocusModeAction?: () => void;
  className?: string;
  textareaClassName?: string;
};

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
  alphaListAction,
  taskListAction,
  insertTableAction,
  internalLinkTargets,
  insertInternalLinkAction,
  insertExternalLinkAction,
  hideToolbar = false,
  focusMode = false,
  onExitFocusModeAction,
  className,
  textareaClassName,
}: MarkdownEditorPanelProps) => {
  const topbarRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [remoteMarkers, setRemoteMarkers] = useState<RemoteMarker[]>([]);
  const search = useMarkdownSearch({
    content,
    editorRef,
    onSelectionChangeAction: onSelectionChange,
  });

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

    const previousContent = editorElement.value;
    const previousSelectionStart = editorElement.selectionStart;
    const previousSelectionEnd = editorElement.selectionEnd;
    const previousScrollTop = editorElement.scrollTop;
    const previousScrollLeft = editorElement.scrollLeft;
    const previousLength = previousContent.length;
    const nextLength = content.length;
    let prefixLength = 0;

    while (
      prefixLength < previousLength &&
      prefixLength < nextLength &&
      previousContent.charCodeAt(prefixLength) ===
        content.charCodeAt(prefixLength)
    ) {
      prefixLength += 1;
    }

    let suffixLength = 0;

    while (
      suffixLength < previousLength - prefixLength &&
      suffixLength < nextLength - prefixLength &&
      previousContent.charCodeAt(previousLength - 1 - suffixLength) ===
        content.charCodeAt(nextLength - 1 - suffixLength)
    ) {
      suffixLength += 1;
    }

    const previousChangedEnd = previousLength - suffixLength;
    const nextChangedEnd = nextLength - suffixLength;
    const lengthDelta = nextLength - previousLength;

    const remapSelectionIndex = (index: number) => {
      if (index <= prefixLength) {
        return index;
      }

      if (index >= previousChangedEnd) {
        return Math.max(0, Math.min(nextLength, index + lengthDelta));
      }

      return nextChangedEnd;
    };

    editorElement.value = content;
    editorElement.selectionStart = remapSelectionIndex(previousSelectionStart);
    editorElement.selectionEnd = remapSelectionIndex(previousSelectionEnd);
    editorElement.scrollTop = previousScrollTop;
    editorElement.scrollLeft = previousScrollLeft;
  }, [content, editorRef]);

  const handleEditorChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      search.handleEditorValueChange(event.currentTarget.value);
      onChange(event);
      onSelectionChange(event.currentTarget);
    },
    [onChange, onSelectionChange, search]
  );

  const handleEditorSelectionChange = useCallback(
    (event: SyntheticEvent<HTMLTextAreaElement>) => {
      search.syncSelection(
        event.currentTarget.selectionStart,
        event.currentTarget.selectionEnd
      );
      onSelectionChange(event.currentTarget);
    },
    [onSelectionChange, search]
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
        const marker = getTextareaCaretCoordinates(
          editorElement,
          selection.end
        );

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
      if (event.repeat) {
        return;
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        event.key.toLowerCase() === "f"
      ) {
        event.preventDefault();
        event.stopPropagation();
        search.openSearch({ toggle: true });
        return;
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        event.key.toLowerCase() === "h"
      ) {
        event.preventDefault();
        event.stopPropagation();
        search.openSearch({ openReplace: true });
        return;
      }

      if (
        event.key === "Tab" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        if (indentListOnTabAction(event.currentTarget, event.shiftKey)) {
          event.preventDefault();
          onSelectionChange(event.currentTarget);
        }

        return;
      }

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
    [onSelectionChange, search]
  );

  return (
    <Card
      className={cn(
        "flex h-full min-h-0 flex-col gap-0 rounded-none border-0 bg-transparent py-0 ring-0",
        className
      )}
    >
      <CardContent className="relative min-h-0 flex-1 p-0">
        <InputGroup
          ref={overlayRef}
          className="h-full! min-h-0 flex-1 flex-col items-stretch overflow-hidden rounded-none border-0 bg-transparent has-[[data-slot=input-group-control]:focus-visible]:border-input has-[[data-slot=input-group-control]:focus-visible]:ring-0"
        >
          {hideToolbar ? null : (
            <MarkdownEditorToolbar
              activeFile={activeFile}
              internalLinkTargets={internalLinkTargets}
              search={search}
              stats={stats}
              topbarRef={topbarRef}
              focusMode={focusMode}
              onExitFocusModeAction={onExitFocusModeAction}
              actions={{
                undoAction,
                redoAction,
                boldAction,
                italicAction,
                headingAction,
                inlineCodeAction,
                codeBlockAction,
                bulletListAction,
                orderedListAction,
                alphaListAction,
                taskListAction,
                insertTableAction,
                insertInternalLinkAction,
                insertExternalLinkAction,
              }}
            />
          )}

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
            className={cn(
              "h-full min-h-0 flex-1 basis-0 px-6 py-5 font-mono text-sm",
              textareaClassName
            )}
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
                className="pointer-events-none absolute z-9 rounded-sm opacity-25"
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
