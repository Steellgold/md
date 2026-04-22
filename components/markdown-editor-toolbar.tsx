"use client";

import { Button } from "@/components/ui/button";
import { InputGroupAddon } from "@/components/ui/input-group";
import { type MarkdownDocumentStats, type RecentMarkdownFile } from "@/types/markdown";
import {
  BoldIcon, ChevronDownIcon, Code2Icon,
  FileCode2Icon, Heading1Icon, ItalicIcon, LinkIcon, ListIcon,
  ListOrderedIcon,
  ListTodoIcon,
  Minimize2Icon,
  Redo2Icon,
  Undo2Icon,
  type LucideIcon
} from "lucide-react";

import { RefObject } from "react";
import { MarkdownSearchPopover } from "./markdown-search-popover";
import { MarkdownTableInsertControl } from "./markdown-table-insert-control";
import { ButtonGroup } from "./ui/button-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

type MarkdownEditorToolbarProps = {
  activeFile: RecentMarkdownFile;
  internalLinkTargets: string[];
  onTopbarHeightChangeAction?: (height: number) => void;
  search: {
    activeSearchMatchIndex: number;
    hasInvalidSearchExpression: boolean;
    isReplaceExpanded: boolean;
    isSearchOpen: boolean;
    jumpToSearchMatch: (direction: "next" | "previous") => void;
    openSearch: (options?: { openReplace?: boolean; toggle?: boolean }) => void;
    replaceCurrentSearchMatch: () => void;
    replaceAllSearchMatches: () => void;
    replaceInputRef: RefObject<HTMLInputElement | null>;
    replaceValue: string;
    searchInputRef: RefObject<HTMLInputElement | null>;
    searchMatches: { start: number; end: number }[];
    searchOptions: {
      matchCase: boolean;
      matchWholeWord: boolean;
      useRegularExpression: boolean;
    };
    searchQuery: string;
    setReplaceValue: (value: string) => void;
    setSearchOpen: (open: boolean) => void;
    setSearchQuery: (value: string) => void;
    toggleReplaceExpanded: () => void;
    toggleSearchOption: (
      key: "matchCase" | "matchWholeWord" | "useRegularExpression"
    ) => void;
  };
  stats: MarkdownDocumentStats;
  topbarRef: RefObject<HTMLDivElement | null>;
  focusMode?: boolean;
  onExitFocusModeAction?: () => void;
  actions: {
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
    insertInternalLinkAction: (relativePath: string) => void;
    insertExternalLinkAction: () => void;
  };
};

const historyActions = [
  { label: "Undo", icon: Undo2Icon, actionKey: "undoAction" },
  { label: "Redo", icon: Redo2Icon, actionKey: "redoAction" },
] as const;

const formatActions = [
  { label: "Bold", icon: BoldIcon, actionKey: "boldAction" },
  { label: "Italic", icon: ItalicIcon, actionKey: "italicAction" },
  { label: "Inline code", icon: Code2Icon, actionKey: "inlineCodeAction" },
  { label: "Code block", icon: FileCode2Icon, actionKey: "codeBlockAction" },
] as const;

const listActions = [
  { label: "Bullet list", icon: ListIcon, actionKey: "bulletListAction" },
  { label: "Numbered list", icon: ListOrderedIcon, actionKey: "orderedListAction" },
  { label: "Lettered list", icon: ListOrderedIcon, actionKey: "alphaListAction" },
  { label: "Checklist", icon: ListTodoIcon, actionKey: "taskListAction" },
] as const;

const headingLevels = [1, 2, 3, 4, 5, 6] as const;

export const MarkdownEditorToolbar = ({
  activeFile,
  internalLinkTargets,
  search,
  stats,
  topbarRef,
  focusMode = false,
  onExitFocusModeAction,
  actions,
}: MarkdownEditorToolbarProps) => {
  void activeFile;
  void stats;

  const actionMap = {
    undoAction: actions.undoAction,
    redoAction: actions.redoAction,
    boldAction: actions.boldAction,
    italicAction: actions.italicAction,
    inlineCodeAction: actions.inlineCodeAction,
    codeBlockAction: actions.codeBlockAction,
    bulletListAction: actions.bulletListAction,
    orderedListAction: actions.orderedListAction,
    alphaListAction: actions.alphaListAction,
    taskListAction: actions.taskListAction,
  };

  const renderIconActions = (
    items: readonly {
      label: string;
      icon: LucideIcon;
      actionKey: keyof typeof actionMap;
    }[]
  ) =>
    items.map((item) => {
      const Icon = item.icon;
      return (
        <Button
          key={item.label}
          variant="outline"
          size="icon-sm"
          onClick={actionMap[item.actionKey]}
          title={item.label}
          aria-label={item.label}
        >
          <Icon />
        </Button>
      );
    });

  return (
    <InputGroupAddon
      ref={topbarRef}
      align="block-start"
      className="cursor-default border-b p-2"
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {focusMode ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onExitFocusModeAction}
            title="Exit focus mode"
            aria-label="Exit focus mode"
          >
            <Minimize2Icon data-icon="inline-start" />
            Press Esc to exit
          </Button>
        ) : null}
          
        <ButtonGroup className="flex-1">
          {renderIconActions(historyActions)}
        </ButtonGroup>

        <ButtonGroup>
          {renderIconActions(formatActions)}
        </ButtonGroup>

        <ButtonGroup>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
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
                  onSelect={() => actions.headingAction(level)}
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
                variant="outline"
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

          <MarkdownTableInsertControl
            onInsertAction={actions.insertTableAction}
          />
        </ButtonGroup>

        <ButtonGroup>
          <Button
            variant="outline"
            size="icon-sm"
            title="Insert external link"
            aria-label="Insert external link"
            onClick={actions.insertExternalLinkAction}
          >
            <LinkIcon />
          </Button>

          {internalLinkTargets.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  title="Insert workspace page link"
                  aria-label="Insert workspace page link"
                >
                  <ChevronDownIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {internalLinkTargets.map((relativePath) => (
                  <DropdownMenuItem
                    key={relativePath}
                    onSelect={() => actions.insertInternalLinkAction(relativePath)}
                  >
                    <LinkIcon />
                    <span className="truncate">{relativePath}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </ButtonGroup>

        <MarkdownSearchPopover
          activeSearchMatchIndex={search.activeSearchMatchIndex}
          hasInvalidSearchExpression={search.hasInvalidSearchExpression}
          isReplaceExpanded={search.isReplaceExpanded}
          isSearchOpen={search.isSearchOpen}
          jumpToSearchMatchAction={search.jumpToSearchMatch}
          onOpenChangeAction={search.setSearchOpen}
          onReplaceValueChangeAction={search.setReplaceValue}
          onSearchQueryChangeAction={search.setSearchQuery}
          openSearchAction={search.openSearch}
          replaceCurrentSearchMatchAction={search.replaceCurrentSearchMatch}
          replaceAllSearchMatchesAction={search.replaceAllSearchMatches}
          replaceInputRef={search.replaceInputRef}
          replaceValue={search.replaceValue}
          searchInputRef={search.searchInputRef}
          searchMatchesCount={search.searchMatches.length}
          searchOptions={search.searchOptions}
          searchQuery={search.searchQuery}
          toggleReplaceExpandedAction={search.toggleReplaceExpanded}
          toggleSearchOptionAction={search.toggleSearchOption}
        />
      </div>
    </InputGroupAddon>
  );
};
