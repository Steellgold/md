"use client";

import { TriangleAlertIcon } from "lucide-react";
import * as React from "react";

import { MarkdownActiveDocument } from "@/components/markdown-active-document";
import { MarkdownEmptyState } from "@/components/markdown-empty-state";
import { MarkdownRecentFiles } from "@/components/markdown-recent-files";
import { Spinner } from "@/components/ui/spinner";
import { useMarkdownHotkeys } from "@/hooks/use-markdown-hotkeys";
import { useScrollSync } from "@/hooks/use-scroll-sync";
import {
  insertBlockAction,
  prefixLinesAction,
  runEditorCommandAction,
  wrapSelectionAction,
} from "@/lib/markdown-editor";
import { useMarkdownStore } from "@/lib/markdown-store";
import { cn } from "@/lib/utils";
import { type ViewMode } from "@/types/view-mode";

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
  const [viewMode, setViewMode] = React.useState<ViewMode>("split");
  const [syncScrollEnabled, setSyncScrollEnabled] = React.useState(true);
  const editorRef = React.useRef<HTMLTextAreaElement | null>(null);
  const previewRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  useMarkdownHotkeys({
    enabled: Boolean(activeFile),
    onSave: saveActiveFile,
    editorRef,
  });

  const handleEditorChange = React.useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(event.target.value);
    },
    [setContent]
  );

  const { handleEditorScroll, handlePreviewScroll } = useScrollSync({
    syncScrollEnabled,
    editorRef,
    previewRef,
  });

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
      className={cn(
        "flex min-h-svh flex-col",
        activeFile ? "h-svh p-0" : "gap-4 p-4"
      )}
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
        <MarkdownActiveDocument
          activeFile={activeFile}
          recentFiles={recentFiles}
          isBusy={isBusy}
          content={content}
          editorRef={editorRef}
          previewRef={previewRef}
          onEditorChange={handleEditorChange}
          onEditorScroll={handleEditorScroll}
          onPreviewScroll={handlePreviewScroll}
          viewMode={viewMode}
          setViewModeAction={setViewMode}
          syncScrollEnabled={syncScrollEnabled}
          toggleSyncScrollAction={() =>
            setSyncScrollEnabled((current) => !current)
          }
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
        />
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
              removeRecentAction={removeRecentFile}
              clearRecentAction={clearRecentFiles}
              createNewAction={createNewFile}
            />
          </div>
        </div>
      )}
    </div>
  );
};
