import { type MarkdownShare } from "@/types/markdown";

export const MAX_MARKDOWN_SHARE_SIZE = 2 * 1024 * 1024;
export const MAX_MARKDOWN_SHARE_PASSWORD_LENGTH = 256;

const DEFAULT_SHARED_FILE_NAME = "document.md";

const encoder = new TextEncoder();

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/u, "");

export const sanitizeMarkdownShareFileName = (
  value: string | null | undefined
) => {
  const trimmedValue = (value ?? "").trim();

  if (trimmedValue === "") {
    return DEFAULT_SHARED_FILE_NAME;
  }

  const sanitizedValue = trimmedValue.replace(/[\\/:*?"<>|]/gu, "-");

  if (sanitizedValue.endsWith(".md")) {
    return sanitizedValue;
  }

  return `${sanitizedValue}.md`;
};

export const computeMarkdownContentHash = async (content: string) => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(content));

  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0")
  ).join("");
};

export const normalizeMarkdownSharePassword = (
  value: string | null | undefined
) => {
  const trimmedValue = (value ?? "").trim();

  return trimmedValue === "" ? null : trimmedValue;
};

export const hashMarkdownSharePassword = async (
  password: string,
  salt: string,
  pepper = ""
) => computeMarkdownContentHash(`${salt}:${password}:${pepper}`);

export const createMarkdownShareToken = (byteLength = 24) => {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));

  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(
    ""
  );
};

export const buildMarkdownShareObjectKey = (shareId: string) =>
  `shares/${shareId}/current.md`;

export const buildMarkdownShareDirectUrl = (baseUrl: string, token: string) =>
  `${normalizeBaseUrl(baseUrl)}/s/${token}`;

export const buildMarkdownShareAppUrl = (
  baseUrl: string,
  directUrl: string
) => {
  const url = new URL(normalizeBaseUrl(baseUrl));
  url.pathname = "/";
  url.searchParams.set("open", directUrl);
  return url.toString();
};

export const isMarkdownShareDirectUrl = (value: string | null | undefined) => {
  const normalizedValue = (value ?? "").trim();

  if (!normalizedValue) {
    return false;
  }

  try {
    const url = new URL(normalizedValue);
    return /^\/s\/[^/]+$/u.test(url.pathname);
  } catch {
    return false;
  }
};

export const hasPendingMarkdownShareChanges = (
  share: MarkdownShare | null,
  contentHash: string | null
) => {
  if (!share || !contentHash) {
    return false;
  }

  return share.contentHash !== contentHash;
};
