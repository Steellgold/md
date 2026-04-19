"use client";

import {
  createCollaborationRoom,
  createCollaborationRoomId,
  createCollaborationToken,
  joinCollaborationRoom,
} from "@/lib/markdown-collaboration";
import { getUnknownErrorMessage } from "@/lib/markdown-helpers";
import {
  type CollaborationSession,
  type RecentMarkdownFile,
} from "@/types/markdown";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type UseMarkdownCollabFlowParams = {
  activeFile: RecentMarkdownFile | null;
  canSaveActiveFile: boolean;
  onErrorAction: (message: string) => void;
  onResetUnsavedTrackingAction: () => void;
  onSetDocumentCollaborationAction: (
    id: string,
    collab: CollaborationSession | null
  ) => void;
  parsedCollabJoin: {
    accessMode: "open" | "invite" | "password";
    roomId: string;
    inviteToken?: string | null;
    fileName?: string | null;
  } | null;
};

export const useMarkdownCollabFlow = ({
  activeFile,
  canSaveActiveFile,
  onErrorAction,
  onResetUnsavedTrackingAction,
  onSetDocumentCollaborationAction,
  parsedCollabJoin,
}: UseMarkdownCollabFlowParams) => {
  const [isCollabBusy, setIsCollabBusy] = useState(false);
  const [isCollabDialogOpen, setIsCollabDialogOpen] = useState(false);
  const [collabAccessMode, setCollabAccessMode] = useState<
    "open" | "invite" | "password"
  >("open");
  const [collabRoomId, setCollabRoomId] = useState("");
  const [collabInviteToken, setCollabInviteToken] = useState("");
  const [collabPassword, setCollabPassword] = useState("");
  const [collabJoinUrl, setCollabJoinUrl] = useState<string | null>(null);
  const [collabWsBaseUrl, setCollabWsBaseUrl] = useState<string | null>(null);
  const [collabAuthToken, setCollabAuthToken] = useState<string | null>(null);
  const [pendingJoinRoomId, setPendingJoinRoomId] = useState<string | null>(null);
  const [collabAutosaveEnabled, setCollabAutosaveEnabled] = useState(false);
  const [collaborationStartedAt, setCollaborationStartedAt] = useState<
    string | null
  >(null);

  const openCollabDialogAction = useCallback(() => {
    if (!activeFile) {
      return;
    }

    const existingCollab = activeFile.collab ?? null;

    setCollabAccessMode(existingCollab?.accessMode ?? "open");
    setCollabRoomId(existingCollab?.roomId ?? createCollaborationRoomId());
    setCollabInviteToken(
      existingCollab?.inviteToken ?? createCollaborationToken()
    );
    setCollabPassword("");
    setCollabJoinUrl(existingCollab?.joinUrl ?? collabJoinUrl);
    setIsCollabDialogOpen(true);
  }, [activeFile, collabJoinUrl]);

  const startCollaborationAction = useCallback(async () => {
    if (!activeFile) {
      return;
    }

    setIsCollabBusy(true);

    try {
      if (pendingJoinRoomId) {
        const connection = await joinCollaborationRoom({
          roomId: pendingJoinRoomId,
          inviteToken: collabAccessMode === "invite" ? collabInviteToken : null,
          password: collabAccessMode === "password" ? collabPassword : null,
        });

        setCollabWsBaseUrl(connection.wsBaseUrl);
        setCollabAuthToken(connection.token);
        setPendingJoinRoomId(null);
        setIsCollabDialogOpen(false);
        toast.success("Joined collaboration.");
        return;
      }

      const room = await createCollaborationRoom({
        accessMode: collabAccessMode,
        fileName: activeFile.name,
        inviteToken: collabAccessMode === "invite" ? collabInviteToken : null,
        password: collabAccessMode === "password" ? collabPassword : null,
      });
      const connection = await joinCollaborationRoom({
        roomId: room.id,
        inviteToken: room.inviteToken,
        password: collabAccessMode === "password" ? collabPassword : null,
      });

      setCollabRoomId(room.id);
      setCollabInviteToken(room.inviteToken ?? "");
      setCollabJoinUrl(room.joinUrl);
      setCollabWsBaseUrl(connection.wsBaseUrl);
      setCollabAuthToken(connection.token);

      onSetDocumentCollaborationAction(activeFile.id, {
        roomId: room.id,
        accessMode: collabAccessMode,
        inviteToken: room.inviteToken,
        joinUrl: room.joinUrl,
      });
      toast.success("Collaboration started.");
    } catch (error) {
      onErrorAction(getUnknownErrorMessage(error));
    } finally {
      setIsCollabBusy(false);
    }
  }, [
    activeFile,
    collabAccessMode,
    collabInviteToken,
    collabPassword,
    onErrorAction,
    onSetDocumentCollaborationAction,
    pendingJoinRoomId,
  ]);

  const stopCollaborationAction = useCallback(() => {
    if (!activeFile) {
      return;
    }

    setCollabWsBaseUrl(null);
    setCollabAuthToken(null);
    setCollabAutosaveEnabled(false);
    setPendingJoinRoomId(null);
    setCollabJoinUrl(null);
    setCollabPassword("");
    onResetUnsavedTrackingAction();
    onSetDocumentCollaborationAction(activeFile.id, null);
    setIsCollabDialogOpen(false);
    toast.success("Collaboration stopped.");
  }, [activeFile, onResetUnsavedTrackingAction, onSetDocumentCollaborationAction]);

  const copyCollaborationLinkAction = useCallback(async () => {
    if (!collabJoinUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(collabJoinUrl);
      toast.success("Collaboration link copied.");
    } catch (error) {
      onErrorAction(getUnknownErrorMessage(error));
    }
  }, [collabJoinUrl, onErrorAction]);

  useEffect(() => {
    if (!parsedCollabJoin) {
      return;
    }

    setCollabAccessMode(parsedCollabJoin.accessMode);
    setCollabRoomId(parsedCollabJoin.roomId);
    setCollabInviteToken(parsedCollabJoin.inviteToken ?? "");
    setCollabJoinUrl(window.location.toString());
    setPendingJoinRoomId(parsedCollabJoin.roomId);

    if (parsedCollabJoin.accessMode === "password") {
      setIsCollabDialogOpen(true);
      return;
    }

    void joinCollaborationRoom({
      roomId: parsedCollabJoin.roomId,
      inviteToken: parsedCollabJoin.inviteToken,
    })
      .then((connection) => {
        setCollabWsBaseUrl(connection.wsBaseUrl);
        setCollabAuthToken(connection.token);
        setPendingJoinRoomId(null);
      })
      .catch((error) => {
        onErrorAction(getUnknownErrorMessage(error));
      });
  }, [onErrorAction, parsedCollabJoin]);

  useEffect(() => {
    if (!activeFile) {
      setCollabWsBaseUrl(null);
      setCollabAuthToken(null);
      setCollaborationStartedAt(null);
      setPendingJoinRoomId(null);
      setCollabJoinUrl(null);
      setCollabPassword("");
      return;
    }

    if (activeFile.collab) {
      setCollabAccessMode(activeFile.collab.accessMode);
      setCollabRoomId(activeFile.collab.roomId);
      setCollabInviteToken(activeFile.collab.inviteToken ?? "");
      setCollabJoinUrl(activeFile.collab.joinUrl);
    } else if (!parsedCollabJoin && !collabAuthToken) {
      setCollabWsBaseUrl(null);
      setCollabAuthToken(null);
      setCollabJoinUrl(null);
    }
  }, [activeFile, collabAuthToken, parsedCollabJoin]);

  useEffect(() => {
    if (!activeFile?.collab || collabAuthToken || pendingJoinRoomId) {
      return;
    }

    if (activeFile.collab.accessMode === "password") {
      setPendingJoinRoomId(activeFile.collab.roomId);
      setCollabAccessMode("password");
      setCollabRoomId(activeFile.collab.roomId);
      setCollabJoinUrl(activeFile.collab.joinUrl);
      setIsCollabDialogOpen(true);
      return;
    }

    void joinCollaborationRoom({
      roomId: activeFile.collab.roomId,
      inviteToken: activeFile.collab.inviteToken,
    })
      .then((connection) => {
        setCollabWsBaseUrl(connection.wsBaseUrl);
        setCollabAuthToken(connection.token);
      })
      .catch((error) => {
        onErrorAction(getUnknownErrorMessage(error));
      });
  }, [activeFile, collabAuthToken, onErrorAction, pendingJoinRoomId]);

  useEffect(() => {
    if (!activeFile || activeFile.collab || !collabRoomId || !collabJoinUrl) {
      return;
    }

    const inviteToken =
      collabAccessMode === "invite" ? collabInviteToken.trim() || null : null;

    onSetDocumentCollaborationAction(activeFile.id, {
      roomId: collabRoomId,
      accessMode: collabAccessMode,
      inviteToken,
      joinUrl: collabJoinUrl,
    });
  }, [
    activeFile,
    collabAccessMode,
    collabInviteToken,
    collabJoinUrl,
    collabRoomId,
    onSetDocumentCollaborationAction,
  ]);

  useEffect(() => {
    if (!collabAuthToken) {
      setCollaborationStartedAt(null);
      return;
    }

    setCollaborationStartedAt((currentValue) => currentValue ?? new Date().toISOString());
  }, [collabAuthToken]);

  useEffect(() => {
    if (!canSaveActiveFile && collabAutosaveEnabled) {
      setCollabAutosaveEnabled(false);
    }
  }, [canSaveActiveFile, collabAutosaveEnabled]);

  return {
    collabAuthToken,
    collabAccessMode,
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
    setCollabAuthToken,
    startCollaborationAction,
    stopCollaborationAction,
  };
};
