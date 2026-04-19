"use client";

import { replaceRangeAction } from "@/lib/markdown-editor";
import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";

type SearchMatch = {
  start: number;
  end: number;
};

type SearchOptions = {
  matchCase: boolean;
  matchWholeWord: boolean;
  useRegularExpression: boolean;
};

type OpenSearchOptions = {
  openReplace?: boolean;
  toggle?: boolean;
};

type UseMarkdownSearchParams = {
  content: string;
  editorRef: RefObject<HTMLTextAreaElement | null>;
  onSelectionChangeAction: (editor: HTMLTextAreaElement) => void;
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
    matches.push({ start, end });

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

export const useMarkdownSearch = ({
  content,
  editorRef,
  onSelectionChangeAction,
}: UseMarkdownSearchParams) => {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
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

  const searchMatches = useMemo(
    () => buildSearchMatches(searchableContent, searchQuery, searchOptions),
    [searchOptions, searchQuery, searchableContent]
  );
  const searchExpression = useMemo(
    () => buildSearchExpression(searchQuery, searchOptions),
    [searchOptions, searchQuery]
  );
  const hasInvalidSearchExpression =
    searchQuery.trim().length > 0 && searchExpression === null;

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
    (options?: OpenSearchOptions) => {
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

  const setSearchOpen = useCallback(
    (open: boolean) => {
      if (open) {
        setIsSearchOpen(true);
        return;
      }

      closeSearch();
    },
    [closeSearch]
  );

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
      onSelectionChangeAction(editorElement);
    },
    [editorRef, onSelectionChangeAction, searchMatches]
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
    setSearchableContent(editorElement.value);
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
    setSearchableContent(editorElement.value);
    setActiveSearchMatchIndex(searchMatches.length > 0 ? 0 : -1);
  }, [editorRef, replaceValue, searchMatches]);

  const toggleReplaceExpanded = useCallback(() => {
    setIsReplaceExpanded((currentValue) => {
      const nextValue = !currentValue;

      if (nextValue) {
        focusSearchField(true);
      } else {
        focusSearchField(false);
      }

      return nextValue;
    });
  }, [focusSearchField]);

  const toggleSearchOption = useCallback(
    (key: keyof SearchOptions) => {
      setSearchOptions((currentValue) => ({
        ...currentValue,
        [key]: !currentValue[key],
      }));
      focusSearchField(false);
    },
    [focusSearchField]
  );

  const syncSelection = useCallback(
    (selectionStart: number, selectionEnd: number) => {
      if (!isSearchOpen) {
        return;
      }

      setActiveSearchMatchIndex(
        findSelectedMatchIndex(searchMatches, selectionStart, selectionEnd)
      );
    },
    [isSearchOpen, searchMatches]
  );

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

  return {
    activeSearchMatchIndex,
    closeSearch,
    handleEditorValueChange: setSearchableContent,
    hasInvalidSearchExpression,
    isReplaceExpanded,
    isSearchOpen,
    jumpToSearchMatch,
    openSearch,
    replaceCurrentSearchMatch,
    replaceAllSearchMatches,
    replaceInputRef,
    replaceValue,
    searchInputRef,
    searchMatches,
    searchOptions,
    searchQuery,
    setReplaceValue,
    setSearchOpen,
    setSearchQuery,
    syncSelection,
    toggleReplaceExpanded,
    toggleSearchOption,
  };
};
