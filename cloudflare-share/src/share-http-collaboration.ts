import { ShareServiceError } from "./http/errors";
import { json } from "./http/response";
import {
  computeHash,
  createToken,
  ensureAuthorizedWriteRequest,
  getBaseUrl,
  getPasswordPepper,
  hashPassword,
  normalizeBaseUrl,
  normalizePassword,
  type ShareWorkerEnv,
} from "./share-http-share";

const JOIN_TOKEN_TTL_MS = 1000 * 60 * 60 * 8;

type CollaborationAccessMode = "open" | "invite" | "password";

type CollaborationRoomMetadata = {
  id: string;
  accessMode: CollaborationAccessMode;
  inviteTokenHash: string | null;
  passwordHash: string | null;
  passwordSalt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CollaborationCreatePayload = {
  accessMode?: CollaborationAccessMode;
  appBaseUrl?: string | null;
  fileName?: string | null;
  inviteToken?: string | null;
  password?: string | null;
};

type CollaborationJoinPayload = {
  roomId?: string;
  inviteToken?: string | null;
  password?: string | null;
};

type CollaborationJoinTokenPayload = {
  roomId: string;
  expiresAt: string;
};

const buildCollabRoomKey = (id: string) => `collab:room:${id}`;
const buildCollabJoinTokenKey = (token: string) => `collab:join:${token}`;

const getWsBaseUrl = (request: Request, env: ShareWorkerEnv) =>
  normalizeBaseUrl(getBaseUrl(request, env)).replace(/^http/iu, "ws");

const createCollabJoinUrl = (
  request: Request,
  env: ShareWorkerEnv,
  room: CollaborationRoomMetadata,
  inviteToken: string | null,
  appBaseUrl: string | null | undefined,
  fileName: string | null | undefined
) => {
  const appUrl = new URL(
    normalizeBaseUrl(appBaseUrl?.trim() || getBaseUrl(request, env))
  );
  appUrl.pathname = "/";
  appUrl.searchParams.set("collab", "1");
  appUrl.searchParams.set("room", room.id);
  appUrl.searchParams.set("access", room.accessMode);

  if (room.accessMode === "invite" && inviteToken) {
    appUrl.searchParams.set("token", inviteToken);
  } else {
    appUrl.searchParams.delete("token");
  }

  const normalizedFileName = fileName?.trim() ?? "";

  if (normalizedFileName) {
    appUrl.searchParams.set("name", normalizedFileName);
  } else {
    appUrl.searchParams.delete("name");
  }

  return appUrl.toString();
};

const isCollaborationAccessMode = (
  value: string | null | undefined
): value is CollaborationAccessMode =>
  value === "open" || value === "invite" || value === "password";

const readCollaborationRoom = async (env: ShareWorkerEnv, roomId: string) =>
  env.SHARE_INDEX.get<CollaborationRoomMetadata>(buildCollabRoomKey(roomId), {
    type: "json",
  });

const writeCollaborationRoom = async (
  env: ShareWorkerEnv,
  room: CollaborationRoomMetadata
) => {
  await env.SHARE_INDEX.put(buildCollabRoomKey(room.id), JSON.stringify(room));
};

const createJoinToken = () => createToken(24);

const issueCollaborationJoinToken = async (
  env: ShareWorkerEnv,
  roomId: string
) => {
  const token = createJoinToken();
  const expiresAt = new Date(Date.now() + JOIN_TOKEN_TTL_MS).toISOString();
  const payload: CollaborationJoinTokenPayload = {
    roomId,
    expiresAt,
  };

  await env.SHARE_INDEX.put(
    buildCollabJoinTokenKey(token),
    JSON.stringify(payload)
  );

  return token;
};

const MAX_PASSWORD_LENGTH = 256;

const resolvePasswordHash = async (
  env: ShareWorkerEnv,
  password: string | null | undefined
) => {
  const normalizedPassword = normalizePassword(password);

  if (!normalizedPassword) {
    return {
      passwordHash: null,
      passwordSalt: null,
    };
  }

  if (normalizedPassword.length > MAX_PASSWORD_LENGTH) {
    throw new ShareServiceError("The collaboration password is too long.");
  }

  const passwordSalt = createToken(16);

  return {
    passwordHash: await hashPassword(
      normalizedPassword,
      passwordSalt,
      getPasswordPepper(env)
    ),
    passwordSalt,
  };
};

export const handleCreateCollaborationRoom = async (
  request: Request,
  env: ShareWorkerEnv
) => {
  ensureAuthorizedWriteRequest(request, env);

  const body = (await request.json()) as CollaborationCreatePayload;
  const accessMode = body.accessMode ?? "open";

  if (!isCollaborationAccessMode(accessMode)) {
    throw new ShareServiceError("Invalid collaboration access mode.");
  }

  const inviteToken =
    accessMode === "invite"
      ? normalizePassword(body.inviteToken) ?? createToken(12)
      : null;
  const inviteTokenHash = inviteToken
    ? await computeHash(`invite:${inviteToken}`)
    : null;
  const passwordFields =
    accessMode === "password"
      ? await resolvePasswordHash(env, body.password)
      : {
          passwordHash: null,
          passwordSalt: null,
        };
  const now = new Date().toISOString();
  const room: CollaborationRoomMetadata = {
    id: crypto.randomUUID(),
    accessMode,
    inviteTokenHash,
    passwordHash: passwordFields.passwordHash,
    passwordSalt: passwordFields.passwordSalt,
    createdAt: now,
    updatedAt: now,
  };

  await writeCollaborationRoom(env, room);

  return json({
    room: {
      id: room.id,
      accessMode: room.accessMode,
      inviteToken,
      joinUrl: createCollabJoinUrl(
        request,
        env,
        room,
        inviteToken,
        body.appBaseUrl,
        body.fileName
      ),
    },
  });
};

export const handleJoinCollaborationRoom = async (
  request: Request,
  env: ShareWorkerEnv
) => {
  const body = (await request.json()) as CollaborationJoinPayload;
  const roomId = body.roomId?.trim();

  if (!roomId) {
    throw new ShareServiceError("Room id is required.");
  }

  const room = await readCollaborationRoom(env, roomId);

  if (!room) {
    throw new ShareServiceError("This collaboration room was not found.", 404);
  }

  if (room.accessMode === "invite") {
    const inviteToken = normalizePassword(body.inviteToken);

    if (
      !inviteToken ||
      (await computeHash(`invite:${inviteToken}`)) !== room.inviteTokenHash
    ) {
      throw new ShareServiceError("Invalid invite token.", 403);
    }
  }

  if (room.accessMode === "password") {
    if (!room.passwordHash || !room.passwordSalt) {
      throw new ShareServiceError(
        "Collaboration password is misconfigured.",
        500
      );
    }

    const normalizedPassword = normalizePassword(body.password);

    if (!normalizedPassword) {
      throw new ShareServiceError("Password is required.", 401);
    }

    const passwordHash = await hashPassword(
      normalizedPassword,
      room.passwordSalt,
      getPasswordPepper(env)
    );

    if (passwordHash !== room.passwordHash) {
      throw new ShareServiceError("Incorrect collaboration password.", 401);
    }
  }

  const joinToken = await issueCollaborationJoinToken(env, room.id);

  return json({
    connection: {
      roomId: room.id,
      wsBaseUrl: `${getWsBaseUrl(request, env)}/v1/collab/connect`,
      token: joinToken,
    },
  });
};

const authorizeCollaborationWebSocket = async (
  env: ShareWorkerEnv,
  roomId: string,
  token: string | null
) => {
  if (!token) {
    throw new ShareServiceError("Missing collaboration token.", 401);
  }

  const payload = await env.SHARE_INDEX.get<CollaborationJoinTokenPayload>(
    buildCollabJoinTokenKey(token),
    { type: "json" }
  );

  if (!payload || payload.roomId !== roomId) {
    throw new ShareServiceError("Invalid collaboration token.", 401);
  }

  if (new Date(payload.expiresAt).getTime() <= Date.now()) {
    throw new ShareServiceError("Collaboration token expired.", 401);
  }
};

export const handleCollaborationWebSocket = async (
  request: Request,
  env: ShareWorkerEnv,
  roomId: string
) => {
  if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    throw new ShareServiceError("Expected websocket upgrade.", 426);
  }

  await authorizeCollaborationWebSocket(
    env,
    roomId,
    new URL(request.url).searchParams.get("token")
  );

  const roomStub = env.COLLAB_ROOMS.get(env.COLLAB_ROOMS.idFromName(roomId));

  return roomStub.fetch(request);
};
