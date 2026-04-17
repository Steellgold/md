"use client";

import { MarkdownActiveDocument } from "@/components/markdown-active-document";
import { MarkdownEmptyState } from "@/components/markdown-empty-state";
import { MarkdownImportSelectionDialog } from "@/components/markdown-import-selection-dialog";
import { MarkdownRecentFiles } from "@/components/markdown-recent-files";
import { MarkdownRemoteSelectionDialog } from "@/components/markdown-remote-selection-dialog";
import { Spinner } from "@/components/ui/spinner";
import { useMarkdownHotkeys } from "@/hooks/use-markdown-hotkeys";
import { useScrollSync } from "@/hooks/use-scroll-sync";
import { extractMarkdownDeepLink } from "@/lib/markdown-deep-link";
import {
  insertBlockAction,
  prefixLinesAction,
  runEditorCommandAction,
  wrapSelectionAction,
} from "@/lib/markdown-editor";
import { useMarkdownStore } from "@/lib/markdown-store";
import { useMarkdownUiStore } from "@/lib/markdown-ui-store";
import { cn } from "@/lib/utils";
import { type MarkdownViewerSelection } from "@/types/markdown-viewer-selection";
import { ArrowUpRightIcon, TriangleAlertIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type ChangeEvent,
  type DragEvent as ReactDragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "./ui/button";

const defaultDocumentTitle = ".MD";

export const MarkdownApp = () => {
  const {
    content,
    activeFile,
    pendingImports,
    pendingRemoteOpen,
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
    openDeepLinkUrl,
    openDroppedFiles,
    openPendingImport,
    openPendingRemoteFile,
    reopenRecentFile,
    createNewFile,
    saveActiveFile,
    removeRecentFile,
    clearRecentFiles,
    clearPendingImports,
    clearPendingRemoteOpen,
    clearDocument,
  } = useMarkdownStore();

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewMode = useMarkdownUiStore((state) => state.viewMode);
  const syncScrollEnabled = useMarkdownUiStore(
    (state) => state.syncScrollEnabled
  );
  const setViewMode = useMarkdownUiStore((state) => state.setViewMode);
  const toggleSyncScroll = useMarkdownUiStore(
    (state) => state.toggleSyncScroll
  );
  const [isDragActive, setIsDragActive] = useState(false);
  const [previewDetached, setPreviewDetached] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  const [editorSelection, setEditorSelection] =
    useState<MarkdownViewerSelection | null>(null);
  const attemptedDeepLinkRef = useRef<string | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const searchParamsKey = searchParams.toString();
  const parsedDeepLink = useMemo(
    () => extractMarkdownDeepLink(pathname, new URLSearchParams(searchParamsKey)),
    [pathname, searchParamsKey]
  );

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!parsedDeepLink) {
      attemptedDeepLinkRef.current = null;
      return;
    }

    if (!hydrated || activeFile) {
      return;
    }

    const deepLinkKey = `${parsedDeepLink.source}:${parsedDeepLink.targetUrl}`;

    if (attemptedDeepLinkRef.current === deepLinkKey) {
      return;
    }

    attemptedDeepLinkRef.current = deepLinkKey;

    void (async () => {
      await openDeepLinkUrl(parsedDeepLink.targetUrl);
      router.replace("/", { scroll: false });
    })();
  }, [activeFile, hydrated, openDeepLinkUrl, parsedDeepLink, router]);

  useEffect(() => {
    document.title = activeFile
      ? `${activeFile.name} | ${defaultDocumentTitle}`
      : defaultDocumentTitle;
  }, [activeFile]);

  useEffect(() => {
    if (!activeFile) {
      setTimeout(() => setPreviewDetached(false), 0);
    }
  }, [activeFile]);

  useMarkdownHotkeys({
    enabled: Boolean(activeFile),
    saveEnabled: activeFile?.source !== "url",
    onSaveAction: saveActiveFile,
    editorRef,
  });

  const handleEditorChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setContent(event.target.value);
    },
    [setContent]
  );

  const clearEditorSelection = useCallback(() => {
    setEditorSelection(null);
  }, []);

  const syncEditorSelection = useCallback(
    (editor: HTMLTextAreaElement | null) => {
      if (!editor) {
        return;
      }

      const nextSelection = {
        start: editor.selectionStart,
        end: editor.selectionEnd,
      };

      setEditorSelection((currentValue) =>
        currentValue?.start === nextSelection.start &&
        currentValue?.end === nextSelection.end
          ? currentValue
          : nextSelection
      );
    },
    []
  );

  const { handleEditorScroll, handlePreviewScroll } = useScrollSync({
    syncScrollEnabled,
    editorRef,
    previewRef,
  });

  useEffect(() => {
    if (!activeFile) {
      setTimeout(() => setEditorSelection(null), 0);
      return;
    }

    if (!editorSelection) {
      return;
    }

    syncEditorSelection(editorRef.current);
  }, [activeFile, content, editorSelection, syncEditorSelection]);

  useEffect(() => {
    if (!activeFile) {
      return;
    }

    const handleSelectionChange = () => {
      const editorElement = editorRef.current;

      if (!editorElement || document.activeElement !== editorElement) {
        return;
      }

      syncEditorSelection(editorElement);
    };

    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [activeFile, syncEditorSelection]);

  const handleDragOver = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragActive(true);
    },
    []
  );

  const handleDragLeave = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (event.currentTarget instanceof HTMLElement && event.currentTarget.contains(event.relatedTarget as Node | null)) {
        return;
      }

      setIsDragActive(false);
    },
    []
  );

  const handleDrop = useCallback(
    async (event: ReactDragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragActive(false);

      const files = Array.from(event.dataTransfer?.files ?? []);

      if (files.length === 0) {
        return;
      }

      await openDroppedFiles(files, event.dataTransfer?.items ?? null);
    },
    [openDroppedFiles]
  );

  const handleRefresh = useCallback(async () => {
    if (!activeFile) {
      return;
    }

    await reopenRecentFile(activeFile.id);
  }, [activeFile, reopenRecentFile]);

  const undoAction = useCallback(() => {
    void runEditorCommandAction("undo", editorRef.current);
  }, []);

  const redoAction = useCallback(() => {
    void runEditorCommandAction("redo", editorRef.current);
  }, []);

  const boldAction = useCallback(() => {
    wrapSelectionAction(editorRef.current, "**", "**", "bold text");
  }, []);

  const italicAction = useCallback(() => {
    wrapSelectionAction(editorRef.current, "_", "_", "italic text");
  }, []);

  const headingAction = useCallback((level: 1 | 2 | 3 | 4 | 5 | 6) => {
    insertBlockAction(editorRef.current, `${"#".repeat(level)} `, "", "Heading");
  }, []);

  const inlineCodeAction = useCallback(() => {
    wrapSelectionAction(editorRef.current, "`", "`", "inline code");
  }, []);

  const codeBlockAction = useCallback(() => {
    insertBlockAction(editorRef.current, "```md\n", "\n```", "code block");
  }, []);

  const bulletListAction = useCallback(() => {
    prefixLinesAction(editorRef.current, "- ", "List item");
  }, []);

  const togglePreviewDetached = useCallback(() => {
    setUiError(null);
    setPreviewDetached((currentValue) => !currentValue);
  }, []);

  const closePreviewDetached = useCallback(() => {
    setPreviewDetached(false);
  }, []);

  const clearUiError = useCallback(() => {
    setUiError(null);
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
      {error || uiError ? (
        <div className="absolute right-4 bottom-4 z-50 flex flex-col gap-3">
          {error ? (
            <div className="flex mx-auto items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <TriangleAlertIcon className="size-4" />
                {error}
              </div>

              <Button variant="destructive" onClick={clearError}>
                Close
              </Button>
            </div>
          ) : null}

          {uiError ? (
            <div className="flex mx-auto items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <TriangleAlertIcon className="size-4" />
                {uiError}
              </div>

              <Button variant="destructive" onClick={clearUiError}>
                Close
              </Button>
            </div>
          ) : null}
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
          onEditorBlur={clearEditorSelection}
          onEditorSelectionChange={syncEditorSelection}
          onEditorScroll={handleEditorScroll}
          onPreviewScroll={handlePreviewScroll}
          editorSelection={editorSelection}
          viewMode={viewMode}
          setViewModeAction={setViewMode}
          previewDetached={previewDetached}
          togglePreviewDetachedAction={togglePreviewDetached}
          closePreviewDetachedAction={closePreviewDetached}
          onDetachedPreviewBlocked={setUiError}
          syncScrollEnabled={syncScrollEnabled}
          toggleSyncScrollAction={toggleSyncScroll}
          openFileAction={openWithPicker}
          openUrlAction={openFromUrl}
          goHomeAction={clearDocument}
          saveFileAction={saveActiveFile}
          refreshFileAction={handleRefresh}
          clearDocumentAction={clearDocument}
          openRecentAction={reopenRecentFile}
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
        <div className="flex flex-1 flex-col">
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

          <footer className="pb-3 text-center text-xs text-muted-foreground">
            <div className="flex flex-col items-center gap-1">
              <div>
                Made by{" "}
                <a
                  href="https://github.com/steellgold"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-foreground transition-colors hover:text-primary hover:underline"
                >
                  Gaëtan H
                  <ArrowUpRightIcon className="size-3" />
                </a>
              </div>

              <div>
                Contribute on{" "}
                <a
                  href="https://github.com/Steellgold/md"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-foreground transition-colors hover:text-primary hover:underline"
                >
                  GitHub
                  <ArrowUpRightIcon className="size-3" />
                </a>
              </div>
            </div>
          </footer>
        </div>
      )}

      <MarkdownImportSelectionDialog
        pendingImports={pendingImports}
        openImportAction={openPendingImport}
        clearPendingImportsAction={clearPendingImports}
      />
      <MarkdownRemoteSelectionDialog
        isBusy={isBusy}
        files={pendingRemoteOpen?.files ?? []}
        openFileAction={(fileName) => {
          void openPendingRemoteFile(fileName);
        }}
        clearRemoteSelectionAction={clearPendingRemoteOpen}
      />
    </div>
  );
};
