"use client";

import { getMarkdownDocumentStats, upsertRecentFile } from "@/lib/markdown-helpers";
import {
  ensurePermission,
  readMarkdownFileContent,
} from "@/lib/adapters/browser-file-system-adapter";
import { getHandle } from "@/lib/persistence/file-handles-repo";
import {
  readRecentFilesFromStorage,
  writeRecentFilesToStorage,
} from "@/lib/persistence/recent-files-repo";
import { type MarkdownFileHandle, type RecentMarkdownFile } from "@/types/markdown";

export const createEntryFromHandle = async (
  handle: FileSystemFileHandle,
  source: RecentMarkdownFile["source"],
  content: string,
  id = crypto.randomUUID(),
  share: RecentMarkdownFile["share"] = null
) => {
  return {
    id,
    name: handle.name,
    path: null,
    share,
    url: null,
    urlFileName: null,
    lastOpenedAt: new Date().toISOString(),
    source,
    stats: getMarkdownDocumentStats(content),
  } satisfies RecentMarkdownFile;
};

export const findMatchingRemoteFile = (url: string, fileName: string | null) =>
  readRecentFilesFromStorage().find(
    (file) =>
      file.source === "url" && file.url === url && file.urlFileName === fileName
  ) ?? null;

export const findMatchingRecentFile = async (handle: FileSystemFileHandle) => {
  const recentFiles = readRecentFilesFromStorage();

  for (const file of recentFiles) {
    const savedHandle = await getHandle(file.id);

    if (!savedHandle) {
      continue;
    }

    const canCompare =
      typeof (savedHandle as MarkdownFileHandle).isSameEntry === "function";

    if (
      canCompare &&
      (await (savedHandle as MarkdownFileHandle).isSameEntry!(handle))
    ) {
      return file;
    }
  }

  return null;
};

export const persistRecentEntry = (entry: RecentMarkdownFile) => {
  const nextFiles = upsertRecentFile(readRecentFilesFromStorage(), entry);
  writeRecentFilesToStorage(nextFiles);
  return nextFiles;
};

export const persistRecentEntries = (entries: RecentMarkdownFile[]) => {
  const nextFiles = entries.reduce(
    (files, entry) => upsertRecentFile(files, entry),
    readRecentFilesFromStorage()
  );

  writeRecentFilesToStorage(nextFiles);
  return nextFiles;
};

export const reopenLocalRecentFile = async (knownEntry: RecentMarkdownFile) => {
  const handle = await getHandle(knownEntry.id);

  if (!handle) {
    throw new Error("This recent file is no longer available in the browser.");
  }

  if (handle.kind !== "file") {
    throw new Error("The saved file handle is invalid.");
  }

  const fileHandle = handle as MarkdownFileHandle;

  const hasPermission = await ensurePermission(fileHandle);

  if (!hasPermission) {
    throw new Error("Permission is required to reopen this file.");
  }

  const content = await readMarkdownFileContent(fileHandle);
  const nextEntry = {
    ...knownEntry,
    name: fileHandle.name,
    lastOpenedAt: new Date().toISOString(),
    stats: getMarkdownDocumentStats(content),
  } satisfies RecentMarkdownFile;
  const recentFiles = persistRecentEntry(nextEntry);

  return { entry: nextEntry, content, recentFiles };
};

export const createEntryFromFile = (
  file: File,
  content: string,
  source: RecentMarkdownFile["source"]
) => {
  return {
    id: crypto.randomUUID(),
    name: file.name,
    path: file.webkitRelativePath || null,
    share: null,
    url: null,
    urlFileName: null,
    lastOpenedAt: new Date().toISOString(),
    source,
    stats: getMarkdownDocumentStats(content),
  } satisfies RecentMarkdownFile;
};
