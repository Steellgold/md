import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import * as awarenessProtocol from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import * as Y from "yjs";

type DurableObjectStateLike = {
  storage: {
    get: <T = unknown>(key: string) => Promise<T | undefined>;
    put: (key: string, value: unknown) => Promise<void>;
  };
  waitUntil: (promise: Promise<unknown>) => void;
  blockConcurrencyWhile: <T>(callback: () => Promise<T>) => Promise<T>;
};

type DurableObjectNamespace = {
  idFromName: (name: string) => unknown;
  get: (id: unknown) => {
    fetch: (request: Request) => Promise<Response>;
  };
};

declare const WebSocketPair: {
  new (): {
    0: WebSocket;
    1: WebSocket;
  };
};

const MAX_SHARE_SIZE = 2 * 1024 * 1024;
const MAX_PASSWORD_LENGTH = 256;
const DEFAULT_FILE_NAME = "document.md";
const JOIN_TOKEN_TTL_MS = 1000 * 60 * 60 * 8;

type ShareMetadata = {
  id: string;
  token: string;
  objectKey: string;
  fileName: string;
  contentHash: string;
  passwordHash: string | null;
  passwordSalt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ShareWorkerEnv = {
  SHARE_API_TOKEN?: string;
  SHARE_BASE_URL?: string;
  COLLAB_ROOMS: DurableObjectNamespace;
  SHARE_BUCKET: {
    get: (key: string) => Promise<R2ObjectLike | null>;
    put: (
      key: string,
      value: string,
      options?: {
        customMetadata?: Record<string, string>;
        httpMetadata?: {
          contentDisposition?: string;
          contentType?: string;
        };
      }
    ) => Promise<void>;
  };
  SHARE_INDEX: {
    get: <T = string>(
      key: string,
      options?: {
        type?: "json" | "text";
      }
    ) => Promise<T | null>;
    put: (key: string, value: string) => Promise<void>;
  };
  SHARE_PASSWORD_PEPPER?: string;
  SHARE_TOKEN_BYTES?: string;
};

type R2ObjectLike = {
  text: () => Promise<string>;
};

type ShareWritePayload = {
  content?: string;
  existingShareId?: string | null;
  name?: string;
  password?: string | null;
  removePassword?: boolean;
};

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

class ShareServiceError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const encoder = new TextEncoder();

const buildIdKey = (id: string) => `share:id:${id}`;
const buildTokenKey = (token: string) => `share:token:${token}`;
const buildObjectKey = (shareId: string) => `shares/${shareId}/current.md`;
const buildCollabRoomKey = (id: string) => `collab:room:${id}`;
const buildCollabJoinTokenKey = (token: string) => `collab:join:${token}`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "access-control-allow-headers":
        "authorization, content-type, x-markdown-share-password",
      "access-control-allow-methods": "GET, OPTIONS, POST",
      "access-control-allow-origin": "*",
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const getOptionalValue = (value: string | undefined) => {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
};

const getBaseUrl = (request: Request, env: ShareWorkerEnv) =>
  getOptionalValue(env.SHARE_BASE_URL) ?? new URL(request.url).origin;

const getTokenBytes = (env: ShareWorkerEnv) => {
  const parsedValue = Number.parseInt(env.SHARE_TOKEN_BYTES ?? "", 10);
  return Number.isFinite(parsedValue) && parsedValue >= 16 ? parsedValue : 24;
};

const getPasswordPepper = (env: ShareWorkerEnv) =>
  getOptionalValue(env.SHARE_PASSWORD_PEPPER) ?? "";

const encodeContentDispositionFileName = (value: string) =>
  encodeURIComponent(value).replace(
    /['()*]/gu,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/u, "");

const sanitizeFileName = (value: string | null | undefined) => {
  const trimmedValue = (value ?? "").trim();

  if (!trimmedValue) {
    return DEFAULT_FILE_NAME;
  }

  const sanitizedValue = trimmedValue.replace(/[\\/:*?"<>|]/gu, "-");

  return sanitizedValue.endsWith(".md")
    ? sanitizedValue
    : `${sanitizedValue}.md`;
};

const normalizePassword = (value: string | null | undefined) => {
  const trimmedValue = (value ?? "").trim();
  return trimmedValue === "" ? null : trimmedValue;
};

const computeHash = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};

const hashPassword = async (password: string, salt: string, pepper: string) =>
  computeHash(`${salt}:${password}:${pepper}`);

const createToken = (byteLength: number) => {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
};

const readShareById = async (env: ShareWorkerEnv, shareId: string) =>
  env.SHARE_INDEX.get<ShareMetadata>(buildIdKey(shareId), {
    type: "json",
  });

const readShareByToken = async (env: ShareWorkerEnv, token: string) => {
  const shareId = await env.SHARE_INDEX.get<string>(buildTokenKey(token), {
    type: "text",
  });

  if (!shareId) {
    return null;
  }

  return readShareById(env, shareId);
};

const writeShare = async (env: ShareWorkerEnv, share: ShareMetadata) => {
  await env.SHARE_INDEX.put(buildIdKey(share.id), JSON.stringify(share));
  await env.SHARE_INDEX.put(buildTokenKey(share.token), share.id);
};

const ensureAuthorizedWriteRequest = (
  request: Request,
  env: ShareWorkerEnv
) => {
  const expectedToken = getOptionalValue(env.SHARE_API_TOKEN);

  if (!expectedToken) {
    return;
  }

  const authorizationHeader = request.headers.get("authorization");
  const providedToken = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length).trim()
    : null;

  if (providedToken !== expectedToken) {
    throw new ShareServiceError("Unauthorized.", 401, "unauthorized");
  }
};

const toPublicShare = (
  request: Request,
  env: ShareWorkerEnv,
  share: ShareMetadata
) => ({
  id: share.id,
  directUrl: `${normalizeBaseUrl(getBaseUrl(request, env))}/s/${share.token}`,
  contentHash: share.contentHash,
  lastSharedAt: share.updatedAt,
  requiresPassword: share.passwordHash !== null,
});

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

const resolvePasswordFields = async (
  env: ShareWorkerEnv,
  existingShare: ShareMetadata | null,
  password: string | null | undefined,
  removePassword: boolean | undefined
) => {
  if (removePassword) {
    return {
      passwordHash: null,
      passwordSalt: null,
    };
  }

  const normalizedPassword = normalizePassword(password);

  if (normalizedPassword === null) {
    return {
      passwordHash: existingShare?.passwordHash ?? null,
      passwordSalt: existingShare?.passwordSalt ?? null,
    };
  }

  if (normalizedPassword.length > MAX_PASSWORD_LENGTH) {
    throw new ShareServiceError("The share password is too long.");
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

const verifyPassword = async (
  env: ShareWorkerEnv,
  share: ShareMetadata,
  password: string | null | undefined
) => {
  if (!share.passwordHash || !share.passwordSalt) {
    return;
  }

  const normalizedPassword = normalizePassword(password);

  if (!normalizedPassword) {
    throw new ShareServiceError(
      "This shared document is protected by a password.",
      401,
      "password_required"
    );
  }

  const computedHash = await hashPassword(
    normalizedPassword,
    share.passwordSalt,
    getPasswordPepper(env)
  );

  if (computedHash !== share.passwordHash) {
    throw new ShareServiceError(
      "Incorrect share password.",
      401,
      "password_required"
    );
  }
};

const handleCreateShare = async (request: Request, env: ShareWorkerEnv) => {
  ensureAuthorizedWriteRequest(request, env);

  const body = (await request.json()) as ShareWritePayload;
  const content = body.content?.toString() ?? "";

  if (content.trim() === "") {
    throw new ShareServiceError("You cannot share an empty document.");
  }

  if (encoder.encode(content).byteLength > MAX_SHARE_SIZE) {
    throw new ShareServiceError("The document is too large to share.");
  }

  const existingShareId = body.existingShareId?.trim() || null;
  const existingShare = existingShareId
    ? await readShareById(env, existingShareId)
    : null;

  if (existingShareId && !existingShare) {
    throw new ShareServiceError("This share could not be found.", 404);
  }

  const now = new Date().toISOString();
  const nextShareId = existingShare?.id ?? crypto.randomUUID();
  const passwordFields = await resolvePasswordFields(
    env,
    existingShare,
    body.password,
    body.removePassword
  );
  const nextShare: ShareMetadata = {
    id: nextShareId,
    token: existingShare?.token ?? createToken(getTokenBytes(env)),
    objectKey: existingShare?.objectKey ?? buildObjectKey(nextShareId),
    fileName: sanitizeFileName(body.name),
    contentHash: await computeHash(content),
    passwordHash: passwordFields.passwordHash,
    passwordSalt: passwordFields.passwordSalt,
    createdAt: existingShare?.createdAt ?? now,
    updatedAt: now,
  };

  await env.SHARE_BUCKET.put(nextShare.objectKey, content, {
    httpMetadata: {
      contentDisposition: `inline; filename="${nextShare.fileName}"`,
      contentType: "text/markdown; charset=utf-8",
    },
    customMetadata: {
      shareId: nextShare.id,
      contentHash: nextShare.contentHash,
    },
  });
  await writeShare(env, nextShare);

  return json({
    share: toPublicShare(request, env, nextShare),
  });
};

const handleReadShare = async (
  request: Request,
  env: ShareWorkerEnv,
  token: string
) => {
  if (!token) {
    throw new ShareServiceError("This shared document was not found.", 404);
  }

  const share = await readShareByToken(env, token);

  if (!share) {
    throw new ShareServiceError("This shared document was not found.", 404);
  }

  await verifyPassword(
    env,
    share,
    request.headers.get("x-markdown-share-password")
  );

  const object = await env.SHARE_BUCKET.get(share.objectKey);

  if (!object) {
    throw new ShareServiceError("This shared document was not found.", 404);
  }

  return new Response(await object.text(), {
    headers: {
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": [
        `inline; filename="${share.fileName}"`,
        `filename*=UTF-8''${encodeContentDispositionFileName(share.fileName)}`,
      ].join("; "),
      etag: `"${share.contentHash}"`,
    },
  });
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

const handleCreateCollaborationRoom = async (
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

const handleJoinCollaborationRoom = async (
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

    if (!inviteToken || (await computeHash(`invite:${inviteToken}`)) !== room.inviteTokenHash) {
      throw new ShareServiceError("Invalid invite token.", 403);
    }
  }

  if (room.accessMode === "password") {
    if (!room.passwordHash || !room.passwordSalt) {
      throw new ShareServiceError("Collaboration password is misconfigured.", 500);
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

const handleCollaborationWebSocket = async (
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

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const MESSAGE_QUERY_AWARENESS = 3;

type WebSocketMessagePayload =
  | string
  | ArrayBuffer
  | Uint8Array
  | ArrayBufferView
  | Blob;

const toUint8Array = async (data: WebSocketMessagePayload) => {
  if (data instanceof Uint8Array) {
    return data;
  }

  if (typeof Blob !== "undefined" && data instanceof Blob) {
    return new Uint8Array(await data.arrayBuffer());
  }

  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }

  if (typeof data === "string") {
    return encoder.encode(data);
  }

  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  return new Uint8Array(0);
};

export class CollaborationRoom {
  private readonly state: DurableObjectStateLike;
  private readonly doc: Y.Doc;
  private readonly awareness: awarenessProtocol.Awareness;
  private readonly sockets: Set<WebSocket>;
  private readonly socketClients: Map<WebSocket, Set<number>>;

  constructor(state: DurableObjectStateLike, _env: ShareWorkerEnv) {
    void _env;
    this.state = state;
    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    this.sockets = new Set();
    this.socketClients = new Map();

    this.state.blockConcurrencyWhile(async () => {
      const storedUpdate = await this.state.storage.get<ArrayBuffer>("ydoc-state");

      if (storedUpdate) {
        Y.applyUpdate(this.doc, new Uint8Array(storedUpdate));
      }
    });

    this.doc.on("update", (update, origin) => {
      const snapshot = Y.encodeStateAsUpdate(this.doc);
      const persisted = snapshot.buffer.slice(
        snapshot.byteOffset,
        snapshot.byteOffset + snapshot.byteLength
      );

      this.state.waitUntil(this.state.storage.put("ydoc-state", persisted));

      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);

      for (const socket of this.sockets) {
        if (socket !== origin && socket.readyState === WebSocket.OPEN) {
          socket.send(message);
        }
      }
    });

    this.awareness.on(
      "update",
      (
        {
          added,
          updated,
          removed,
        }: {
          added: number[];
          updated: number[];
          removed: number[];
        },
        origin: unknown
      ) => {
        const changedClients = added.concat(updated, removed);
        const update = awarenessProtocol.encodeAwarenessUpdate(
          this.awareness,
          changedClients
        );
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(encoder, update);
        const message = encoding.toUint8Array(encoder);

        for (const socket of this.sockets) {
          if (socket !== origin && socket.readyState === WebSocket.OPEN) {
            socket.send(message);
          }
        }
      }
    );
  }

  private sendInitialAwareness(socket: WebSocket) {
    const awarenessStates = Array.from(this.awareness.getStates().keys());

    if (awarenessStates.length === 0) {
      return;
    }

    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, awarenessStates)
    );
    socket.send(encoding.toUint8Array(awarenessEncoder));
  }

  private trackSocketAwareness(
    socket: WebSocket,
    update: Uint8Array
  ) {
    const decoder = decoding.createDecoder(update);
    const size = decoding.readVarUint(decoder);
    const trackedClientIds = this.socketClients.get(socket) ?? new Set<number>();

    for (let index = 0; index < size; index += 1) {
      trackedClientIds.add(decoding.readVarUint(decoder));
      decoding.readVarUint(decoder);
      decoding.readVarString(decoder);
    }

    this.socketClients.set(socket, trackedClientIds);
  }

  private async handleSocketMessage(
    socket: WebSocket,
    payload: WebSocketMessagePayload
  ) {
    const message = await toUint8Array(payload);

    if (message.length === 0) {
      return;
    }

    const decoder = decoding.createDecoder(message);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case MESSAGE_SYNC: {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        const syncMessageType = syncProtocol.readSyncMessage(
          decoder,
          encoder,
          this.doc,
          socket
        );
        const reply = encoding.toUint8Array(encoder);

        if (reply.length > 1 && socket.readyState === WebSocket.OPEN) {
          socket.send(reply);
        }

        if (
          syncMessageType === syncProtocol.messageYjsSyncStep1 &&
          socket.readyState === WebSocket.OPEN
        ) {
          const syncStep1Encoder = encoding.createEncoder();
          encoding.writeVarUint(syncStep1Encoder, MESSAGE_SYNC);
          syncProtocol.writeSyncStep1(syncStep1Encoder, this.doc);
          socket.send(encoding.toUint8Array(syncStep1Encoder));
        }
        break;
      }
      case MESSAGE_AWARENESS: {
        const update = decoding.readVarUint8Array(decoder);
        this.trackSocketAwareness(socket, update);
        awarenessProtocol.applyAwarenessUpdate(this.awareness, update, socket);
        break;
      }
      case MESSAGE_QUERY_AWARENESS: {
        const awarenessStates = Array.from(this.awareness.getStates().keys());

        if (awarenessStates.length === 0) {
          break;
        }

        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(this.awareness, awarenessStates)
        );
        socket.send(encoding.toUint8Array(encoder));
        break;
      }
      default:
        break;
    }
  }

  async fetch(request: Request) {
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected websocket upgrade", { status: 426 });
    }

    const webSocketPair = new WebSocketPair();
    const client = webSocketPair[0];
    const server = webSocketPair[1] as WebSocket & { accept: () => void };
    server.accept();
    this.sockets.add(server);
    this.socketClients.set(server, new Set());
    this.sendInitialAwareness(server);

    server.addEventListener("message", (event) => {
      void (async () => {
        try {
          await this.handleSocketMessage(
            server,
            event.data as WebSocketMessagePayload
          );
        } catch {
          if (server.readyState === WebSocket.OPEN) {
            server.close(1011, "Invalid collaboration message.");
          }
        }
      })();
    });

    server.addEventListener("close", () => {
      this.sockets.delete(server);
      const awarenessClientIds = Array.from(this.socketClients.get(server) ?? []);
      this.socketClients.delete(server);

      if (awarenessClientIds.length > 0) {
        awarenessProtocol.removeAwarenessStates(
          this.awareness,
          awarenessClientIds,
          server
        );
      }
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    } as ResponseInit & { webSocket: WebSocket });
  }
}

const handleError = (error: unknown) => {
  if (error instanceof ShareServiceError) {
    return json(
      {
        error: error.message,
        ...(error.code === "password_required"
          ? {
              requiresPassword: true,
            }
          : {}),
      },
      error.status
    );
  }

  return json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Unexpected share service error.",
    },
    500
  );
};

const shareWorker = {
  async fetch(request: Request, env: ShareWorkerEnv) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-headers":
            "authorization, content-type, x-markdown-share-password",
          "access-control-allow-methods": "GET, OPTIONS, POST",
          "access-control-allow-origin": "*",
        },
      });
    }

    try {
      if (request.method === "GET" && url.pathname === "/health") {
        return json({ ok: true });
      }

      if (request.method === "POST" && url.pathname === "/v1/shares") {
        return await handleCreateShare(request, env);
      }

      if (request.method === "POST" && url.pathname === "/v1/collab/rooms") {
        return await handleCreateCollaborationRoom(request, env);
      }

      if (request.method === "POST" && url.pathname === "/v1/collab/join") {
        return await handleJoinCollaborationRoom(request, env);
      }

      if (
        request.method === "GET" &&
        url.pathname.startsWith("/v1/collab/connect/")
      ) {
        return await handleCollaborationWebSocket(
          request,
          env,
          decodeURIComponent(url.pathname.slice("/v1/collab/connect/".length))
        );
      }

      if (request.method === "GET" && url.pathname.startsWith("/s/")) {
        return await handleReadShare(
          request,
          env,
          decodeURIComponent(url.pathname.slice("/s/".length))
        );
      }

      return json({ error: "Not found." }, 404);
    } catch (error) {
      return handleError(error);
    }
  },
};

export default shareWorker;
