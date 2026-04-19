"use client";

import { MarkdownSearchPopover } from "@/components/markdown-search-popover";
import { MarkdownTableInsertControl } from "@/components/markdown-table-insert-control";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroupAddon } from "@/components/ui/input-group";
import { buildActiveDocumentMeta } from "@/lib/markdown-helpers";
import {
  type MarkdownDocumentStats,
  type RecentMarkdownFile,
} from "@/types/markdown";
import {
  BoldIcon,
  ChevronDownIcon,
  Code2Icon,
  FileCode2Icon,
  Heading1Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  ListTodoIcon,
  Redo2Icon,
  Undo2Icon,
} from "lucide-react";
import { RefObject } from "react";

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

export const MarkdownEditorToolbar = ({
  activeFile,
  internalLinkTargets,
  search,
  stats,
  topbarRef,
  actions,
}: MarkdownEditorToolbarProps) => {
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

  return (
    <InputGroupAddon
      ref={topbarRef}
      align="block-start"
      className="cursor-default border-b px-6 py-3"
    >
      <div className="flex w-full flex-col gap-3">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{activeFile.name}</div>
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

            <MarkdownTableInsertControl
              onInsertAction={actions.insertTableAction}
            />

            <Button
              variant="ghost"
              size="icon-sm"
              title="Insert external link"
              aria-label="Insert external link"
              onClick={actions.insertExternalLinkAction}
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
                      onSelect={() => actions.insertInternalLinkAction(relativePath)}
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
  );
};
