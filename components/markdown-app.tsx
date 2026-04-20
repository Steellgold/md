"use client";

import { MarkdownAppActiveDocumentBridge } from "@/components/markdown-app-active-document-bridge";
import { MarkdownAppDialogsBridge } from "@/components/markdown-app-dialogs-bridge";
import { MarkdownAppEmptyHome } from "@/components/markdown-app-empty-home";
import { MarkdownAppMainView } from "@/components/markdown-app-main-view";
import { MarkdownAppModalLayer } from "@/components/markdown-app-modal-layer";
import { MarkdownBusyOverlay } from "@/components/markdown-busy-overlay";
import { MarkdownSharedViewer } from "@/components/markdown-shared-viewer";
import { Spinner } from "@/components/ui/spinner";
import { useMarkdownAppCollaborationSession } from "@/hooks/use-markdown-app-collaboration-session";
import { useMarkdownAppDerivedState } from "@/hooks/use-markdown-app-derived-state";
import { useMarkdownAppShellEffects } from "@/hooks/use-markdown-app-shell-effects";
import { useMarkdownCommandPaletteShortcut } from "@/hooks/use-markdown-command-palette-shortcut";
import { useMarkdownContentHash } from "@/hooks/use-markdown-content-hash";
import { useMarkdownDragDrop } from "@/hooks/use-markdown-drag-drop";
import { useMarkdownEditorActions } from "@/hooks/use-markdown-editor-actions";
import { useMarkdownEditorController } from "@/hooks/use-markdown-editor-controller";
import { useMarkdownHotkeys } from "@/hooks/use-markdown-hotkeys";
import { useMarkdownPreviewState } from "@/hooks/use-markdown-preview-state";
import { useMarkdownPreviewSynchronization } from "@/hooks/use-markdown-preview-synchronization";
import { useMarkdownRouteSync } from "@/hooks/use-markdown-route-sync";
import { useMarkdownShareFlow } from "@/hooks/use-markdown-share-flow";
import { useMarkdownShellActions } from "@/hooks/use-markdown-shell-actions";
import { useIsMobile } from "@/hooks/use-mobile";
import { useScrollSync } from "@/hooks/use-scroll-sync";
import {
  LARGE_FILE_HISTORY_GROUP_WINDOW_MS,
  LARGE_FILE_PREVIEW_SYNC_DELAY_MS,
  LARGE_FILE_SYNC_DELAY_MS,
  LARGE_FILE_THRESHOLD,
  MAX_HISTORY_ENTRIES,
} from "@/lib/markdown-app-constants";
import { buildEditRoute } from "@/lib/markdown-app-routing";
import { useMarkdownStore } from "@/lib/markdown-store";
import { useMarkdownUiStore } from "@/lib/markdown-ui-store";
import { cn } from "@/lib/utils";
import { faker } from "@faker-js/faker";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";

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
  const isMobile = useIsMobile();

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isOpenUrlDialogOpen, setIsOpenUrlDialogOpen] = useState(false);
  const [isSaveBusy, setIsSaveBusy] = useState(false);
  const [pendingRecentFileId, setPendingRecentFileId] = useState<string | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);

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

  const pendingRecentFile = recentFiles.find((file) => file.id === pendingRecentFileId) ?? null;

  const {
    activeDocumentStats,
    activeOpenDocument,
    canSaveActiveFile,
    collaborativeAvatarUrl,
    collaborativeUserName,
    internalLinkTargets,
    isSharedViewerMode,
    parsedCollabJoin,
    parsedDeepLink,
    routeDocumentId,
  } = useMarkdownAppDerivedState({
    activeDocumentId,
    activeFile,
    collaborationDisplayName,
    content,
    openDocuments,
    pathname,
    searchParamsKey,
    workspace,
  });

  const isWorkspaceDocument = activeFile?.source === "folder";

  useEffect(() => {
    const persistedUiSettings = window.localStorage.getItem(
      "markdown-app:user-settings"
    );

    if (persistedUiSettings) {
      return;
    }

    setViewMode(isMobile ? "editor" : "split");
  }, [isMobile, setViewMode]);
  useEffect(() => {
    if (!isMobile || !previewDetached) {
      return;
    }

    closePreviewDetached();
  }, [closePreviewDetached, isMobile, previewDetached]);

  const { contentHash, setContentHash } = useMarkdownContentHash({
    activeDocumentId,
    activeFile,
    content,
    editorRef,
  });

  useMarkdownAppShellEffects({
    activeFileName: activeFile?.name ?? null,
    collaborationDisplayName,
    error,
    hydrated,
    parsedCollabJoin,
    setCollaborationDisplayNameAction: setCollaborationDisplayName,
    setPreviewDetachedAction: setPreviewDetached,
    clearErrorAction: clearError,
    hydrateAction: hydrate,
    openScratchDocumentAction: openScratchDocument,
    uiError,
    setUiErrorAction: setUiError,
  });

  const {
    collabAccessMode,
    collabAuthToken,
    collabAutosaveEnabled,
    collabInviteToken,
    collabJoinUrl,
    collabPassword,
    collabRoomId,
    collaborationStartedAt,
    collaborateActionLabel,
    commitDocumentContent,
    collaboration,
    copyCollaborationLinkAction,
    isCollabBusy,
    isCollabDialogOpen,
    openCollabDialogAction,
    pendingJoinRoomId,
    resetCollabUnsavedTracking,
    setCollabAccessMode,
    setCollabAutosaveEnabled,
    setCollabInviteToken,
    setCollabPassword,
    setIsCollabDialogOpen,
    startCollaborationAction,
    stopCollaborationAction,
  } = useMarkdownAppCollaborationSession({
    activeDocumentId,
    activeOpenDocument,
    activeFile,
    canSaveActiveFile,
    collaborativeAvatarUrl,
    collaborativeUserName,
    content,
    editorRef,
    parsedCollabJoin,
    setContentAction: setContent,
    setDocumentCollaborationAction: setDocumentCollaboration,
    setDocumentContentAction: setDocumentContent,
    setUiErrorAction: setUiError,
    syncPreviewContentAction: syncPreviewContent,
  });

  const isPageBusy = (isBusy && busyMessage !== null) || isCollabBusy;
  const effectiveBusyMessage = busyMessage ?? (isCollabBusy ? "Connecting..." : null);

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
    parsedCollabJoin,
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

  const { handleEditorScroll, handlePreviewScroll, syncPreviewToEditor } =
    useScrollSync({
      syncScrollEnabled,
      editorRef,
      previewRef,
    });

  useMarkdownCommandPaletteShortcut({
    enabled: !isSharedViewerMode,
    onOpenAction: () => setIsCommandPaletteOpen(true),
  });

  useMarkdownPreviewSynchronization({
    activeDocumentId,
    activeFilePresent: Boolean(activeFile),
    content,
    editorRef,
    isPreviewVisible,
    previewDetached,
    syncPreviewContent,
    syncPreviewToEditor,
    syncScrollEnabled,
    viewMode,
  });

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
      <MarkdownAppMainView
        activeFilePresent={Boolean(activeFile)}
        isSharedViewerMode={isSharedViewerMode}
        sharedViewer={
          activeFile ? (
            <MarkdownSharedViewer
              activeFile={activeFile}
              content={previewContent}
              isBusy={isBusy}
              previewRef={previewRef}
              editLocallyAction={() => {
                void editSharedFileLocallyAction();
              }}
            />
          ) : null
        }
        activeDocumentView={
          activeFile ? (
            <MarkdownAppActiveDocumentBridge
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
          ) : null
        }
        emptyHomeView={
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
        }
      />
      <MarkdownAppModalLayer
        busyOverlay={
          <MarkdownBusyOverlay
            activeFilePresent={Boolean(activeFile)}
            message={effectiveBusyMessage}
            pendingRecentFilePresent={Boolean(pendingRecentFile)}
            visible={isPageBusy}
          />
        }
        dialogs={
          <MarkdownAppDialogsBridge
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
        }
      />
    </div>
  );
};
