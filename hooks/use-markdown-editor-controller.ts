"use client";

import { type OpenMarkdownDocument } from "@/types/markdown";
import { type MarkdownViewerSelection } from "@/types/markdown-viewer-selection";
import {
  type ChangeEvent,
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

type CollaborationController = {
  isActive: boolean;
  applyLocalContent: (nextContent: string) => void;
  updateLocalSelection: (selection: MarkdownViewerSelection | null) => void;
  undo: () => void;
  redo: () => void;
};

type EditorHistoryEntry = {
  content: string;
  selection: MarkdownViewerSelection;
  timestamp: number;
};

type EditorHistoryState = {
  entries: EditorHistoryEntry[];
  index: number;
};

type UseMarkdownEditorControllerParams = {
  activeDocumentId: string | null;
  activeFile: { id: string } | null;
  collaboration: CollaborationController;
  content: string;
  editorRef: RefObject<HTMLTextAreaElement | null>;
  isLargeDocument: boolean;
  largeFileHistoryGroupWindowMs: number;
  largeFileSyncDelayMs: number;
  maxHistoryEntries: number;
  onCommitContentAction: (
    documentId: string | null,
    nextContent: string
  ) => void;
  openDocuments: OpenMarkdownDocument[];
  setContentAction: (content: string) => void;
  shouldTrackPreviewSelection: boolean;
  syncPreviewContentAction: (
    nextValue: string,
    options?: { immediate?: boolean }
  ) => void;
};

export const useMarkdownEditorController = ({
  activeDocumentId,
  activeFile,
  collaboration,
  content,
  editorRef,
  isLargeDocument,
  largeFileHistoryGroupWindowMs,
  largeFileSyncDelayMs,
  maxHistoryEntries,
  onCommitContentAction,
  openDocuments,
  setContentAction,
  shouldTrackPreviewSelection,
  syncPreviewContentAction,
}: UseMarkdownEditorControllerParams) => {
  const [editorSelection, setEditorSelection] =
    useState<MarkdownViewerSelection | null>(null);
  const historyRef = useRef<Map<string, EditorHistoryState>>(new Map());
  const pendingSelectionRef = useRef<MarkdownViewerSelection | null>(null);
  const contentSyncTimeoutRef = useRef<number | null>(null);

  const clearPendingContentSync = useCallback(() => {
    if (contentSyncTimeoutRef.current) {
      window.clearTimeout(contentSyncTimeoutRef.current);
      contentSyncTimeoutRef.current = null;
    }
  }, []);

  const flushPendingEditorContent = useCallback(() => {
    clearPendingContentSync();

    const editorContent = editorRef.current?.value;

    if (typeof editorContent === "string" && editorContent !== content) {
      onCommitContentAction(activeDocumentId, editorContent);
    }

    return editorContent ?? content;
  }, [
    activeDocumentId,
    clearPendingContentSync,
    content,
    editorRef,
    onCommitContentAction,
  ]);

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
          currentHistory.entries[currentHistory.index] = {
            ...currentHistory.entries[currentHistory.index],
            selection: nextSelection,
          };
        }
      }

      if (!shouldTrackPreviewSelection) {
        if (collaboration.isActive) {
          collaboration.updateLocalSelection(nextSelection);
        }
        return;
      }

      if (collaboration.isActive) {
        collaboration.updateLocalSelection(nextSelection);
      }

      setEditorSelection((currentValue) =>
        currentValue?.start === nextSelection.start &&
        currentValue?.end === nextSelection.end
          ? currentValue
          : nextSelection
      );
    },
    [activeDocumentId, collaboration, shouldTrackPreviewSelection]
  );

  const handleEditorChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const nextValue = event.target.value;
      const documentId = activeDocumentId;
      const now = Date.now();
      const nextSelection = {
        start: event.target.selectionStart,
        end: event.target.selectionEnd,
      };

      if (collaboration.isActive) {
        syncPreviewContentAction(nextValue);
        collaboration.applyLocalContent(nextValue);
        collaboration.updateLocalSelection(nextSelection);
        if (shouldTrackPreviewSelection) {
          setEditorSelection(nextSelection);
        }
        return;
      }

      if (activeDocumentId) {
        const currentHistory = historyRef.current.get(activeDocumentId) ?? {
          entries: [],
          index: -1,
        };
        const activeEntry = currentHistory.entries[currentHistory.index];

        if (activeEntry?.content !== nextValue) {
          const shouldReplaceActiveEntry =
            isLargeDocument &&
            Boolean(activeEntry) &&
            currentHistory.index === currentHistory.entries.length - 1 &&
            now - (activeEntry?.timestamp ?? 0) <
              largeFileHistoryGroupWindowMs;

          if (shouldReplaceActiveEntry) {
            currentHistory.entries[currentHistory.index] = {
              content: nextValue,
              selection: nextSelection,
              timestamp: now,
            };
          } else {
            const nextEntries = currentHistory.entries.slice(
              0,
              currentHistory.index + 1
            );
            nextEntries.push({
              content: nextValue,
              selection: nextSelection,
              timestamp: now,
            });

            if (nextEntries.length > maxHistoryEntries) {
              nextEntries.splice(0, nextEntries.length - maxHistoryEntries);
            }

            historyRef.current.set(activeDocumentId, {
              entries: nextEntries,
              index: nextEntries.length - 1,
            });
          }
        }
      }

      clearPendingContentSync();
      syncPreviewContentAction(nextValue);

      if (!isLargeDocument) {
        startTransition(() => {
          onCommitContentAction(documentId, nextValue);
        });
        return;
      }

      contentSyncTimeoutRef.current = window.setTimeout(() => {
        startTransition(() => {
          onCommitContentAction(documentId, nextValue);
        });
        contentSyncTimeoutRef.current = null;
      }, largeFileSyncDelayMs);
    },
    [
      activeDocumentId,
      clearPendingContentSync,
      collaboration,
      isLargeDocument,
      largeFileHistoryGroupWindowMs,
      largeFileSyncDelayMs,
      maxHistoryEntries,
      onCommitContentAction,
      shouldTrackPreviewSelection,
      syncPreviewContentAction,
    ]
  );

  const clearEditorSelection = useCallback(() => {
    flushPendingEditorContent();
    setEditorSelection(null);
  }, [flushPendingEditorContent]);

  const undoAction = useCallback(() => {
    if (collaboration.isActive) {
      collaboration.undo();
      return;
    }

    clearPendingContentSync();

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
    syncPreviewContentAction(nextEntry.content, { immediate: true });
    startTransition(() => {
      setContentAction(nextEntry.content);
    });
  }, [
    activeDocumentId,
    clearPendingContentSync,
    collaboration,
    setContentAction,
    syncPreviewContentAction,
  ]);

  const redoAction = useCallback(() => {
    if (collaboration.isActive) {
      collaboration.redo();
      return;
    }

    clearPendingContentSync();

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
    syncPreviewContentAction(nextEntry.content, { immediate: true });
    startTransition(() => {
      setContentAction(nextEntry.content);
    });
  }, [
    activeDocumentId,
    clearPendingContentSync,
    collaboration,
    setContentAction,
    syncPreviewContentAction,
  ]);

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
              timestamp: Date.now(),
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
              timestamp: Date.now(),
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
    if (!shouldTrackPreviewSelection) {
      return;
    }

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
  }, [
    activeFile,
    content,
    editorRef,
    editorSelection,
    shouldTrackPreviewSelection,
    syncEditorSelection,
  ]);

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
    if (shouldTrackPreviewSelection) {
      setEditorSelection(pendingSelection);
    }
    pendingSelectionRef.current = null;
  }, [activeDocumentId, content, editorRef, shouldTrackPreviewSelection]);

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
  }, [activeFile, editorRef, syncEditorSelection]);

  useEffect(() => {
    return () => {
      if (contentSyncTimeoutRef.current) {
        window.clearTimeout(contentSyncTimeoutRef.current);
      }
    };
  }, []);

  return {
    clearEditorSelection,
    clearPendingContentSync,
    editorSelection,
    flushPendingEditorContent,
    handleEditorChange,
    redoAction,
    setEditorSelection,
    syncEditorSelection,
    undoAction,
  };
};
