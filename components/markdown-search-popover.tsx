"use client";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CaseSensitiveIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, RegexIcon, SearchIcon, WholeWordIcon } from "lucide-react";
import { RefObject } from "react";

type MarkdownSearchPopoverProps = {
  activeSearchMatchIndex: number;
  hasInvalidSearchExpression: boolean;
  isReplaceExpanded: boolean;
  isSearchOpen: boolean;
  jumpToSearchMatchAction: (direction: "next" | "previous") => void;
  onOpenChangeAction: (open: boolean) => void;
  onReplaceValueChangeAction: (value: string) => void;
  onSearchQueryChangeAction: (value: string) => void;
  openSearchAction: (options?: { openReplace?: boolean; toggle?: boolean }) => void;
  replaceCurrentSearchMatchAction: () => void;
  replaceAllSearchMatchesAction: () => void;
  replaceInputRef: RefObject<HTMLInputElement | null>;
  replaceValue: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchMatchesCount: number;
  searchOptions: {
    matchCase: boolean;
    matchWholeWord: boolean;
    useRegularExpression: boolean;
  };
  searchQuery: string;
  toggleReplaceExpandedAction: () => void;
  toggleSearchOptionAction: (
    key: "matchCase" | "matchWholeWord" | "useRegularExpression"
  ) => void;
};

export const MarkdownSearchPopover = ({
  activeSearchMatchIndex,
  hasInvalidSearchExpression,
  isReplaceExpanded,
  isSearchOpen,
  jumpToSearchMatchAction,
  onOpenChangeAction,
  onReplaceValueChangeAction,
  onSearchQueryChangeAction,
  openSearchAction,
  replaceCurrentSearchMatchAction,
  replaceAllSearchMatchesAction,
  replaceInputRef,
  replaceValue,
  searchInputRef,
  searchMatchesCount,
  searchOptions,
  searchQuery,
  toggleReplaceExpandedAction,
  toggleSearchOptionAction,
}: MarkdownSearchPopoverProps) => {
  return (
    <Popover open={isSearchOpen} onOpenChange={onOpenChangeAction}>
      <PopoverTrigger asChild>
        <Button
          variant={isSearchOpen ? "secondary" : "outline"}
          size="icon-sm"
          onClick={() => {
            void openSearchAction({ toggle: true });
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
                onSearchQueryChangeAction(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  jumpToSearchMatchAction(event.shiftKey ? "previous" : "next");
                  return;
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  onOpenChangeAction(false);
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
                  onClick={() => toggleSearchOptionAction("matchCase")}
                >
                  <CaseSensitiveIcon />
                </Button>

                <Button
                  variant={searchOptions.matchWholeWord ? "default" : "outline"}
                  size="icon-sm"
                  title="Match Whole Word"
                  aria-label="Match Whole Word"
                  onClick={() => toggleSearchOptionAction("matchWholeWord")}
                >
                  <WholeWordIcon />
                </Button>

                <Button
                  variant={
                    searchOptions.useRegularExpression ? "default" : "outline"
                  }
                  size="icon-sm"
                  title="Use Regular Expression"
                  aria-label="Use Regular Expression"
                  onClick={() => toggleSearchOptionAction("useRegularExpression")}
                >
                  <RegexIcon />
                </Button>
              </ButtonGroup>
              <Button
                variant="ghost"
                size="icon-sm"
                title={isReplaceExpanded ? "Hide Replace" : "Show Replace"}
                aria-label={isReplaceExpanded ? "Hide Replace" : "Show Replace"}
                onClick={toggleReplaceExpandedAction}
              >
                {isReplaceExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </Button>
            </InputGroupAddon>
          </InputGroup>

          {isReplaceExpanded ? (
            <InputGroup className="h-9">
              <InputGroupInput
                ref={replaceInputRef}
                value={replaceValue}
                onChange={(event) => {
                  onReplaceValueChangeAction(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    replaceCurrentSearchMatchAction();
                    return;
                  }

                  if (event.key === "Escape") {
                    event.preventDefault();
                    onOpenChangeAction(false);
                  }
                }}
                placeholder="Replace"
                className="min-w-0"
              />
              <InputGroupAddon align="inline-end" className="gap-1">
                <ButtonGroup>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={replaceCurrentSearchMatchAction}
                    disabled={searchMatchesCount === 0 || hasInvalidSearchExpression}
                  >
                    Replace
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={replaceAllSearchMatchesAction}
                    disabled={searchMatchesCount === 0 || hasInvalidSearchExpression}
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
                : searchQuery.trim() && searchMatchesCount === 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground"
            )}
          >
            {hasInvalidSearchExpression
              ? "Invalid regular expression."
              : searchQuery.trim()
                ? searchMatchesCount === 0
                  ? "No match found in the current document."
                  : `${activeSearchMatchIndex >= 0 ? activeSearchMatchIndex + 1 : 0}/${searchMatchesCount} · ${searchMatchesCount} result${searchMatchesCount > 1 ? "s" : ""}`
                : null}
          </div>

          <ButtonGroup>
            <Button
              variant="outline"
              size="icon-sm"
              title="Previous Match"
              aria-label="Previous Match"
              onClick={() => jumpToSearchMatchAction("previous")}
              disabled={searchMatchesCount === 0 || hasInvalidSearchExpression}
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              title="Next Match"
              aria-label="Next Match"
              onClick={() => jumpToSearchMatchAction("next")}
              disabled={searchMatchesCount === 0 || hasInvalidSearchExpression}
            >
              <ChevronRightIcon />
            </Button>
          </ButtonGroup>
        </div>
      </PopoverContent>
    </Popover>
  );
};
