"use client";

import { getUnknownErrorMessage } from "@/lib/markdown-helpers";
import { useCallback } from "react";
import { toast } from "sonner";

type UseMarkdownShellActionsParams = {
  activeFile: {
    id: string;
    name: string;
  } | null;
  clearDocumentAction: () => void;
  clearErrorAction: () => void;
  clearPendingRouteAttemptAction: () => void;
  closeDocumentInputAction: (id: string) => void;
  createLocalCopyOfActiveFileAction: () => Promise<void>;
  flushPendingEditorContentAction: () => string;
  goHomeInputAction: () => void;
  onErrorAction: (message: string) => void;
  openFolderInputAction: () => Promise<void>;
  openWorkspacePageByPathAction: (relativePath: string) => Promise<boolean>;
  reopenRecentFileAction: (id: string) => Promise<void>;
  router: {
    replace: (href: string, options?: { scroll?: boolean }) => void;
  };
  saveActiveFileInputAction: (options?: { silent?: boolean }) => Promise<void>;
  setActiveDocumentInputAction: (id: string) => void;
  setCommandPaletteOpenAction: (open: boolean) => void;
  setOpenUrlDialogOpenAction: (open: boolean) => void;
  setPendingRecentFileIdAction: (
    value: string | null | ((currentValue: string | null) => string | null)
  ) => void;
  setSaveBusyAction: (busy: boolean) => void;
  onResetCollabUnsavedTrackingAction: () => void;
};

export const useMarkdownShellActions = ({
  activeFile,
  clearDocumentAction,
  clearErrorAction,
  clearPendingRouteAttemptAction,
  closeDocumentInputAction,
  createLocalCopyOfActiveFileAction,
  flushPendingEditorContentAction,
  goHomeInputAction,
  onErrorAction,
  openFolderInputAction,
  openWorkspacePageByPathAction,
  reopenRecentFileAction,
  router,
  saveActiveFileInputAction,
  setActiveDocumentInputAction,
  setCommandPaletteOpenAction,
  setOpenUrlDialogOpenAction,
  setPendingRecentFileIdAction,
  setSaveBusyAction,
  onResetCollabUnsavedTrackingAction,
}: UseMarkdownShellActionsParams) => {
  const handleRefresh = useCallback(async () => {
    flushPendingEditorContentAction();

    if (!activeFile) {
      return;
    }

    clearErrorAction();
    await reopenRecentFileAction(activeFile.id);
    if (!activeFile) {
      return;
    }

    toast.success("File reopened.", {
      description: activeFile.name,
    });
  }, [activeFile, clearErrorAction, flushPendingEditorContentAction, reopenRecentFileAction]);

  const openRecentFileAction = useCallback(
    (id: string) => {
      if (!activeFile) {
        setPendingRecentFileIdAction(id);
      }

      clearErrorAction();

      void reopenRecentFileAction(id).finally(() => {
        setPendingRecentFileIdAction((currentValue) =>
          currentValue === id ? null : currentValue
        );
      });
    },
    [activeFile, clearErrorAction, reopenRecentFileAction, setPendingRecentFileIdAction]
  );

  const saveActiveFileAction = useCallback(async () => {
    flushPendingEditorContentAction();
    clearErrorAction();
    setSaveBusyAction(true);
    try {
      await saveActiveFileInputAction({ silent: true });
      if (activeFile) {
        onResetCollabUnsavedTrackingAction();
        toast.success("File saved.", {
          description: activeFile.name,
        });
      }
    } finally {
      setSaveBusyAction(false);
    }
  }, [
    activeFile,
    clearErrorAction,
    flushPendingEditorContentAction,
    onResetCollabUnsavedTrackingAction,
    saveActiveFileInputAction,
    setSaveBusyAction,
  ]);

  const editSharedFileLocallyAction = useCallback(async () => {
    flushPendingEditorContentAction();
    await createLocalCopyOfActiveFileAction();
  }, [createLocalCopyOfActiveFileAction, flushPendingEditorContentAction]);

  const goHomeAction = useCallback(() => {
    clearPendingRouteAttemptAction();
    flushPendingEditorContentAction();
    goHomeInputAction();
    router.replace("/", { scroll: false });
  }, [clearPendingRouteAttemptAction, flushPendingEditorContentAction, goHomeInputAction, router]);

  const clearDocumentShellAction = useCallback(() => {
    flushPendingEditorContentAction();
    clearDocumentAction();
  }, [clearDocumentAction, flushPendingEditorContentAction]);

  const openWorkspacePageAction = useCallback(
    (relativePath: string) => {
      flushPendingEditorContentAction();
      void openWorkspacePageByPathAction(relativePath);
    },
    [flushPendingEditorContentAction, openWorkspacePageByPathAction]
  );

  const setActiveDocumentAction = useCallback(
    (id: string) => {
      flushPendingEditorContentAction();
      setActiveDocumentInputAction(id);
    },
    [flushPendingEditorContentAction, setActiveDocumentInputAction]
  );

  const closeDocumentAction = useCallback(
    (id: string) => {
      flushPendingEditorContentAction();
      closeDocumentInputAction(id);
    },
    [closeDocumentInputAction, flushPendingEditorContentAction]
  );

  const showCommandPalette = useCallback(() => {
    setCommandPaletteOpenAction(true);
  }, [setCommandPaletteOpenAction]);

  const showOpenUrlDialog = useCallback(() => {
    setCommandPaletteOpenAction(false);
    setOpenUrlDialogOpenAction(true);
  }, [setCommandPaletteOpenAction, setOpenUrlDialogOpenAction]);

  const openFolderAction = useCallback(() => {
    setCommandPaletteOpenAction(false);
    clearErrorAction();
    void openFolderInputAction().catch((error) => {
      onErrorAction(getUnknownErrorMessage(error));
    });
  }, [clearErrorAction, onErrorAction, openFolderInputAction, setCommandPaletteOpenAction]);

  return {
    clearDocumentAction: clearDocumentShellAction,
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
  };
};
