"use client";

import { MarkdownActiveDocument } from "@/components/markdown-active-document";
import { MarkdownAppDialogs } from "@/components/markdown-app-dialogs";
import { MarkdownAppEmptyHome } from "@/components/markdown-app-empty-home";
import { MarkdownBusyOverlay } from "@/components/markdown-busy-overlay";
import { MarkdownSharedViewer } from "@/components/markdown-shared-viewer";
import { Spinner } from "@/components/ui/spinner";
import { useMarkdownDragDrop } from "@/hooks/use-markdown-drag-drop";
import { useMarkdownHotkeys } from "@/hooks/use-markdown-hotkeys";
import { useMarkdownCollaboration } from "@/hooks/use-markdown-collaboration";
import { useMarkdownEditorActions } from "@/hooks/use-markdown-editor-actions";
import { useMarkdownEditorController } from "@/hooks/use-markdown-editor-controller";
import { useMarkdownPreviewState } from "@/hooks/use-markdown-preview-state";
import { useMarkdownCollabFlow } from "@/hooks/use-markdown-collab-flow";
import { useMarkdownRouteSync } from "@/hooks/use-markdown-route-sync";
import { useMarkdownShellActions } from "@/hooks/use-markdown-shell-actions";
import { useMarkdownShareFlow } from "@/hooks/use-markdown-share-flow";
import { useScrollSync } from "@/hooks/use-scroll-sync";
import { extractMarkdownDeepLink } from "@/lib/markdown-deep-link";
import { parseCollaborationJoinParams } from "@/lib/markdown-collaboration";
import { getMarkdownDocumentStats } from "@/lib/markdown-helpers";
import {
  computeMarkdownContentHash,
  isMarkdownShareDirectUrl,
} from "@/lib/markdown-share";
import { useMarkdownStore } from "@/lib/markdown-store";
import { useMarkdownUiStore } from "@/lib/markdown-ui-store";
import { cn } from "@/lib/utils";
import { faker } from "@faker-js/faker";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

const defaultDocumentTitle = ".MD";
const LARGE_FILE_THRESHOLD = 20_000;
const LARGE_FILE_SYNC_DELAY_MS = 180;
const LARGE_FILE_PREVIEW_SYNC_DELAY_MS = 80;
const LARGE_FILE_HISTORY_GROUP_WINDOW_MS = 800;
const MAX_HISTORY_ENTRIES = 100;
const COLLAB_AUTOSAVE_DEBOUNCE_MS = 1200;
const COLLAB_SAVE_REMINDER_AFTER_MS = 2.5 * 60 * 1000;
const COLLAB_SAVE_REMINDER_CHANGE_THRESHOLD = 100;
const editPathPrefix = "/edit/";

const decodePathSegment = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const getRouteDocumentId = (pathname: string) => {
  if (!pathname.startsWith(editPathPrefix)) {
    return null;
  }

  const rawDocumentId = pathname.slice(editPathPrefix.length).split("/")[0] ?? "";
  const normalizedDocumentId = decodePathSegment(rawDocumentId).trim();

  return normalizedDocumentId === "" ? null : normalizedDocumentId;
};

const buildEditRoute = (documentId: string) =>
  `${editPathPrefix}${encodeURIComponent(documentId)}`;

export const MarkdownApp = () => {
  const {
    openDocuments,
    activeDocumentId,
    content,
    activeFile,
    workspace,
    pendingRemoteOpen,
    recentFiles,
    hydrated,
    isBusy,
    busyMessage,
    error,
    canPersistFiles,
    hydrate,
    clearError,
    setContent,
    setDocumentContent,
    openFolder,
    openWorkspacePageByPath,
    openWithPicker,
    openFromUrl,
    openDeepLinkUrl,
    openDroppedFiles,
    openPendingRemoteFile,
    reopenRecentFile,
    createNewFile,
    openScratchDocument,
    createLocalCopyOfActiveFile,
    saveActiveFile,
    setDocumentShare,
    setDocumentCollaboration,
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
  const collaborationDisplayName = useMarkdownUiStore(
    (state) => state.collaborationDisplayName
  );

  const setViewMode = useMarkdownUiStore((state) => state.setViewMode);
  const setCollaborationDisplayName = useMarkdownUiStore(
    (state) => state.setCollaborationDisplayName
  );

  const toggleSyncScroll = useMarkdownUiStore(
    (state) => state.toggleSyncScroll
  );

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isOpenUrlDialogOpen, setIsOpenUrlDialogOpen] = useState(false);
  const [isSaveBusy, setIsSaveBusy] = useState(false);
  const [pendingRecentFileId, setPendingRecentFileId] = useState<string | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);
  const [contentHash, setContentHash] = useState<string | null>(null);
  const [collabUnsavedChangeCount, setCollabUnsavedChangeCount] = useState(0);
  const [collabUnsavedSince, setCollabUnsavedSince] = useState<string | null>(
    null
  );

  const collabAutosaveTimeoutRef = useRef<number | null>(null);
  const collabAutosaveInFlightRef = useRef(false);
  const collabAutosaveQueuedRef = useRef(false);
  const collabSaveReminderShownRef = useRef(false);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const searchParamsKey = searchParams.toString();
  const isLargeDocument = content.length >= LARGE_FILE_THRESHOLD;
  const {
    closePreviewDetached,
    isPreviewVisible,
    previewContent,
    previewDetached,
    setPreviewDetached,
    syncPreviewContent,
  } = useMarkdownPreviewState({
    content,
    isLargeDocument,
    largeFilePreviewSyncDelayMs: LARGE_FILE_PREVIEW_SYNC_DELAY_MS,
    viewMode,
  });
  const shouldTrackPreviewSelection =
    !isLargeDocument && (previewDetached || viewMode !== "editor");
  const deferredStatsContent = useDeferredValue(content);

  const activeDocumentStats = useMemo(
    () => getMarkdownDocumentStats(deferredStatsContent),
    [deferredStatsContent]
  );

  const pendingRecentFile = recentFiles.find((file) => file.id === pendingRecentFileId) ?? null;
  const activeOpenDocument = useMemo(
    () =>
      openDocuments.find((document) => document.id === activeDocumentId) ?? null,
    [activeDocumentId, openDocuments]
  );
  const isWorkspaceDocument = activeFile?.source === "folder";
  const internalLinkTargets = useMemo(() => {
    if (!workspace || !activeFile?.relativePath) {
      return [] as string[];
    }

    return workspace.pages
      .map((page) => page.relativePath)
      .filter((relativePath) => relativePath !== activeFile.relativePath);
  }, [activeFile?.relativePath, workspace]);
  const canSaveActiveFile =
    activeFile?.source === "picker" ||
    activeFile?.source === "drop" ||
    activeFile?.source === "folder";
  const isSharedViewerMode =
    activeFile?.source === "url" && isMarkdownShareDirectUrl(activeFile.url);

  const parsedDeepLink = useMemo(
    () =>
      extractMarkdownDeepLink(pathname, new URLSearchParams(searchParamsKey)),
    [pathname, searchParamsKey]
  );
  const routeDocumentId = useMemo(() => getRouteDocumentId(pathname), [pathname]);
  const parsedCollabJoin = useMemo(
    () => parseCollaborationJoinParams(new URLSearchParams(searchParamsKey)),
    [searchParamsKey]
  );
  const collaborativeUserName = useMemo(
    () => collaborationDisplayName.trim() || "Anonymous",
    [collaborationDisplayName]
  );
  const collaborativeAvatarUrl = useMemo(
    () =>
      `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(
        collaborativeUserName
      )}`,
    [collaborativeUserName]
  );

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (collaborationDisplayName.trim() !== "") {
      return;
    }

    setCollaborationDisplayName(faker.person.fullName());
  }, [collaborationDisplayName, setCollaborationDisplayName]);

  useEffect(() => {
    return () => {
      if (collabAutosaveTimeoutRef.current) {
        window.clearTimeout(collabAutosaveTimeoutRef.current);
      }
    };
  }, []);

  const resetCollabUnsavedTracking = useCallback(() => {
    setCollabUnsavedChangeCount(0);
    setCollabUnsavedSince(null);
    collabSaveReminderShownRef.current = false;
  }, []);

  const {
    collabAccessMode,
    collabAuthToken,
    collabAutosaveEnabled,
    collabInviteToken,
    collabJoinUrl,
    collabPassword,
    collabRoomId,
    collabWsBaseUrl,
    collaborationStartedAt,
    copyCollaborationLinkAction,
    isCollabBusy,
    isCollabDialogOpen,
    openCollabDialogAction,
    pendingJoinRoomId,
    setCollabAccessMode,
    setCollabAutosaveEnabled,
    setCollabInviteToken,
    setCollabPassword,
    setIsCollabDialogOpen,
    startCollaborationAction,
    stopCollaborationAction,
  } = useMarkdownCollabFlow({
    activeFile,
    canSaveActiveFile,
    onErrorAction: setUiError,
    onResetUnsavedTrackingAction: resetCollabUnsavedTracking,
    onSetDocumentCollaborationAction: setDocumentCollaboration,
    parsedCollabJoin,
  });
  const isPageBusy = (isBusy && busyMessage !== null) || isCollabBusy;
  const effectiveBusyMessage = busyMessage ?? (isCollabBusy ? "Connecting..." : null);
  const collaborateActionLabel = collabAuthToken ? "Collaborating" : "Collaborate";

  const canCollaborativeAutosave =
    Boolean(collabAuthToken) && collabAutosaveEnabled && canSaveActiveFile;

  const runCollabAutosave = useCallback(async () => {
    if (!canCollaborativeAutosave || !activeFile) {
      return;
    }

    if (collabAutosaveInFlightRef.current) {
      collabAutosaveQueuedRef.current = true;
      return;
    }

    collabAutosaveInFlightRef.current = true;

    try {
      const nextContent = editorRef.current?.value ?? content;

      if (nextContent !== content) {
        if (activeDocumentId) {
          setDocumentContent(activeDocumentId, nextContent);
        } else {
          setContent(nextContent);
        }
      }

      await saveActiveFile({ silent: true });

      if (!useMarkdownStore.getState().error) {
        resetCollabUnsavedTracking();
      }
    } finally {
      collabAutosaveInFlightRef.current = false;

      if (collabAutosaveQueuedRef.current) {
        collabAutosaveQueuedRef.current = false;
        void runCollabAutosave();
      }
    }
  }, [
    activeDocumentId,
    activeFile,
    canCollaborativeAutosave,
    content,
    resetCollabUnsavedTracking,
    saveActiveFile,
    setContent,
    setDocumentContent,
  ]);

  const scheduleCollabAutosave = useCallback(() => {
    if (!canCollaborativeAutosave) {
      return;
    }

    if (collabAutosaveTimeoutRef.current) {
      window.clearTimeout(collabAutosaveTimeoutRef.current);
    }

    collabAutosaveTimeoutRef.current = window.setTimeout(() => {
      collabAutosaveTimeoutRef.current = null;
      void runCollabAutosave();
    }, COLLAB_AUTOSAVE_DEBOUNCE_MS);
  }, [canCollaborativeAutosave, runCollabAutosave]);

  const collaboration = useMarkdownCollaboration({
    enabled: Boolean(activeFile && collabRoomId && collabWsBaseUrl && collabAuthToken),
    roomId: collabRoomId || null,
    wsBaseUrl: collabWsBaseUrl,
    authToken: collabAuthToken,
    userName: collaborativeUserName,
    userAvatarUrl: collaborativeAvatarUrl,
    initialContent: content,
    onContentChange: (nextContent) => {
      startTransition(() => {
        if (activeDocumentId) {
          setDocumentContent(activeDocumentId, nextContent);
          return;
        }

        setContent(nextContent);
      });
      syncPreviewContent(nextContent, { immediate: true });

      if (!canSaveActiveFile) {
        return;
      }

      if (collabAutosaveEnabled) {
        scheduleCollabAutosave();
        return;
      }

      setCollabUnsavedChangeCount((currentValue) => currentValue + 1);
      setCollabUnsavedSince((currentValue) =>
        currentValue ?? new Date().toISOString()
      );
    },
  });

  const commitDocumentContent = useCallback(
    (documentId: string | null, nextContent: string) => {
      if (documentId) {
        setDocumentContent(documentId, nextContent);
        return;
      }

      setContent(nextContent);
    },
    [setContent, setDocumentContent]
  );

  const {
    clearEditorSelection,
    editorSelection,
    flushPendingEditorContent,
    handleEditorChange,
    redoAction,
    syncEditorSelection,
    undoAction,
  } = useMarkdownEditorController({
    activeDocumentId,
    activeFile,
    collaboration,
    content,
    editorRef,
    isLargeDocument,
    largeFileHistoryGroupWindowMs: LARGE_FILE_HISTORY_GROUP_WINDOW_MS,
    largeFileSyncDelayMs: LARGE_FILE_SYNC_DELAY_MS,
    maxHistoryEntries: MAX_HISTORY_ENTRIES,
    onCommitContentAction: commitDocumentContent,
    openDocuments,
    setContentAction: setContent,
    shouldTrackPreviewSelection,
    syncPreviewContentAction: syncPreviewContent,
  });

  const deferredPreviewSelection = useDeferredValue(
    shouldTrackPreviewSelection ? editorSelection : null
  );

  const {
    copyShareUrlAction,
    isShareBusy,
    isShareDialogOpen,
    openShareDialogAction,
    removeSharePasswordAction,
    setIsShareDialogOpen,
    setSharePassword,
    shareActionLabel,
    shareActiveFileAction,
    shareDialogSubmitLabel,
    shareDialogUrl,
    sharePassword,
  } = useMarkdownShareFlow({
    activeFile,
    contentHash,
    flushPendingEditorContentAction: flushPendingEditorContent,
    onErrorAction: setUiError,
    onShareUpdatedAction: (documentId, share, nextHash) => {
      if (!share) {
        return;
      }

      setDocumentShare(documentId, share);
      setContentHash(nextHash);
    },
  });

  const { clearPendingRouteAttempt } = useMarkdownRouteSync({
    activeDocumentId,
    activeFilePresent: Boolean(activeFile),
    buildEditRouteAction: buildEditRoute,
    clearErrorAction: clearError,
    hydrated,
    isWorkspaceDocument,
    onOpenDeepLinkUrlAction: openDeepLinkUrl,
    onOpenRouteDocumentAction: reopenRecentFile,
    onSetActiveDocumentAction: setActiveDocument,
    openDocuments,
    pathname,
    parsedDeepLink,
    routeDocumentId,
    router,
    storeError: error,
  });
  const {
    clearDocumentAction,
    closeDocumentAction,
    editSharedFileLocallyAction,
    goHomeAction,
    handleRefresh,
    openFolderAction,
    openRecentFileAction,
    openWorkspacePageAction,
    saveActiveFileAction,
    setActiveDocumentAction,
    showCommandPalette,
    showOpenUrlDialog,
  } = useMarkdownShellActions({
    activeFile: activeFile ? { id: activeFile.id, name: activeFile.name } : null,
    clearDocumentAction: clearDocument,
    clearErrorAction: clearError,
    clearPendingRouteAttemptAction: clearPendingRouteAttempt,
    closeDocumentInputAction: closeDocument,
    createLocalCopyOfActiveFileAction: createLocalCopyOfActiveFile,
    flushPendingEditorContentAction: flushPendingEditorContent,
    goHomeInputAction: goHome,
    onErrorAction: setUiError,
    openFolderInputAction: openFolder,
    openWorkspacePageByPathAction: openWorkspacePageByPath,
    reopenRecentFileAction: reopenRecentFile,
    router,
    saveActiveFileInputAction: saveActiveFile,
    setActiveDocumentInputAction: setActiveDocument,
    setCommandPaletteOpenAction: setIsCommandPaletteOpen,
    setOpenUrlDialogOpenAction: setIsOpenUrlDialogOpen,
    setPendingRecentFileIdAction: setPendingRecentFileId,
    setSaveBusyAction: setIsSaveBusy,
    onResetCollabUnsavedTrackingAction: resetCollabUnsavedTracking,
  });
  const {
    alphaListAction,
    boldAction,
    bulletListAction,
    codeBlockAction,
    exportHtmlFile,
    exportMarkdownFile,
    headingAction,
    inlineCodeAction,
    insertExternalLinkAction,
    insertInternalLinkToPathAction,
    insertTableAction,
    italicAction,
    openInternalPreviewLinkAction,
    orderedListAction,
    taskListAction,
  } = useMarkdownEditorActions({
    activeFile: activeFile
      ? {
          name: activeFile.name,
          relativePath: activeFile.relativePath,
        }
      : null,
    editorRef,
    flushPendingEditorContentAction: flushPendingEditorContent,
    onErrorAction: setUiError,
    openWorkspacePageByPathAction: openWorkspacePageByPath,
    workspacePresent: Boolean(workspace),
  });
  const { handleDragLeave, handleDragOver, handleDrop, isDragActive } =
    useMarkdownDragDrop({
      openDroppedFilesAction: openDroppedFiles,
    });

  useEffect(() => {
    if (!hydrated || !parsedCollabJoin || activeFile) {
      return;
    }

    openScratchDocument(parsedCollabJoin.fileName ?? "Collaborative document.md");
  }, [activeFile, hydrated, openScratchDocument, parsedCollabJoin]);

  useEffect(() => {
    document.title = activeFile
      ? `${activeFile.name} | ${defaultDocumentTitle}`
      : defaultDocumentTitle;
  }, [activeFile]);

  useEffect(() => {
    if (!activeFile) {
      setTimeout(() => setPreviewDetached(false), 0);
    }
  }, [activeFile, setPreviewDetached]);

  useEffect(() => {
    if (!collabAuthToken) {
      if (collabAutosaveTimeoutRef.current) {
        window.clearTimeout(collabAutosaveTimeoutRef.current);
        collabAutosaveTimeoutRef.current = null;
      }
      collabAutosaveQueuedRef.current = false;
      collabAutosaveInFlightRef.current = false;
      resetCollabUnsavedTracking();
      return;
    }
  }, [collabAuthToken, resetCollabUnsavedTracking]);

  useEffect(() => {
    if (!canCollaborativeAutosave) {
      if (collabAutosaveTimeoutRef.current) {
        window.clearTimeout(collabAutosaveTimeoutRef.current);
        collabAutosaveTimeoutRef.current = null;
      }
      return;
    }

    if (activeOpenDocument?.isDirty) {
      scheduleCollabAutosave();
    }
  }, [activeOpenDocument?.isDirty, canCollaborativeAutosave, scheduleCollabAutosave]);

  useEffect(() => {
    if (
      !collabAuthToken ||
      !canSaveActiveFile ||
      collabAutosaveEnabled ||
      !collabUnsavedSince
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (collabSaveReminderShownRef.current) {
        return;
      }

      const elapsed =
        Date.now() - new Date(collabUnsavedSince).getTime();

      if (
        elapsed < COLLAB_SAVE_REMINDER_AFTER_MS ||
        collabUnsavedChangeCount < COLLAB_SAVE_REMINDER_CHANGE_THRESHOLD
      ) {
        return;
      }

      collabSaveReminderShownRef.current = true;
      toast.warning("Unsaved collaborative changes", {
        description:
          "You have many unsaved collaboration edits. Save now to persist your local file.",
      });
    }, 15_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    canSaveActiveFile,
    collabAuthToken,
    collabAutosaveEnabled,
    collabUnsavedChangeCount,
    collabUnsavedSince,
  ]);

  useEffect(() => {
    if (!activeFile) {
      setContentHash(null);
      return;
    }

    let cancelled = false;
    const nextContent = editorRef.current?.value ?? content;

    void computeMarkdownContentHash(nextContent)
      .then((nextHash) => {
        if (!cancelled) {
          setContentHash(nextHash);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setContentHash(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeDocumentId, activeFile, content]);

  useEffect(() => {
    const nextPreviewContent = isPreviewVisible
      ? (editorRef.current?.value ?? content)
      : content;

    syncPreviewContent(nextPreviewContent, { immediate: true });
  }, [activeDocumentId, content, isPreviewVisible, syncPreviewContent]);

  useEffect(() => {
    if (isSharedViewerMode) {
      return;
    }

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
  }, [isSharedViewerMode]);

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

  const regenerateCollaborationDisplayNameAction = useCallback(() => {
    setCollaborationDisplayName(faker.person.fullName());
  }, [setCollaborationDisplayName]);

  useMarkdownHotkeys({
    enabled: Boolean(activeFile) && !isSharedViewerMode,
    saveEnabled: canSaveActiveFile,
    onSaveAction: saveActiveFileAction,
    onOpenSwitcherAction: () => setIsCommandPaletteOpen(true),
    onUndoAction: undoAction,
    onRedoAction: redoAction,
    editorRef,
  });

  const togglePreviewDetached = useCallback(() => {
    setUiError(null);
    setPreviewDetached((currentValue) => !currentValue);
  }, [setPreviewDetached]);

  useEffect(() => {
    if (!error) {
      return;
    }

    toast.error(error);
    clearError();
  }, [clearError, error]);

  useEffect(() => {
    if (!uiError) {
      return;
    }

    toast.error(uiError);
    setUiError(null);
  }, [uiError]);

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
      {activeFile && isSharedViewerMode ? (
        <MarkdownSharedViewer
          activeFile={activeFile}
          content={previewContent}
          isBusy={isBusy}
          previewRef={previewRef}
          editLocallyAction={() => {
            void editSharedFileLocallyAction();
          }}
        />
      ) : activeFile ? (
        <MarkdownActiveDocument
          activeFile={activeFile}
          openDocuments={openDocuments}
          activeDocumentId={activeDocumentId}
          recentFiles={recentFiles}
          isBusy={isBusy || isShareBusy}
          content={content}
          stats={activeDocumentStats}
          workspace={workspace}
          previewContent={previewContent}
          editorRef={editorRef}
          previewRef={previewRef}
          onEditorChange={handleEditorChange}
          onEditorBlur={clearEditorSelection}
          onEditorSelectionChange={syncEditorSelection}
          onEditorScroll={handleEditorScroll}
          collaboratorSelections={collaboration.participants}
          onPreviewScroll={handlePreviewScroll}
          onOpenInternalLinkAction={
            workspace && activeFile?.relativePath
              ? openInternalPreviewLinkAction
              : undefined
          }
          previewSelection={deferredPreviewSelection}
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
          goHomeAction={goHomeAction}
          saveFileAction={saveActiveFileAction}
          saveFileBusy={isSaveBusy}
          shareActionLabel={shareActionLabel}
          shareFileAction={openShareDialogAction}
          collaborateActionLabel={collaborateActionLabel}
          collaborateFileAction={openCollabDialogAction}
          collaborationActive={Boolean(collabAuthToken)}
          collaborationStartedAt={collaborationStartedAt}
          displayName={collaborativeUserName}
          onDisplayNameChangeAction={setCollaborationDisplayName}
          onGenerateDisplayNameAction={
            regenerateCollaborationDisplayNameAction
          }
          collaborators={collaboration.participants}
          collaborationConnected={collaboration.isConnected}
          refreshFileAction={handleRefresh}
          clearDocumentAction={clearDocumentAction}
          setActiveDocumentAction={setActiveDocumentAction}
          openWorkspacePageAction={openWorkspacePageAction}
          closeDocumentAction={closeDocumentAction}
          openRecentAction={openRecentFileAction}
          clearRecentAction={clearRecentFiles}
          undoAction={undoAction}
          redoAction={redoAction}
          boldAction={boldAction}
          italicAction={italicAction}
          headingAction={headingAction}
          inlineCodeAction={inlineCodeAction}
          codeBlockAction={codeBlockAction}
          bulletListAction={bulletListAction}
          orderedListAction={orderedListAction}
          alphaListAction={alphaListAction}
          taskListAction={taskListAction}
          insertTableAction={insertTableAction}
          internalLinkTargets={internalLinkTargets}
          insertInternalLinkAction={insertInternalLinkToPathAction}
          insertExternalLinkAction={insertExternalLinkAction}
        />
      ) : (
        <MarkdownAppEmptyHome
          canPersistFiles={canPersistFiles}
          createNewAction={() => {
            void createNewFile();
          }}
          isBusy={isBusy}
          isDragActive={isDragActive}
          openFileAction={openWithPicker}
          openFolderAction={openFolderAction}
          openRecentAction={openRecentFileAction}
          openingRecentFileId={pendingRecentFileId}
          recentFiles={recentFiles}
          removeRecentAction={removeRecentFile}
          clearRecentAction={clearRecentFiles}
          showCommandPaletteAction={showCommandPalette}
          showOpenUrlDialogAction={showOpenUrlDialog}
        />
      )}

      <MarkdownBusyOverlay
        activeFilePresent={Boolean(activeFile)}
        message={effectiveBusyMessage}
        pendingRecentFilePresent={Boolean(pendingRecentFile)}
        visible={isPageBusy}
      />

      <MarkdownAppDialogs
        activeDocumentId={activeDocumentId}
        activeFileName={activeFile?.name ?? null}
        canSaveActiveFile={Boolean(!pendingJoinRoomId && canSaveActiveFile)}
        clearPendingRemoteOpenAction={clearPendingRemoteOpen}
        clearDocumentAction={clearDocumentAction}
        collabAccessMode={collabAccessMode}
        collabAutosaveEnabled={collabAutosaveEnabled}
        collabInviteToken={collabInviteToken}
        collabJoinUrl={collabJoinUrl}
        collabPassword={collabPassword}
        collabRoomId={collabRoomId}
        collaborationConnected={collaboration.isConnected}
        collaborationParticipantsCount={collaboration.participants.length}
        createNewAction={() => {
          void createNewFile();
        }}
        exportHtmlAction={exportHtmlFile}
        exportMarkdownAction={exportMarkdownFile}
        goHomeAction={goHomeAction}
        hasActiveFile={Boolean(activeFile)}
        hasProtectedShare={Boolean(activeFile?.share?.requiresPassword)}
        insertInternalLinkAction={insertInternalLinkToPathAction}
        internalLinkTargets={internalLinkTargets}
        isBusy={isBusy}
        isCollabBusy={isCollabBusy}
        isCollabDialogOpen={isCollabDialogOpen}
        isCommandPaletteOpen={isCommandPaletteOpen}
        isOpenUrlDialogOpen={isOpenUrlDialogOpen}
        isShareBusy={isShareBusy}
        isShareDialogOpen={isShareDialogOpen}
        onAccessModeChangeAction={setCollabAccessMode}
        onAutosaveEnabledChangeAction={setCollabAutosaveEnabled}
        onCollabDialogOpenChangeAction={setIsCollabDialogOpen}
        onCollabInviteTokenChangeAction={setCollabInviteToken}
        onCollabPasswordChangeAction={setCollabPassword}
        onCopyCollaborationLinkAction={() => {
          void copyCollaborationLinkAction();
        }}
        onCopyShareAction={() => {
          void copyShareUrlAction();
        }}
        onOpenRecentAction={openRecentFileAction}
        onOpenUrlDialogChangeAction={setIsOpenUrlDialogOpen}
        onRemoveSharePasswordAction={() => {
          void removeSharePasswordAction();
        }}
        onShareDialogOpenChangeAction={(open) => {
          setIsShareDialogOpen(open);
          if (!open) {
            setSharePassword("");
          }
        }}
        onSharePasswordChangeAction={setSharePassword}
        onShareSubmitAction={() => {
          void shareActiveFileAction();
        }}
        onStartCollaborationAction={() => {
          void startCollaborationAction();
        }}
        onStopCollaborationAction={stopCollaborationAction}
        openDocuments={openDocuments}
        openFileAction={() => {
          void openWithPicker();
        }}
        openFolderAction={openFolderAction}
        openPendingRemoteFileAction={(fileName, password) => {
          void openPendingRemoteFile(fileName, password);
        }}
        openUrlAction={openFromUrl}
        pendingRemoteFiles={pendingRemoteOpen?.files ?? []}
        pendingRemotePasswordRequired={Boolean(pendingRemoteOpen?.passwordRequired)}
        recentFiles={recentFiles}
        refreshFileAction={() => {
          void handleRefresh();
        }}
        saveFileAction={() => {
          void saveActiveFileAction();
        }}
        setActiveDocumentAction={setActiveDocumentAction}
        setCommandPaletteOpenAction={setIsCommandPaletteOpen}
        setViewModeAction={setViewMode}
        shareActionLabel={shareActionLabel}
        shareDialogSubmitLabel={shareDialogSubmitLabel}
        shareFileAction={openShareDialogAction}
        sharePassword={sharePassword}
        shareUrl={shareDialogUrl}
        showOpenUrlDialogAction={showOpenUrlDialog}
        viewMode={viewMode}
      />
    </div>
  );
};
