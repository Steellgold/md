"use client";

import { assignUniqueCollaborationColors } from "@/lib/markdown-collaboration";
import {
  type CollaborationParticipant,
  type CollaborationSelection,
} from "@/types/markdown";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

type UseMarkdownCollaborationParams = {
  enabled: boolean;
  roomId: string | null;
  wsBaseUrl: string | null;
  authToken: string | null;
  userName: string;
  userAvatarUrl: string;
  initialContent: string;
  onContentChange: (content: string) => void;
};

type UseMarkdownCollaborationResult = {
  isActive: boolean;
  isConnected: boolean;
  participants: CollaborationParticipant[];
  applyLocalContent: (nextContent: string) => void;
  updateLocalSelection: (selection: CollaborationSelection | null) => void;
  undo: () => void;
  redo: () => void;
};

type AwarenessUserState = {
  id: string;
  name: string;
  avatarUrl: string;
  color: string;
};

type AwarenessState = {
  user?: AwarenessUserState;
  selection?: CollaborationSelection | null;
};

const defaultResult: UseMarkdownCollaborationResult = {
  isActive: false,
  isConnected: false,
  participants: [],
  applyLocalContent: () => {},
  updateLocalSelection: () => {},
  undo: () => {},
  redo: () => {},
};

export const useMarkdownCollaboration = ({
  enabled,
  roomId,
  wsBaseUrl,
  authToken,
  userName,
  userAvatarUrl,
  initialContent,
  onContentChange,
}: UseMarkdownCollaborationParams): UseMarkdownCollaborationResult => {
  const [participants, setParticipants] = useState<CollaborationParticipant[]>(
    []
  );
  const [isConnected, setIsConnected] = useState(false);
  const yTextRef = useRef<Y.Text | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const localOriginRef = useRef<object | null>(null);
  const onContentChangeRef = useRef(onContentChange);
  const initialContentRef = useRef(initialContent);
  const seededRoomRef = useRef<string | null>(null);
  const localUserId = useMemo(() => crypto.randomUUID(), []);
  const normalizedUserName = useMemo(
    () => userName.trim() || "Anonymous",
    [userName]
  );

  useEffect(() => {
    onContentChangeRef.current = onContentChange;
  }, [onContentChange]);

  useEffect(() => {
    if (!enabled || !roomId || !wsBaseUrl || !authToken) {
      return;
    }

    if (seededRoomRef.current !== roomId) {
      initialContentRef.current = initialContent;
      seededRoomRef.current = roomId;
    }
  }, [authToken, enabled, initialContent, roomId, wsBaseUrl]);

  useEffect(() => {
    if (!enabled || !roomId || !wsBaseUrl || !authToken) {
      yTextRef.current = null;
      undoManagerRef.current = null;
      providerRef.current?.destroy();
      providerRef.current = null;
      return;
    }

    const yDoc = new Y.Doc();
    const yText = yDoc.getText("content");
    const localOrigin = {};
    localOriginRef.current = localOrigin;
    yTextRef.current = yText;
    undoManagerRef.current = new Y.UndoManager(yText, {
      trackedOrigins: new Set([localOrigin]),
    });

    const provider = new WebsocketProvider(wsBaseUrl, roomId, yDoc, {
      params: {
        token: authToken,
      },
      connect: true,
    });
    providerRef.current = provider;
    console.info("[collab] provider:init", {
      roomId,
      wsBaseUrl,
      hasAuthToken: Boolean(authToken),
    });

    const localUserColor =
      assignUniqueCollaborationColors([localUserId]).get(localUserId) ??
      "#3B82F6";

    const localUserState: AwarenessUserState = {
      id: localUserId,
      name: normalizedUserName,
      avatarUrl: userAvatarUrl,
      color: localUserColor,
    };

    provider.awareness.setLocalState({
      user: localUserState,
      selection: null,
    } satisfies AwarenessState);

    const syncParticipants = () => {
      const currentStates = Array.from(provider.awareness.getStates().values());
      const awarenessStates = currentStates
        .map((state) => state as AwarenessState)
        .filter((state) => Boolean(state.user));
      const colorsById = assignUniqueCollaborationColors(
        awarenessStates.map((state) => state.user!.id)
      );
      const resolvedLocalColor = colorsById.get(localUserId);
      const currentLocalState = provider.awareness.getLocalState() as
        | AwarenessState
        | null;

      if (
        resolvedLocalColor &&
        currentLocalState?.user &&
        currentLocalState.user.color !== resolvedLocalColor
      ) {
        provider.awareness.setLocalState({
          ...currentLocalState,
          user: {
            ...currentLocalState.user,
            color: resolvedLocalColor,
          },
        });
      }

      const nextParticipants = awarenessStates
        .map((state) => {
          const user = state.user!;

          return {
            id: user.id,
            name: user.name,
            avatarUrl: user.avatarUrl,
            color: colorsById.get(user.id) ?? user.color,
            selection: state.selection ?? null,
            isLocal: user.id === localUserId,
          };
        })
        .sort((left, right) =>
          left.isLocal === right.isLocal
            ? left.name.localeCompare(right.name)
            : left.isLocal
              ? -1
              : 1
        );

      setParticipants(nextParticipants);
    };

    const handleAwarenessChange = () => {
      syncParticipants();
    };

    const handleContentChange = () => {
      onContentChangeRef.current(yText.toString());
    };

    const handleSynced = (isSynced: boolean) => {
      setIsConnected(isSynced);
      console.info("[collab] provider:sync", { roomId, isSynced });

      if (!isSynced) {
        return;
      }

      const seedContent = initialContentRef.current;

      if (yText.length === 0 && seedContent !== "") {
        yDoc.transact(() => {
          yText.insert(0, seedContent);
        }, localOrigin);
      } else {
        onContentChangeRef.current(yText.toString());
      }
    };

    yText.observe(handleContentChange);
    provider.awareness.on("change", handleAwarenessChange);
    provider.on("sync", handleSynced);
    provider.on("status", (event: { status: "connected" | "disconnected" | "connecting" }) => {
      const isNowConnected = event.status === "connected";
      setIsConnected(isNowConnected);
      console.info("[collab] provider:status", {
        roomId,
        status: event.status,
      });
    });
    (provider as unknown as {
      on?: (event: string, callback: (...args: unknown[]) => void) => void;
    }).on?.("connection-error", (event: unknown) => {
      console.error("[collab] provider:connection-error", {
        roomId,
        wsBaseUrl,
        event,
      });
    });
    (provider as unknown as {
      on?: (event: string, callback: (...args: unknown[]) => void) => void;
    }).on?.("connection-close", (event: unknown) => {
      console.warn("[collab] provider:connection-close", {
        roomId,
        wsBaseUrl,
        event,
      });
    });
    syncParticipants();

    return () => {
      yText.unobserve(handleContentChange);
      provider.awareness.off("change", handleAwarenessChange);
      provider.off("sync", handleSynced);
      provider.destroy();
      yDoc.destroy();
      yTextRef.current = null;
      undoManagerRef.current = null;
      providerRef.current = null;
      setParticipants([]);
      setIsConnected(false);
    };
  }, [
    authToken,
    enabled,
    localUserId,
    normalizedUserName,
    roomId,
    userAvatarUrl,
    wsBaseUrl,
  ]);

  const applyLocalContent = useCallback((nextContent: string) => {
    const yText = yTextRef.current;
    const localOrigin = localOriginRef.current;

    if (!yText || !localOrigin) {
      return;
    }

    if (yText.toString() === nextContent) {
      return;
    }

    const currentContent = yText.toString();
    const currentLength = currentContent.length;
    const nextLength = nextContent.length;
    let prefixLength = 0;

    while (
      prefixLength < currentLength &&
      prefixLength < nextLength &&
      currentContent.charCodeAt(prefixLength) ===
        nextContent.charCodeAt(prefixLength)
    ) {
      prefixLength += 1;
    }

    let suffixLength = 0;

    while (
      suffixLength < currentLength - prefixLength &&
      suffixLength < nextLength - prefixLength &&
      currentContent.charCodeAt(currentLength - 1 - suffixLength) ===
        nextContent.charCodeAt(nextLength - 1 - suffixLength)
    ) {
      suffixLength += 1;
    }

    const deleteLength = currentLength - prefixLength - suffixLength;
    const insertText = nextContent.slice(prefixLength, nextLength - suffixLength);

    yText.doc?.transact(() => {
      if (deleteLength > 0) {
        yText.delete(prefixLength, deleteLength);
      }

      if (insertText !== "") {
        yText.insert(prefixLength, insertText);
      }
    }, localOrigin);
  }, []);

  const updateLocalSelection = useCallback(
    (selection: CollaborationSelection | null) => {
      const provider = providerRef.current;

      if (!provider) {
        return;
      }

      provider.awareness.setLocalStateField("selection", selection);
    },
    []
  );

  const undo = useCallback(() => {
    undoManagerRef.current?.undo();
  }, []);

  const redo = useCallback(() => {
    undoManagerRef.current?.redo();
  }, []);

  if (!enabled || !roomId || !wsBaseUrl || !authToken) {
    return defaultResult;
  }

  return {
    isActive: true,
    isConnected,
    participants,
    applyLocalContent,
    updateLocalSelection,
    undo,
    redo,
  };
};
