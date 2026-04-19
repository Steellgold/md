"use client";

import { useMarkdownCollaboration } from "@/hooks/use-markdown-collaboration";
import { useMarkdownCollabFlow } from "@/hooks/use-markdown-collab-flow";
import {
  COLLAB_AUTOSAVE_DEBOUNCE_MS,
  COLLAB_SAVE_REMINDER_AFTER_MS,
  COLLAB_SAVE_REMINDER_CHANGE_THRESHOLD,
} from "@/lib/markdown-app-constants";
import { useMarkdownStore } from "@/lib/markdown-store";
import type { ParsedCollaborationJoinParams } from "@/lib/markdown-collaboration";
import type { RecentMarkdownFile } from "@/types/markdown";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { toast } from "sonner";

type UseMarkdownAppCollaborationSessionInput = {
  activeDocumentId: string | null;
  activeOpenDocument: { isDirty: boolean } | null;
  activeFile: RecentMarkdownFile | null;
  canSaveActiveFile: boolean;
  collaborativeAvatarUrl: string;
  collaborativeUserName: string;
  content: string;
  editorRef: RefObject<HTMLTextAreaElement | null>;
  parsedCollabJoin: ParsedCollaborationJoinParams | null;
  setContentAction: (content: string) => void;
  setDocumentCollaborationAction: (
    id: string,
    collab: import("@/types/markdown").CollaborationSession | null
  ) => void;
  setDocumentContentAction: (id: string, content: string) => void;
  setUiErrorAction: (message: string | null) => void;
  syncPreviewContentAction: (
    content: string,
    options?: { immediate?: boolean }
  ) => void;
};

export const useMarkdownAppCollaborationSession = ({
  activeDocumentId,
  activeOpenDocument,
  activeFile,
  canSaveActiveFile,
  collaborativeAvatarUrl,
  collaborativeUserName,
  content,
  editorRef,
  parsedCollabJoin,
  setContentAction,
  setDocumentCollaborationAction,
  setDocumentContentAction,
  setUiErrorAction,
  syncPreviewContentAction,
}: UseMarkdownAppCollaborationSessionInput) => {
  const [collabUnsavedChangeCount, setCollabUnsavedChangeCount] = useState(0);
  const [collabUnsavedSince, setCollabUnsavedSince] = useState<string | null>(
    null
  );

  const collabAutosaveTimeoutRef = useRef<number | null>(null);
  const collabAutosaveInFlightRef = useRef(false);
  const collabAutosaveQueuedRef = useRef(false);
  const collabSaveReminderShownRef = useRef(false);

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
    onErrorAction: setUiErrorAction,
    onResetUnsavedTrackingAction: resetCollabUnsavedTracking,
    onSetDocumentCollaborationAction: setDocumentCollaborationAction,
    parsedCollabJoin,
  });

  const collaborateActionLabel = collabAuthToken ? "Collaborating" : "Collaborate";

  const canCollaborativeAutosave =
    Boolean(collabAuthToken) && collabAutosaveEnabled && canSaveActiveFile;

  const saveActiveFile = useMarkdownStore((state) => state.saveActiveFile);

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
          setDocumentContentAction(activeDocumentId, nextContent);
        } else {
          setContentAction(nextContent);
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
    editorRef,
    resetCollabUnsavedTracking,
    saveActiveFile,
    setContentAction,
    setDocumentContentAction,
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
          setDocumentContentAction(activeDocumentId, nextContent);
          return;
        }

        setContentAction(nextContent);
      });
      syncPreviewContentAction(nextContent, { immediate: true });

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
        setDocumentContentAction(documentId, nextContent);
        return;
      }

      setContentAction(nextContent);
    },
    [setContentAction, setDocumentContentAction]
  );

  useEffect(() => {
    return () => {
      if (collabAutosaveTimeoutRef.current) {
        window.clearTimeout(collabAutosaveTimeoutRef.current);
      }
    };
  }, []);

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
  }, [
    activeOpenDocument?.isDirty,
    canCollaborativeAutosave,
    scheduleCollabAutosave,
  ]);

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

      const elapsed = Date.now() - new Date(collabUnsavedSince).getTime();

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

  return {
    collabAccessMode,
    collabAuthToken,
    collabAutosaveEnabled,
    collabInviteToken,
    collabJoinUrl,
    collabPassword,
    collabRoomId,
    collabWsBaseUrl,
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
  };
};
