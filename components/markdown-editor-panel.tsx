import { MarkdownTableInsertControl } from "@/components/markdown-table-insert-control";
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
  InputGroupInput,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  continueListOnEnterAction,
  indentListOnTabAction,
  replaceRangeAction,
} from "@/lib/markdown-editor";
import { buildActiveDocumentMeta } from "@/lib/markdown-helpers";
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
  BoldIcon,
  CaseSensitiveIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Code2Icon,
  FileCode2Icon,
  Heading1Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  ListTodoIcon,
  PencilIcon,
  Redo2Icon,
  RegexIcon,
  SearchIcon,
  Undo2Icon,
  WholeWordIcon
} from "lucide-react";
import {
  ChangeEvent,
  KeyboardEvent,
  RefObject,
  SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
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
  {
    label: "Numbered list",
    icon: ListOrderedIcon,
    actionKey: "orderedListAction",
  },
  {
    label: "Lettered list",
    icon: ListOrderedIcon,
    actionKey: "alphaListAction",
  },
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

type SearchMatch = {
  start: number;
  end: number;
};

type SearchOptions = {
  matchCase: boolean;
  matchWholeWord: boolean;
  useRegularExpression: boolean;
};

const escapeRegularExpression = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildSearchExpression = (query: string, options: SearchOptions) => {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return null;
  }

  const source = options.useRegularExpression
    ? normalizedQuery
    : escapeRegularExpression(normalizedQuery);
  const wholeWordSource = options.matchWholeWord
    ? `\\b(?:${source})\\b`
    : source;

  try {
    return new RegExp(wholeWordSource, `${options.matchCase ? "g" : "gi"}u`);
  } catch {
    return null;
  }
};

const buildSearchMatches = (
  value: string,
  query: string,
  options: SearchOptions
): SearchMatch[] => {
  const expression = buildSearchExpression(query, options);

  if (!expression) {
    return [];
  }

  const matches: SearchMatch[] = [];
  let match = expression.exec(value);

  while (match) {
    const matchText = match[0] ?? "";
    const start = match.index;
    const end = start + matchText.length;
    matches.push({
      start,
      end,
    });

    if (matchText.length === 0) {
      expression.lastIndex += 1;
    }

    match = expression.exec(value);
  }

  return matches;
};

const findSelectedMatchIndex = (
  matches: SearchMatch[],
  selectionStart: number,
  selectionEnd: number
) =>
  matches.findIndex(
    (match) => match.start === selectionStart && match.end === selectionEnd
  );

const findNearestMatchIndex = (
  matches: SearchMatch[],
  selectionStart: number,
  selectionEnd: number
) => {
  const exactIndex = findSelectedMatchIndex(
    matches,
    selectionStart,
    selectionEnd
  );

  if (exactIndex >= 0) {
    return exactIndex;
  }

  const nextIndex = matches.findIndex((match) => match.start >= selectionEnd);

  if (nextIndex >= 0) {
    return nextIndex;
  }

  return matches.length > 0 ? 0 : -1;
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
}: MarkdownEditorPanelProps) => {
  const topbarRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [remoteMarkers, setRemoteMarkers] = useState<RemoteMarker[]>([]);
  const [searchableContent, setSearchableContent] = useState(content);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isReplaceExpanded, setIsReplaceExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceValue, setReplaceValue] = useState("");
  const [activeSearchMatchIndex, setActiveSearchMatchIndex] = useState(-1);
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    matchCase: false,
    matchWholeWord: false,
    useRegularExpression: false,
  });
  const actionMap = {
    undoAction,
    redoAction,
    boldAction,
    italicAction,
    inlineCodeAction,
    codeBlockAction,
    bulletListAction,
    orderedListAction,
    alphaListAction,
    taskListAction,
  };
  const searchMatches = useMemo(
    () => buildSearchMatches(searchableContent, searchQuery, searchOptions),
    [searchOptions, searchQuery, searchableContent]
  );
  const searchExpression = useMemo(
    () => buildSearchExpression(searchQuery, searchOptions),
    [searchOptions, searchQuery]
  );
  const activeSearchMatch =
    activeSearchMatchIndex >= 0 ? searchMatches[activeSearchMatchIndex] : null;
  const hasInvalidSearchExpression =
    searchQuery.trim().length > 0 && searchExpression === null;

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

  useEffect(() => {
    setSearchableContent(content);
  }, [content]);

  const focusSearchField = useCallback((replace = false) => {
    window.requestAnimationFrame(() => {
      const target = replace ? replaceInputRef.current : searchInputRef.current;
      target?.focus();
      target?.select();
    });
  }, []);

  const openSearch = useCallback(
    (options?: { openReplace?: boolean; toggle?: boolean }) => {
      const editorElement = editorRef.current;
      const selectedText = editorElement
        ? editorElement.value
            .slice(editorElement.selectionStart, editorElement.selectionEnd)
            .trim()
        : "";

      if (options?.toggle && isSearchOpen) {
        setIsSearchOpen(false);
        setActiveSearchMatchIndex(-1);
        editorRef.current?.focus();
        return;
      }

      setIsSearchOpen(true);
      if (options?.openReplace) {
        setIsReplaceExpanded(true);
      }

      if (selectedText) {
        setSearchQuery(selectedText);
      }

      focusSearchField(Boolean(options?.openReplace));
    },
    [editorRef, focusSearchField, isSearchOpen]
  );

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setActiveSearchMatchIndex(-1);
    editorRef.current?.focus();
  }, [editorRef]);

  const selectSearchMatch = useCallback(
    (matchIndex: number) => {
      const editorElement = editorRef.current;
      const match = searchMatches[matchIndex];

      if (!editorElement || !match) {
        return;
      }

      editorElement.focus();
      editorElement.setSelectionRange(match.start, match.end);
      setActiveSearchMatchIndex(matchIndex);
      onSelectionChange(editorElement);
    },
    [editorRef, onSelectionChange, searchMatches]
  );

  const jumpToSearchMatch = useCallback(
    (direction: "next" | "previous") => {
      const editorElement = editorRef.current;

      if (!editorElement || searchMatches.length === 0) {
        return;
      }

      const baseIndex = findNearestMatchIndex(
        searchMatches,
        editorElement.selectionStart,
        editorElement.selectionEnd
      );

      let nextIndex = baseIndex;

      if (direction === "next") {
        nextIndex = baseIndex >= 0 ? (baseIndex + 1) % searchMatches.length : 0;
      } else {
        nextIndex =
          baseIndex >= 0
            ? (baseIndex - 1 + searchMatches.length) % searchMatches.length
            : searchMatches.length - 1;
      }

      selectSearchMatch(nextIndex);
    },
    [editorRef, searchMatches, selectSearchMatch]
  );

  const replaceCurrentSearchMatch = useCallback(() => {
    const editorElement = editorRef.current;

    if (!editorElement || searchMatches.length === 0) {
      return;
    }

    const matchIndex = findNearestMatchIndex(
      searchMatches,
      editorElement.selectionStart,
      editorElement.selectionEnd
    );
    const match = searchMatches[matchIndex];

    if (!match) {
      return;
    }

    replaceRangeAction(editorElement, match.start, match.end, replaceValue, {
      start: match.start,
      end: match.start + replaceValue.length,
    });
    setActiveSearchMatchIndex(matchIndex);
  }, [editorRef, replaceValue, searchMatches]);

  const replaceAllSearchMatches = useCallback(() => {
    const editorElement = editorRef.current;

    if (!editorElement || searchMatches.length === 0) {
      return;
    }

    const currentValue = editorElement.value;
    let nextValue = "";
    let cursor = 0;

    searchMatches.forEach((match) => {
      nextValue += currentValue.slice(cursor, match.start);
      nextValue += replaceValue;
      cursor = match.end;
    });

    nextValue += currentValue.slice(cursor);

    replaceRangeAction(editorElement, 0, currentValue.length, nextValue, {
      start: searchMatches[0]!.start,
      end: searchMatches[0]!.start + replaceValue.length,
    });
    setActiveSearchMatchIndex(searchMatches.length > 0 ? 0 : -1);
  }, [editorRef, replaceValue, searchMatches]);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    const editorElement = editorRef.current;

    if (!editorElement) {
      return;
    }

    if (searchMatches.length === 0) {
      setActiveSearchMatchIndex(-1);
      return;
    }

    const nextIndex = findNearestMatchIndex(
      searchMatches,
      editorElement.selectionStart,
      editorElement.selectionEnd
    );

    setActiveSearchMatchIndex((currentValue) =>
      currentValue === nextIndex ? currentValue : nextIndex
    );
  }, [editorRef, isSearchOpen, searchMatches]);

  useEffect(() => {
    const handleWindowKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return;
      }

      const isPrimaryModifier = event.ctrlKey || event.metaKey;

      if (!isPrimaryModifier || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "f") {
        event.preventDefault();
        openSearch({ toggle: true });
        return;
      }

      if (key === "h") {
        event.preventDefault();
        openSearch({ openReplace: true });
      }
    };

    window.addEventListener("keydown", handleWindowKeyDown);

    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, [openSearch]);

  const handleEditorChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setSearchableContent(event.currentTarget.value);
      onChange(event);
      onSelectionChange(event.currentTarget);
    },
    [onChange, onSelectionChange]
  );

  const handleEditorSelectionChange = useCallback(
    (event: SyntheticEvent<HTMLTextAreaElement>) => {
      if (isSearchOpen) {
        setActiveSearchMatchIndex(
          findSelectedMatchIndex(
            searchMatches,
            event.currentTarget.selectionStart,
            event.currentTarget.selectionEnd
          )
        );
      }

      onSelectionChange(event.currentTarget);
    },
    [isSearchOpen, onSelectionChange, searchMatches]
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
        openSearch({ toggle: true });
        return;
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        event.key.toLowerCase() === "h"
      ) {
        event.preventDefault();
        event.stopPropagation();
        openSearch({ openReplace: true });
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
    [onSelectionChange, openSearch]
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

      <CardContent className="relative min-h-0 flex-1 p-0">
        <InputGroup
          ref={overlayRef}
          className="h-full! min-h-0 flex-1 flex-col items-stretch overflow-hidden rounded-none border-0 bg-transparent has-[[data-slot=input-group-control]:focus-visible]:border-input has-[[data-slot=input-group-control]:focus-visible]:ring-0"
        >
          <InputGroupAddon
            ref={topbarRef}
            align="block-start"
            className="cursor-default border-b px-6 py-3"
          >
            <div className="flex w-full flex-col gap-3">
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

                  <MarkdownTableInsertControl onInsert={insertTableAction} />

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Insert external link"
                    aria-label="Insert external link"
                    onClick={insertExternalLinkAction}
                  >
                    <LinkIcon />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Insert workspace page link"
                        aria-label="Insert workspace page link"
                        disabled={internalLinkTargets.length === 0}
                      >
                        <ChevronDownIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      {internalLinkTargets.length > 0 ? (
                        internalLinkTargets.map((relativePath) => (
                          <DropdownMenuItem
                            key={relativePath}
                            onSelect={() =>
                              insertInternalLinkAction(relativePath)
                            }
                          >
                            <LinkIcon />
                            <span className="truncate">{relativePath}</span>
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem disabled>
                          <LinkIcon />
                          No other workspace pages
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={isSearchOpen ? "secondary" : "ghost"}
                        size="icon-sm"
                        onClick={() => {
                          void openSearch({ toggle: true });
                        }}
                        title="Find"
                        aria-label="Find"
                      >
                        <SearchIcon />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      side="bottom"
                      sideOffset={10}
                      className="w-full gap-2 p-2"
                    >
                      <div className="flex flex-col gap-2">
                        <InputGroup className="h-9">
                          <InputGroupInput
                            ref={searchInputRef}
                            value={searchQuery}
                            onChange={(event) => {
                              setSearchQuery(event.target.value);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                jumpToSearchMatch(
                                  event.shiftKey ? "previous" : "next"
                                );
                                return;
                              }

                              if (event.key === "Escape") {
                                event.preventDefault();
                                closeSearch();
                              }
                            }}
                            placeholder="Find"
                            className="min-w-0"
                          />

                          <InputGroupAddon align="inline-end" className="gap-1">
                            <ButtonGroup>
                              <Button
                                variant={searchOptions.matchCase ? "default" : "outline"}
                                size="icon-sm"
                                title="Match Case"
                                aria-label="Match Case"
                                onClick={() => {
                                  setSearchOptions((currentValue) => ({
                                    ...currentValue,
                                    matchCase: !currentValue.matchCase,
                                  }));
                                  focusSearchField(false);
                                }}
                              >
                                <CaseSensitiveIcon />
                              </Button>

                              <Button
                                variant={searchOptions.matchWholeWord ? "default" : "outline"}
                                size="icon-sm"
                                title="Match Whole Word"
                                aria-label="Match Whole Word"
                                onClick={() => {
                                  setSearchOptions((currentValue) => ({
                                    ...currentValue,
                                    matchWholeWord:
                                      !currentValue.matchWholeWord,
                                  }));
                                  focusSearchField(false);
                                }}
                              >
                                <WholeWordIcon />
                              </Button>

                              <Button
                                variant={searchOptions.useRegularExpression ? "default" : "outline"}
                                size="icon-sm"
                                title="Use Regular Expression"
                                aria-label="Use Regular Expression"
                                onClick={() => {
                                  setSearchOptions((currentValue) => ({
                                    ...currentValue,
                                    useRegularExpression:
                                      !currentValue.useRegularExpression,
                                  }));
                                  focusSearchField(false);
                                }}
                              >
                                <RegexIcon />
                              </Button>
                            </ButtonGroup>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title={
                                isReplaceExpanded
                                  ? "Hide Replace"
                                  : "Show Replace"
                              }
                              aria-label={
                                isReplaceExpanded
                                  ? "Hide Replace"
                                  : "Show Replace"
                              }
                              onClick={() => {
                                setIsReplaceExpanded((currentValue) => {
                                  const nextValue = !currentValue;

                                  if (nextValue) {
                                    focusSearchField(true);
                                  } else {
                                    focusSearchField(false);
                                  }

                                  return nextValue;
                                });
                              }}
                            >
                              {isReplaceExpanded ? (
                                <ChevronUpIcon />
                              ) : (
                                <ChevronDownIcon />
                              )}
                            </Button>
                          </InputGroupAddon>
                        </InputGroup>

                        {isReplaceExpanded ? (
                          <InputGroup className="h-9">
                            <InputGroupInput
                              ref={replaceInputRef}
                              value={replaceValue}
                              onChange={(event) => {
                                setReplaceValue(event.target.value);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  replaceCurrentSearchMatch();
                                  return;
                                }

                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  closeSearch();
                                }
                              }}
                              placeholder="Replace"
                              className="min-w-0"
                            />
                            <InputGroupAddon
                              align="inline-end"
                              className="gap-1"
                            >
                              <ButtonGroup>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={replaceCurrentSearchMatch}
                                  disabled={
                                    searchMatches.length === 0 ||
                                    hasInvalidSearchExpression
                                  }
                                >
                                  Replace
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={replaceAllSearchMatches}
                                  disabled={
                                    searchMatches.length === 0 ||
                                    hasInvalidSearchExpression
                                  }
                                >
                                  Replace all
                                </Button>
                              </ButtonGroup>
                            </InputGroupAddon>
                          </InputGroup>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div
                          className={cn(
                            "text-xs",
                            hasInvalidSearchExpression
                              ? "text-destructive"
                              : searchQuery.trim() && searchMatches.length === 0
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-muted-foreground"
                          )}
                        >
                          {hasInvalidSearchExpression
                            ? "Invalid regular expression."
                            : searchQuery.trim()
                              ? searchMatches.length === 0
                                ? "No match found in the current document."
                                : `${activeSearchMatchIndex >= 0 ? activeSearchMatchIndex + 1 : 0}/${searchMatches.length} · ${searchMatches.length} result${searchMatches.length > 1 ? "s" : ""}`
                              : null}
                        </div>

                        <ButtonGroup>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            title="Previous Match"
                            aria-label="Previous Match"
                            onClick={() => jumpToSearchMatch("previous")}
                            disabled={
                              searchMatches.length === 0 ||
                              hasInvalidSearchExpression
                            }
                          >
                            <ChevronLeftIcon />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            title="Next Match"
                            aria-label="Next Match"
                            onClick={() => jumpToSearchMatch("next")}
                            disabled={
                              searchMatches.length === 0 ||
                              hasInvalidSearchExpression
                            }
                          >
                            <ChevronRightIcon />
                          </Button>
                        </ButtonGroup>
                      </div>
                    </PopoverContent>
                  </Popover>

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
