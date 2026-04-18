"use client";

import {
  type CollaborativeAccessMode,
  type CollaborationSession,
} from "@/types/markdown";

const COLLAB_QUERY_FLAG = "collab";
const COLLAB_QUERY_ROOM = "room";
const COLLAB_QUERY_MODE = "access";
const COLLAB_QUERY_TOKEN = "token";

const colorPalette = [
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#F59E0B",
  "#EF4444",
  "#06B6D4",
  "#A855F7",
  "#22C55E",
] as const;

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/u, "");

export const createCollaborationToken = (byteLength = 16) => {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
};

export const createCollaborationRoomId = () => crypto.randomUUID();

export const buildCollaborationJoinUrl = (
  baseUrl: string,
  session: Pick<CollaborationSession, "roomId" | "accessMode" | "inviteToken">
) => {
  const url = new URL(normalizeBaseUrl(baseUrl));
  url.pathname = "/";
  url.searchParams.set(COLLAB_QUERY_FLAG, "1");
  url.searchParams.set(COLLAB_QUERY_ROOM, session.roomId);
  url.searchParams.set(COLLAB_QUERY_MODE, session.accessMode);

  if (session.accessMode === "invite" && session.inviteToken) {
    url.searchParams.set(COLLAB_QUERY_TOKEN, session.inviteToken);
  } else {
    url.searchParams.delete(COLLAB_QUERY_TOKEN);
  }

  return url.toString();
};

const isCollaborativeAccessMode = (
  value: string | null
): value is CollaborativeAccessMode =>
  value === "open" || value === "invite" || value === "password";

export type ParsedCollaborationJoinParams = {
  roomId: string;
  accessMode: CollaborativeAccessMode;
  inviteToken: string | null;
};

export const parseCollaborationJoinParams = (
  searchParams: URLSearchParams
): ParsedCollaborationJoinParams | null => {
  if (searchParams.get(COLLAB_QUERY_FLAG) !== "1") {
    return null;
  }

  const roomId = searchParams.get(COLLAB_QUERY_ROOM)?.trim() ?? "";
  const mode = searchParams.get(COLLAB_QUERY_MODE);
  const inviteToken = searchParams.get(COLLAB_QUERY_TOKEN)?.trim() ?? null;

  if (!roomId || !isCollaborativeAccessMode(mode)) {
    return null;
  }

  if (mode === "invite" && !inviteToken) {
    return null;
  }

  return {
    roomId,
    accessMode: mode,
    inviteToken,
  };
};

type CreateCollaborationRoomPayload = {
  accessMode: CollaborativeAccessMode;
  appBaseUrl?: string | null;
  inviteToken?: string | null;
  password?: string | null;
};

type CreateCollaborationRoomResponse = {
  room: {
    id: string;
    accessMode: CollaborativeAccessMode;
    inviteToken: string | null;
    joinUrl: string;
  };
};

type JoinCollaborationRoomPayload = {
  roomId: string;
  inviteToken?: string | null;
  password?: string | null;
};

type JoinCollaborationRoomResponse = {
  connection: {
    roomId: string;
    wsBaseUrl: string;
    token: string;
  };
};

export const createCollaborationRoom = async (
  payload: CreateCollaborationRoomPayload
) => {
  const response = await fetch("/api/collab/rooms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json()) as {
    error?: string;
    room?: CreateCollaborationRoomResponse["room"];
  };

  if (!response.ok || !body.room) {
    throw new Error(body.error ?? "Unable to create collaborative room.");
  }

  return body.room;
};

export const joinCollaborationRoom = async (
  payload: JoinCollaborationRoomPayload
) => {
  const response = await fetch("/api/collab/join", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json()) as {
    connection?: JoinCollaborationRoomResponse["connection"];
    error?: string;
  };

  if (!response.ok || !body.connection) {
    throw new Error(body.error ?? "Unable to join collaborative room.");
  }

  return body.connection;
};

const hashToPaletteIndex = (value: string) => {
  let hash = 0;

  for (const character of value) {
    hash = (hash << 5) - hash + character.charCodeAt(0);
    hash |= 0;
  }

  return Math.abs(hash) % colorPalette.length;
};

export const getCollaborationColor = (id: string) =>
  colorPalette[hashToPaletteIndex(id)]!;
