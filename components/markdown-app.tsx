"use client";

import {
  EyeIcon,
  GripVerticalIcon,
  PencilIcon,
  TriangleAlertIcon,
} from "lucide-react";
import * as React from "react";

import { MarkdownEmptyState } from "@/components/markdown-empty-state";
import { MarkdownPreview } from "@/components/markdown-preview";
import { MarkdownRecentFiles } from "@/components/markdown-recent-files";
import { MarkdownToolbar } from "@/components/markdown-toolbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  insertBlockAction,
  prefixLinesAction,
  replaceRangeAction,
  runEditorCommandAction,
  wrapSelectionAction,
} from "@/lib/markdown-editor";
import { getScrollRatio, setScrollRatio } from "@/lib/markdown-helpers";
import { useMarkdownStore } from "@/lib/markdown-store";
import { getTextareaCaretCoordinates } from "@/lib/textarea-caret";

export const MarkdownApp = () => {
  const {
    content,
    activeFile,
    recentFiles,
    hydrated,
    isBusy,
    error,
    canPersistFiles,
    hydrate,
    clearError,
    setContent,
    openWithPicker,
    openDroppedFile,
    reopenRecentFile,
    createNewFile,
    saveActiveFile,
    removeRecentFile,
    clearRecentFiles,
    clearDocument,
  } = useMarkdownStore();

  const [isDragActive, setIsDragActive] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<
    "split" | "editor" | "preview"
  >("split");
  const [syncScrollEnabled, setSyncScrollEnabled] = React.useState(true);
  const [slashMenuOpen, setSlashMenuOpen] = React.useState(false);
  const [slashRange, setSlashRange] = React.useState<{
    start: number;
    end: number;
  } | null>(null);
  const [slashQuery, setSlashQuery] = React.useState("");
  const [slashPopoverPosition, setSlashPopoverPosition] = React.useState<{
    top: number;
    left: number;
  } | null>(null);
  const editorRef = React.useRef<HTMLTextAreaElement | null>(null);
  const previewRef = React.useRef<HTMLDivElement | null>(null);
  const syncingSourceRef = React.useRef<"editor" | "preview" | null>(null);
  const slashPopoverRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  React.useEffect(() => {
    if (!activeFile) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const isPrimaryModifier = event.ctrlKey || event.metaKey;

      if (!isPrimaryModifier || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "z" && event.shiftKey) {
        event.preventDefault();
        void runEditorCommandAction("redo", editorRef.current);
        return;
      }

      switch (key) {
        case "b": {
          event.preventDefault();
          wrapSelectionAction(editorRef.current, "**", "**", "bold text");
          return;
        }
        case "i": {
          event.preventDefault();
          wrapSelectionAction(editorRef.current, "_", "_", "italic text");
          return;
        }
        case "k": {
          event.preventDefault();
          wrapSelectionAction(
            editorRef.current,
            "[",
            "](https://example.com)",
            "link text"
          );
          return;
        }
        case "e": {
          event.preventDefault();
          wrapSelectionAction(editorRef.current, "`", "`", "inline code");
          return;
        }
        case "l": {
          event.preventDefault();
          prefixLinesAction(editorRef.current, "- ", "List item");
          return;
        }
        case "1": {
          event.preventDefault();
          insertBlockAction(editorRef.current, "# ", "", "Heading");
          return;
        }
        case "s": {
          event.preventDefault();
          void saveActiveFile();
          return;
        }
        case "y": {
          event.preventDefault();
          void runEditorCommandAction("redo", editorRef.current);
          return;
        }
        case "z": {
          event.preventDefault();
          void runEditorCommandAction("undo", editorRef.current);
          return;
        }
        default: {
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeFile, saveActiveFile]);

  const handleEditorKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "/") {
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const editor = editorRef.current;

      if (!editor) {
        return;
      }

      const cursor = editor.selectionStart ?? 0;
      const currentValue = editor.value;
      const lineStart = currentValue.lastIndexOf("\n", cursor - 1) + 1;
      const previousChar = currentValue[cursor - 1] ?? "";
      const canTrigger =
        cursor === lineStart || previousChar === " " || previousChar === "\t";

      if (!canTrigger) {
        return;
      }

      event.preventDefault();
      replaceRangeAction(editor, cursor, cursor, "/");
      setSlashRange({ start: cursor, end: cursor + 1 });
      setSlashQuery("");
      const caret = getTextareaCaretCoordinates(editor, cursor + 1);
      setSlashPopoverPosition({
        top: caret.top + caret.height + 8,
        left: caret.left,
      });
      setSlashMenuOpen(true);
    },
    []
  );

  const handleEditorChange = React.useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(event.target.value);

      if (!slashMenuOpen || !slashRange) {
        return;
      }

      const editor = editorRef.current;

      if (!editor) {
        return;
      }

      const cursor = editor.selectionStart ?? slashRange.end;

      if (cursor < slashRange.start) {
        setSlashMenuOpen(false);
        return;
      }

      const nextEnd = Math.max(cursor, slashRange.end);
      const nextQuery = editor.value.slice(slashRange.start + 1, nextEnd);

      if (nextQuery.includes("\n")) {
        setSlashMenuOpen(false);
        return;
      }

      setSlashRange({ start: slashRange.start, end: nextEnd });
      setSlashQuery(nextQuery);

      const caret = getTextareaCaretCoordinates(editor, nextEnd);
      setSlashPopoverPosition({
        top: caret.top + caret.height + 8,
        left: caret.left,
      });
    },
    [setContent, slashMenuOpen, slashRange]
  );

  React.useEffect(() => {
    if (slashMenuOpen) {
      return;
    }

    if (!slashRange) {
      return;
    }

    const editor = editorRef.current;

    if (!editor) {
      setSlashRange(null);
      return;
    }

    const value = editor.value;
    const maybeSlash = value.slice(slashRange.start, slashRange.end);

    if (maybeSlash === "/") {
      replaceRangeAction(editor, slashRange.start, slashRange.end, "");
      editor.setSelectionRange(slashRange.start, slashRange.start);
    }

    setSlashRange(null);
    setSlashQuery("");
    setSlashPopoverPosition(null);
  }, [slashMenuOpen, slashRange]);

  React.useEffect(() => {
    if (!slashMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const popover = slashPopoverRef.current;
      const editor = editorRef.current;

      if (
        popover?.contains(event.target as Node) ||
        editor?.contains(event.target as Node)
      ) {
        return;
      }

      setSlashMenuOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [slashMenuOpen]);

  const runSlashInsertAction = React.useCallback(
    (value: string, select?: { start: number; end: number }) => {
      const editor = editorRef.current;

      if (!editor || !slashRange) {
        return;
      }

      replaceRangeAction(
        editor,
        slashRange.start,
        slashRange.end,
        value,
        select
      );
      setSlashMenuOpen(false);
      setSlashRange(null);
      setSlashQuery("");
      setSlashPopoverPosition(null);
    },
    [slashRange]
  );

  const slashActions = React.useMemo(
    () => [
      {
        group: "Basic blocks",
        items: [
          {
            id: "heading-1",
            label: "Heading 1",
            value: "# Heading",
          },
          {
            id: "heading-2",
            label: "Heading 2",
            value: "## Heading",
          },
          {
            id: "heading-3",
            label: "Heading 3",
            value: "### Heading",
          },
          {
            id: "divider",
            label: "Divider",
            value: "\n---\n",
          },
          {
            id: "quote",
            label: "Quote",
            value: "> Quote",
          },
        ],
      },
      {
        group: "Lists",
        items: [
          {
            id: "bullets",
            label: "Bulleted list",
            value: "- List item",
          },
          {
            id: "numbered",
            label: "Numbered list",
            value: "1. List item",
          },
          {
            id: "todo",
            label: "To-do list",
            value: "- [ ] Task",
          },
        ],
      },
      {
        group: "Code & tables",
        items: [
          {
            id: "inline-code",
            label: "Inline code",
            value: "`code`",
          },
          {
            id: "code-block",
            label: "Code block",
            value: "```md\ncode block\n```",
          },
          {
            id: "table",
            label: "Table",
            value: "| Column | Column |\n| --- | --- |\n| Value | Value |",
          },
        ],
      },
      {
        group: "Links & media",
        items: [
          {
            id: "link",
            label: "Link",
            value: "[link text](https://example.com)",
          },
          {
            id: "image",
            label: "Image",
            value: "![alt text](https://example.com/image.png)",
          },
        ],
      },
    ],
    []
  );

  const filteredSlashActions = React.useMemo(() => {
    const query = slashQuery.trim().toLowerCase();

    if (!query) {
      return slashActions;
    }

    return slashActions
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.label.toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [slashActions, slashQuery]);

  const syncScroll = React.useCallback(
    (source: "editor" | "preview") => {
      const editorElement = editorRef.current;
      const previewElement = previewRef.current;

      if (!editorElement || !previewElement || !syncScrollEnabled) {
        return;
      }

      const sourceElement =
        source === "editor" ? editorElement : previewElement;
      const targetElement =
        source === "editor" ? previewElement : editorElement;

      syncingSourceRef.current = source;
      setScrollRatio(targetElement, getScrollRatio(sourceElement));

      window.requestAnimationFrame(() => {
        syncingSourceRef.current = null;
      });
    },
    [syncScrollEnabled]
  );

  const handleEditorScroll = React.useCallback(() => {
    if (syncingSourceRef.current === "preview") {
      return;
    }

    syncScroll("editor");
  }, [syncScroll]);

  const handlePreviewScroll = React.useCallback(() => {
    if (syncingSourceRef.current === "editor") {
      return;
    }

    syncScroll("preview");
  }, [syncScroll]);

  const handleDragOver = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragActive(true);
    },
    []
  );

  const handleDragLeave = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
        return;
      }

      setIsDragActive(false);
    },
    []
  );

  const handleDrop = React.useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragActive(false);

      const [file] = Array.from(event.dataTransfer.files);

      if (!file) {
        return;
      }

      await openDroppedFile(file, event.dataTransfer.items);
    },
    [openDroppedFile]
  );

  const handleRefresh = React.useCallback(async () => {
    if (!activeFile) {
      return;
    }

    await reopenRecentFile(activeFile.id);
  }, [activeFile, reopenRecentFile]);

  const focusEditorAction = React.useCallback(() => {
    editorRef.current?.focus();
  }, []);

  const focusPreviewAction = React.useCallback(() => {
    previewRef.current?.focus();
  }, []);

  const undoAction = React.useCallback(() => {
    void runEditorCommandAction("undo", editorRef.current);
  }, []);

  const redoAction = React.useCallback(() => {
    void runEditorCommandAction("redo", editorRef.current);
  }, []);

  const cutAction = React.useCallback(() => {
    void runEditorCommandAction("cut", editorRef.current);
  }, []);

  const copyAction = React.useCallback(() => {
    void runEditorCommandAction("copy", editorRef.current);
  }, []);

  const pasteAction = React.useCallback(() => {
    void runEditorCommandAction("paste", editorRef.current);
  }, []);

  const selectAllAction = React.useCallback(() => {
    void runEditorCommandAction("selectAll", editorRef.current);
  }, []);

  const boldAction = React.useCallback(() => {
    wrapSelectionAction(editorRef.current, "**", "**", "bold text");
  }, []);

  const italicAction = React.useCallback(() => {
    wrapSelectionAction(editorRef.current, "_", "_", "italic text");
  }, []);

  const headingAction = React.useCallback(() => {
    insertBlockAction(editorRef.current, "# ", "", "Heading");
  }, []);

  const inlineCodeAction = React.useCallback(() => {
    wrapSelectionAction(editorRef.current, "`", "`", "inline code");
  }, []);

  const codeBlockAction = React.useCallback(() => {
    insertBlockAction(editorRef.current, "```md\n", "\n```", "code block");
  }, []);

  const bulletListAction = React.useCallback(() => {
    prefixLinesAction(editorRef.current, "- ", "List item");
  }, []);

  if (!hydrated) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Loading application...
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-svh flex-col gap-4 p-4"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <TriangleAlertIcon className="size-4" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            className="text-xs underline underline-offset-4"
            onClick={clearError}
          >
            Close
          </button>
        </div>
      ) : null}

      {activeFile ? (
        <div className="overflow-hidden rounded-xl border bg-background">
          <MarkdownToolbar
            activeFile={activeFile}
            recentFiles={recentFiles}
            isBusy={isBusy}
            openFileAction={openWithPicker}
            goHomeAction={clearDocument}
            saveFileAction={saveActiveFile}
            refreshFileAction={handleRefresh}
            clearDocumentAction={clearDocument}
            openRecentAction={reopenRecentFile}
            removeRecentAction={removeRecentFile}
            clearRecentAction={clearRecentFiles}
            undoAction={undoAction}
            redoAction={redoAction}
            cutAction={cutAction}
            copyAction={copyAction}
            pasteAction={pasteAction}
            selectAllAction={selectAllAction}
            boldAction={boldAction}
            italicAction={italicAction}
            headingAction={headingAction}
            inlineCodeAction={inlineCodeAction}
            codeBlockAction={codeBlockAction}
            bulletListAction={bulletListAction}
            focusEditorAction={focusEditorAction}
            focusPreviewAction={focusPreviewAction}
            viewMode={viewMode}
            setViewModeAction={setViewMode}
            syncScrollEnabled={syncScrollEnabled}
            toggleSyncScrollAction={() =>
              setSyncScrollEnabled((current) => !current)
            }
          />

          <ResizablePanelGroup
            orientation="horizontal"
            className="min-h-[calc(100svh-10.5rem)] bg-background"
          >
            {viewMode !== "preview" ? (
              <ResizablePanel
                defaultSize={viewMode === "editor" ? 100 : 50}
                minSize={30}
              >
                <Card className="h-full rounded-none border-0 bg-transparent ring-0">
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="rounded-md bg-primary/5 p-2">
                          <PencilIcon className="size-4" />
                        </div>
                        <CardTitle>Editor</CardTitle>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="relative h-full px-0">
                    {slashMenuOpen && slashPopoverPosition ? (
                      <div
                        ref={slashPopoverRef}
                        className="absolute z-50 w-[320px] rounded-xl border bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
                        style={{
                          top: slashPopoverPosition.top,
                          left: slashPopoverPosition.left,
                        }}
                      >
                        <Command className="rounded-xl! bg-transparent p-0">
                          <CommandList>
                            <CommandEmpty>No blocks found.</CommandEmpty>
                            {filteredSlashActions.map((group) => (
                              <CommandGroup
                                key={group.group}
                                heading={group.group}
                              >
                                {group.items.map((item) => (
                                  <CommandItem
                                    key={item.id}
                                    value={item.label}
                                    onSelect={() =>
                                      runSlashInsertAction(item.value)
                                    }
                                  >
                                    {item.label}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            ))}
                          </CommandList>
                        </Command>
                        {slashQuery ? (
                          <div className="px-2 pt-2 pb-1 text-xs text-muted-foreground">
                            /{slashQuery}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <Textarea
                      ref={editorRef}
                      value={content}
                      onChange={handleEditorChange}
                      onKeyDown={handleEditorKeyDown}
                      onScroll={handleEditorScroll}
                      placeholder="Write or paste your markdown here..."
                      className="h-[calc(100svh-15.5rem)] resize-none rounded-none border-0 px-6 py-5 font-mono text-sm shadow-none focus-visible:ring-0"
                    />
                  </CardContent>
                </Card>
              </ResizablePanel>
            ) : null}

            {viewMode === "split" ? (
              <ResizableHandle withHandle className="bg-border/80">
                <GripVerticalIcon />
              </ResizableHandle>
            ) : null}

            {viewMode !== "editor" ? (
              <ResizablePanel
                defaultSize={viewMode === "preview" ? 100 : 50}
                minSize={30}
              >
                <Card className="h-full rounded-none border-0 bg-transparent ring-0">
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="rounded-md bg-primary/5 p-2">
                          <EyeIcon className="size-4" />
                        </div>
                        <CardTitle>Viewer</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="h-full px-0">
                    <div
                      ref={previewRef}
                      onScroll={handlePreviewScroll}
                      tabIndex={0}
                      className="h-[calc(100svh-15.5rem)] overflow-y-auto outline-none"
                    >
                      {content.trim() ? (
                        <MarkdownPreview content={content} />
                      ) : (
                        <div className="flex h-full items-center justify-center px-6 py-8 text-sm text-muted-foreground">
                          The preview will appear here as soon as markdown is
                          present.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </ResizablePanel>
            ) : null}
          </ResizablePanelGroup>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex w-full max-w-3xl flex-col gap-4">
            <MarkdownEmptyState
              isDragActive={isDragActive}
              isBusy={isBusy}
              canPersistFiles={canPersistFiles}
              openFileAction={openWithPicker}
            />

            <MarkdownRecentFiles
              recentFiles={recentFiles}
              openRecentAction={reopenRecentFile}
              createNewAction={createNewFile}
            />
          </div>
        </div>
      )}
    </div>
  );
};
