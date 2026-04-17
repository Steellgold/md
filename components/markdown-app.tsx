"use client";

import { TriangleAlertIcon } from "lucide-react";
import * as React from "react";

import { MarkdownActiveDocument } from "@/components/markdown-active-document";
import { MarkdownEmptyState } from "@/components/markdown-empty-state";
import { MarkdownImportSelectionDialog } from "@/components/markdown-import-selection-dialog";
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
import { useMarkdownUiStore } from "@/lib/markdown-ui-store";
import { useMarkdownStore } from "@/lib/markdown-store";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

const defaultDocumentTitle = ".MD";

export const MarkdownApp = () => {
  const {
    content,
    activeFile,
    pendingImports,
    recentFiles,
    hydrated,
    isBusy,
    error,
    canPersistFiles,
    hydrate,
    clearError,
    setContent,
    openWithPicker,
    openFromUrl,
    openDroppedFiles,
    openPendingImport,
    reopenRecentFile,
    createNewFile,
    saveActiveFile,
    removeRecentFile,
    clearRecentFiles,
    clearPendingImports,
    clearDocument,
  } = useMarkdownStore();

  const viewMode = useMarkdownUiStore((state) => state.viewMode);
  const syncScrollEnabled = useMarkdownUiStore(
    (state) => state.syncScrollEnabled
  );
  const setViewMode = useMarkdownUiStore((state) => state.setViewMode);
  const toggleSyncScroll = useMarkdownUiStore(
    (state) => state.toggleSyncScroll
  );
  const [isDragActive, setIsDragActive] = React.useState(false);
  const editorRef = React.useRef<HTMLTextAreaElement | null>(null);
  const previewRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  React.useEffect(() => {
    document.title = activeFile
      ? `${activeFile.name} | ${defaultDocumentTitle}`
      : defaultDocumentTitle;
  }, [activeFile]);

  useMarkdownHotkeys({
    enabled: Boolean(activeFile),
    saveEnabled: activeFile?.source !== "url",
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

      const files = Array.from(event.dataTransfer.files);

      if (files.length === 0) {
        return;
      }

      await openDroppedFiles(files, event.dataTransfer.items);
    },
    [openDroppedFiles]
  );

  const handleRefresh = React.useCallback(async () => {
    if (!activeFile) {
      return;
    }

    await reopenRecentFile(activeFile.id);
  }, [activeFile, reopenRecentFile]);

  const undoAction = React.useCallback(() => {
    void runEditorCommandAction("undo", editorRef.current);
  }, []);

  const redoAction = React.useCallback(() => {
    void runEditorCommandAction("redo", editorRef.current);
  }, []);

  const boldAction = React.useCallback(() => {
    wrapSelectionAction(editorRef.current, "**", "**", "bold text");
  }, []);

  const italicAction = React.useCallback(() => {
    wrapSelectionAction(editorRef.current, "_", "_", "italic text");
  }, []);

  const headingAction = React.useCallback((level: 1 | 2 | 3 | 4 | 5 | 6) => {
    insertBlockAction(editorRef.current, `${"#".repeat(level)} `, "", "Heading");
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
        "flex min-h-svh flex-col relative",
        activeFile ? "h-svh p-0" : "gap-4 p-4"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {error ? (
        <div className="absolute bottom-4 right-4 z-50">
          <div className="flex mx-auto items-center gap-4 rounded-xl backdrop-blur-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <div className="flex items-center gap-2">
              <TriangleAlertIcon className="size-4" />
              {error}
            </div>

            <Button
              variant="destructive"
              onClick={clearError}
            >
              Close
            </Button>
          </div>
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
          toggleSyncScrollAction={toggleSyncScroll}
          openFileAction={openWithPicker}
          openUrlAction={openFromUrl}
          goHomeAction={clearDocument}
          saveFileAction={saveActiveFile}
          refreshFileAction={handleRefresh}
          clearDocumentAction={clearDocument}
          openRecentAction={reopenRecentFile}
          removeRecentAction={removeRecentFile}
          clearRecentAction={clearRecentFiles}
          undoAction={undoAction}
          redoAction={redoAction}
          boldAction={boldAction}
          italicAction={italicAction}
          headingAction={headingAction}
          inlineCodeAction={inlineCodeAction}
          codeBlockAction={codeBlockAction}
          bulletListAction={bulletListAction}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex w-full max-w-3xl flex-col gap-4">
            <MarkdownEmptyState
              isDragActive={isDragActive}
              isBusy={isBusy}
              canPersistFiles={canPersistFiles}
              openFileAction={openWithPicker}
              openUrlAction={openFromUrl}
              createNewAction={createNewFile}
            />

            <MarkdownRecentFiles
              recentFiles={recentFiles}
              openRecentAction={reopenRecentFile}
              removeRecentAction={removeRecentFile}
              clearRecentAction={clearRecentFiles}
            />
          </div>
        </div>
      )}

      <MarkdownImportSelectionDialog
        pendingImports={pendingImports}
        openImportAction={openPendingImport}
        clearPendingImportsAction={clearPendingImports}
      />
    </div>
  );
};
