"use client";

import { getMarkdownDocumentStats } from "@/lib/markdown-helpers";
import {
  findMatchingRemoteFile,
  persistRecentEntry,
  reopenLocalRecentFile,
} from "@/lib/markdown-file-system-core";
import {
  getShareTargetUrl,
  normalizeRemoteUrl,
  requestMarkdownFromUrl,
} from "@/lib/adapters/remote-markdown-adapter";
import { readRecentFilesFromStorage } from "@/lib/persistence/recent-files-repo";
import { type RecentMarkdownFile } from "@/types/markdown";

export const openMarkdownFromUrl = async (
  url: string,
  options: {
    fileName?: string;
    id?: string;
    password?: string;
  } = {}
) => {
  const normalizedUrl = url.trim();

  if (!normalizedUrl) {
    throw new Error("Enter a URL to open.");
  }

  const matchingSharedLocalFile = readRecentFilesFromStorage().find(
    (file) =>
      file.source !== "url" &&
      getShareTargetUrl(file.share?.url) === normalizeRemoteUrl(normalizedUrl)
  );

  if (matchingSharedLocalFile) {
    return {
      status: "opened" as const,
      ...(await reopenLocalRecentFile(matchingSharedLocalFile)),
    };
  }

  const result = await requestMarkdownFromUrl(
    normalizedUrl,
    options.fileName,
    options.password
  );

  if (
    result.status === "selection-required" ||
    result.status === "password-required"
  ) {
    return result;
  }

  const existingEntry =
    readRecentFilesFromStorage().find((file) => file.id === options.id) ??
    findMatchingRemoteFile(result.url, result.selectedFileName);

  const entry = {
    id: existingEntry?.id ?? options.id ?? crypto.randomUUID(),
    name: result.name,
    path: null,
    share: existingEntry?.share ?? null,
    url: result.url,
    urlFileName: result.selectedFileName,
    lastOpenedAt: new Date().toISOString(),
    source: "url",
    stats: getMarkdownDocumentStats(result.content),
  } satisfies RecentMarkdownFile;

  const recentFiles = persistRecentEntry(entry);

  return {
    status: "opened" as const,
    entry,
    content: result.content,
    recentFiles,
  };
};
