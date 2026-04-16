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
  insertBlockAction,
  prefixLinesAction,
  runEditorCommandAction,
  wrapSelectionAction,
} from "@/lib/markdown-editor";
import { getScrollRatio, setScrollRatio } from "@/lib/markdown-helpers";
import { useMarkdownStore } from "@/lib/markdown-store";

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
  const editorRef = React.useRef<HTMLTextAreaElement | null>(null);
  const previewRef = React.useRef<HTMLDivElement | null>(null);
  const syncingSourceRef = React.useRef<"editor" | "preview" | null>(null);

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

  const handleEditorChange = React.useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(event.target.value);
    },
    [setContent]
  );

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
                    <Textarea
                      ref={editorRef}
                      value={content}
                      onChange={handleEditorChange}
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
