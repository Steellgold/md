import { ShareServiceError } from "./http/errors";
import { json } from "./http/response";

type DurableObjectNamespace = {
  idFromName: (name: string) => unknown;
  get: (id: unknown) => {
    fetch: (request: Request) => Promise<Response>;
  };
};

const MAX_SHARE_SIZE = 2 * 1024 * 1024;
const MAX_PASSWORD_LENGTH = 256;
const DEFAULT_FILE_NAME = "document.md";

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

export type ShareWorkerEnv = {
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

const encoder = new TextEncoder();

const buildIdKey = (id: string) => `share:id:${id}`;
const buildTokenKey = (token: string) => `share:token:${token}`;
const buildObjectKey = (shareId: string) => `shares/${shareId}/current.md`;

const getOptionalValue = (value: string | undefined) => {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
};

export const getBaseUrl = (request: Request, env: ShareWorkerEnv) =>
  getOptionalValue(env.SHARE_BASE_URL) ?? new URL(request.url).origin;

const getTokenBytes = (env: ShareWorkerEnv) => {
  const parsedValue = Number.parseInt(env.SHARE_TOKEN_BYTES ?? "", 10);
  return Number.isFinite(parsedValue) && parsedValue >= 16 ? parsedValue : 24;
};

export const getPasswordPepper = (env: ShareWorkerEnv) =>
  getOptionalValue(env.SHARE_PASSWORD_PEPPER) ?? "";

const encodeContentDispositionFileName = (value: string) =>
  encodeURIComponent(value).replace(
    /['()*]/gu,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );

export const normalizeBaseUrl = (value: string) => value.replace(/\/+$/u, "");

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

export const normalizePassword = (value: string | null | undefined) => {
  const trimmedValue = (value ?? "").trim();
  return trimmedValue === "" ? null : trimmedValue;
};

export const computeHash = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};

export const hashPassword = async (password: string, salt: string, pepper: string) =>
  computeHash(`${salt}:${password}:${pepper}`);

export const createToken = (byteLength: number) => {
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

export const ensureAuthorizedWriteRequest = (
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

export const handleCreateShare = async (request: Request, env: ShareWorkerEnv) => {
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

export const handleReadShare = async (
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
