"use client";

import { MarkdownActiveDocument } from "@/components/markdown-active-document";
import { MarkdownCommandPalette } from "@/components/markdown-command-palette";
import { MarkdownEmptyState } from "@/components/markdown-empty-state";
import { MarkdownOpenUrlDialog } from "@/components/markdown-open-url-dialog";
import { MarkdownRecentFiles } from "@/components/markdown-recent-files";
import { MarkdownRemoteSelectionDialog } from "@/components/markdown-remote-selection-dialog";
import { Spinner } from "@/components/ui/spinner";
import { useMarkdownHotkeys } from "@/hooks/use-markdown-hotkeys";
import { useScrollSync } from "@/hooks/use-scroll-sync";
import { extractMarkdownDeepLink } from "@/lib/markdown-deep-link";
import {
  insertBlockAction,
  prefixLinesAction,
  wrapSelectionAction,
} from "@/lib/markdown-editor";
import {
  buildMarkdownExportFileName,
  buildMarkdownExportHtml,
  downloadTextFile,
} from "@/lib/markdown-export";
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
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "./ui/button";

const defaultDocumentTitle = ".MD";

type EditorHistoryEntry = {
  content: string;
  selection: MarkdownViewerSelection;
};

type EditorHistoryState = {
  entries: EditorHistoryEntry[];
  index: number;
};

export const MarkdownApp = () => {
  const {
    openDocuments,
    activeDocumentId,
    content,
    activeFile,
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
    openPendingRemoteFile,
    reopenRecentFile,
    createNewFile,
    saveActiveFile,
    goHome,
    setActiveDocument,
    closeDocument,
    removeRecentFile,
    clearRecentFiles,
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
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isOpenUrlDialogOpen, setIsOpenUrlDialogOpen] = useState(false);
  const [previewDetached, setPreviewDetached] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  const [editorSelection, setEditorSelection] =
    useState<MarkdownViewerSelection | null>(null);

  const attemptedDeepLinkRef = useRef<string | null>(null);
  const historyRef = useRef<Map<string, EditorHistoryState>>(new Map());
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingSelectionRef = useRef<MarkdownViewerSelection | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const searchParamsKey = searchParams.toString();

  const parsedDeepLink = useMemo(
    () =>
      extractMarkdownDeepLink(pathname, new URLSearchParams(searchParamsKey)),
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

  useEffect(() => {
    const nextHistory = new Map<string, EditorHistoryState>();

    openDocuments.forEach((document) => {
      const existingHistory = historyRef.current.get(document.id);
      const initialSelection = {
        start: document.content.length,
        end: document.content.length,
      };

      if (!existingHistory) {
        nextHistory.set(document.id, {
          entries: [
            {
              content: document.content,
              selection: initialSelection,
            },
          ],
          index: 0,
        });
        return;
      }

      const activeEntry = existingHistory.entries[existingHistory.index];

      if (!document.isDirty && activeEntry?.content !== document.content) {
        nextHistory.set(document.id, {
          entries: [
            {
              content: document.content,
              selection: initialSelection,
            },
          ],
          index: 0,
        });
        return;
      }

      nextHistory.set(document.id, existingHistory);
    });

    historyRef.current = nextHistory;
  }, [openDocuments]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) {
        return;
      }

      if (event.shiftKey) {
        return;
      }

      if (event.key.toLowerCase() !== "k") {
        return;
      }

      event.preventDefault();
      setIsCommandPaletteOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleEditorChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const nextValue = event.target.value;
      const nextSelection = {
        start: event.target.selectionStart,
        end: event.target.selectionEnd,
      };

      if (activeDocumentId) {
        const currentHistory = historyRef.current.get(activeDocumentId) ?? {
          entries: [],
          index: -1,
        };
        const activeEntry = currentHistory.entries[currentHistory.index];

        if (activeEntry?.content !== nextValue) {
          const nextEntries = currentHistory.entries
            .slice(0, currentHistory.index + 1)
            .concat({
              content: nextValue,
              selection: nextSelection,
            });

          historyRef.current.set(activeDocumentId, {
            entries: nextEntries,
            index: nextEntries.length - 1,
          });
        }
      }

      setContent(nextValue);
    },
    [activeDocumentId, setContent]
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

      if (activeDocumentId) {
        const currentHistory = historyRef.current.get(activeDocumentId);

        if (currentHistory && currentHistory.index >= 0) {
          const nextEntries = currentHistory.entries.map((entry, index) =>
            index === currentHistory.index
              ? {
                  ...entry,
                  selection: nextSelection,
                }
              : entry
          );

          historyRef.current.set(activeDocumentId, {
            entries: nextEntries,
            index: currentHistory.index,
          });
        }
      }

      setEditorSelection((currentValue) =>
        currentValue?.start === nextSelection.start &&
        currentValue?.end === nextSelection.end
          ? currentValue
          : nextSelection
      );
    },
    [activeDocumentId]
  );

  const { handleEditorScroll, handlePreviewScroll, syncPreviewToEditor } =
    useScrollSync({
      syncScrollEnabled,
      editorRef,
      previewRef,
    });

  useEffect(() => {
    if (!activeFile || !syncScrollEnabled) {
      return;
    }

    if (previewDetached || viewMode === "editor") {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      syncPreviewToEditor();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [
    activeFile,
    previewDetached,
    syncPreviewToEditor,
    syncScrollEnabled,
    viewMode,
  ]);

  useEffect(() => {
    if (!activeFile) {
      setTimeout(() => setEditorSelection(null), 0);
      return;
    }

    if (pendingSelectionRef.current) {
      return;
    }

    if (!editorSelection) {
      return;
    }

    syncEditorSelection(editorRef.current);
  }, [activeFile, content, editorSelection, syncEditorSelection]);

  useLayoutEffect(() => {
    const pendingSelection = pendingSelectionRef.current;
    const editorElement = editorRef.current;

    if (!pendingSelection || !editorElement) {
      return;
    }

    editorElement.focus();
    editorElement.setSelectionRange(
      pendingSelection.start,
      pendingSelection.end
    );
    setEditorSelection(pendingSelection);
    pendingSelectionRef.current = null;
  }, [activeDocumentId, content]);

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

      if (
        event.currentTarget instanceof HTMLElement &&
        event.currentTarget.contains(event.relatedTarget as Node | null)
      ) {
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
    if (!activeDocumentId) {
      return;
    }

    const currentHistory = historyRef.current.get(activeDocumentId);

    if (!currentHistory || currentHistory.index <= 0) {
      return;
    }

    const nextIndex = currentHistory.index - 1;
    const nextEntry = currentHistory.entries[nextIndex];

    historyRef.current.set(activeDocumentId, {
      entries: currentHistory.entries,
      index: nextIndex,
    });
    pendingSelectionRef.current = nextEntry.selection;
    setContent(nextEntry.content);
  }, [activeDocumentId, setContent]);

  const redoAction = useCallback(() => {
    if (!activeDocumentId) {
      return;
    }

    const currentHistory = historyRef.current.get(activeDocumentId);

    if (
      !currentHistory ||
      currentHistory.index >= currentHistory.entries.length - 1
    ) {
      return;
    }

    const nextIndex = currentHistory.index + 1;
    const nextEntry = currentHistory.entries[nextIndex];

    historyRef.current.set(activeDocumentId, {
      entries: currentHistory.entries,
      index: nextIndex,
    });
    pendingSelectionRef.current = nextEntry.selection;
    setContent(nextEntry.content);
  }, [activeDocumentId, setContent]);

  useMarkdownHotkeys({
    enabled: Boolean(activeFile),
    saveEnabled: activeFile?.source !== "url",
    onSaveAction: saveActiveFile,
    onOpenSwitcherAction: () => setIsCommandPaletteOpen(true),
    onUndoAction: undoAction,
    onRedoAction: redoAction,
    editorRef,
  });

  const boldAction = useCallback(() => {
    wrapSelectionAction(editorRef.current, "**", "**", "bold text");
  }, []);

  const italicAction = useCallback(() => {
    wrapSelectionAction(editorRef.current, "_", "_", "italic text");
  }, []);

  const headingAction = useCallback((level: 1 | 2 | 3 | 4 | 5 | 6) => {
    insertBlockAction(
      editorRef.current,
      `${"#".repeat(level)} `,
      "",
      "Heading"
    );
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

  const showCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(true);
  }, []);

  const showOpenUrlDialog = useCallback(() => {
    setIsCommandPaletteOpen(false);
    setIsOpenUrlDialogOpen(true);
  }, []);

  const exportMarkdownFile = useCallback(() => {
    if (!activeFile) {
      return;
    }

    downloadTextFile(
      buildMarkdownExportFileName(activeFile.name, "md"),
      content,
      "text/markdown;charset=utf-8"
    );
  }, [activeFile, content]);

  const exportHtmlFile = useCallback(() => {
    if (!activeFile) {
      return;
    }

    downloadTextFile(
      buildMarkdownExportFileName(activeFile.name, "html"),
      buildMarkdownExportHtml(activeFile.name, content),
      "text/html;charset=utf-8"
    );
  }, [activeFile, content]);

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
        "relative flex min-h-svh flex-col",
        activeFile ? "h-svh p-0" : "gap-4 p-4"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {error || uiError ? (
        <div className="absolute right-4 bottom-4 z-50 flex flex-col gap-3">
          {error ? (
            <div className="mx-auto flex items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive backdrop-blur-xl">
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
            <div className="mx-auto flex items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive backdrop-blur-xl">
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
          openDocuments={openDocuments}
          activeDocumentId={activeDocumentId}
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
          showCommandPaletteAction={showCommandPalette}
          showOpenUrlDialogAction={showOpenUrlDialog}
          goHomeAction={goHome}
          saveFileAction={saveActiveFile}
          refreshFileAction={handleRefresh}
          clearDocumentAction={clearDocument}
          setActiveDocumentAction={setActiveDocument}
          closeDocumentAction={closeDocument}
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
          <div className="pt-3 text-center text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Tip:</span> press{" "}
            <button
              type="button"
              onClick={showCommandPalette}
              className="font-medium text-foreground underline underline-offset-4"
            >
              Ctrl/Cmd + K
            </button>{" "}
            for quick actions.
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div className="flex w-full max-w-3xl flex-col gap-4">
              <MarkdownEmptyState
                isDragActive={isDragActive}
                isBusy={isBusy}
                canPersistFiles={canPersistFiles}
                openFileAction={openWithPicker}
                showOpenUrlDialogAction={showOpenUrlDialog}
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

      <MarkdownRemoteSelectionDialog
        isBusy={isBusy}
        files={pendingRemoteOpen?.files ?? []}
        openFileAction={(fileName) => {
          void openPendingRemoteFile(fileName);
        }}
        clearRemoteSelectionAction={clearPendingRemoteOpen}
      />
      <MarkdownOpenUrlDialog
        isBusy={isBusy}
        openUrlAction={openFromUrl}
        open={isOpenUrlDialogOpen}
        onOpenChange={setIsOpenUrlDialogOpen}
      />
      <MarkdownCommandPalette
        open={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
        activeDocumentId={activeDocumentId}
        activeFileName={activeFile?.name ?? null}
        openDocuments={openDocuments}
        recentFiles={recentFiles}
        viewMode={viewMode}
        canSaveActiveFile={activeFile?.source !== "url"}
        hasActiveFile={Boolean(activeFile)}
        isBusy={isBusy}
        openFileAction={() => {
          void openWithPicker();
        }}
        openUrlDialogAction={showOpenUrlDialog}
        createNewAction={() => {
          void createNewFile();
        }}
        saveFileAction={() => {
          void saveActiveFile();
        }}
        refreshFileAction={() => {
          void handleRefresh();
        }}
        exportMarkdownAction={exportMarkdownFile}
        exportHtmlAction={exportHtmlFile}
        goHomeAction={goHome}
        closeDocumentAction={clearDocument}
        openRecentAction={(id) => {
          void reopenRecentFile(id);
        }}
        setActiveDocumentAction={setActiveDocument}
        setViewModeAction={setViewMode}
      />
    </div>
  );
};
