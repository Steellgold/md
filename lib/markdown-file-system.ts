"use client";

import { getMarkdownDocumentStats, sortRecentFiles } from "@/lib/markdown-helpers";
import { persistRecentEntry, reopenLocalRecentFile } from "@/lib/markdown-file-system-core";
import {
  createNewMarkdownFile,
  openDroppedMarkdownFiles,
  openMarkdownWithInputPicker,
  openMarkdownWithPicker,
} from "@/lib/markdown-local-open";
import { openMarkdownFromUrl } from "@/lib/markdown-remote-open";
import {
  buildRelativeWorkspaceLink,
  isInternalMarkdownLink,
  resolveWorkspaceRelativePath,
} from "@/lib/parsing/workspace-links";
import {
  ensurePermission,
  supportsDirectoryPicker,
  supportsOpenFilePicker,
} from "@/lib/adapters/browser-file-system-adapter";
import { requestMarkdownShare } from "@/lib/adapters/remote-markdown-adapter";
import { deleteHandle, getHandle } from "@/lib/persistence/file-handles-repo";
import {
  openMarkdownFolder,
  openWorkspaceMarkdownPage,
  reopenRecentWorkspace,
} from "@/lib/markdown-workspace-file-system";
import {
  readRecentFilesFromStorage,
  writeRecentFilesToStorage,
} from "@/lib/persistence/recent-files-repo";
import {
  type MarkdownFileHandle,
  type MarkdownShareOptions,
  type RecentMarkdownFile,
} from "@/types/markdown";

export {
  buildRelativeWorkspaceLink,
  isInternalMarkdownLink,
  resolveWorkspaceRelativePath,
};

export {
  openMarkdownFolder,
  openWorkspaceMarkdownPage,
  reopenRecentWorkspace,
};

export {
  createNewMarkdownFile,
  openDroppedMarkdownFiles,
  openMarkdownWithInputPicker,
  openMarkdownFromUrl,
  openMarkdownWithPicker,
};

export const reopenRecentMarkdownFile = async (id: string) => {
  const knownEntry = readRecentFilesFromStorage().find(
    (file) => file.id === id
  );

  if (!knownEntry) {
    throw new Error("The recent file entry could not be found.");
  }

  if (knownEntry.source === "url") {
    if (!knownEntry.url) {
      throw new Error("This remote document is missing its source URL.");
    }

    const result = await openMarkdownFromUrl(knownEntry.url, {
      id: knownEntry.id,
      fileName: knownEntry.urlFileName ?? undefined,
    });

    if (result.status === "selection-required") {
      return {
        status: "selection-required" as const,
        url: knownEntry.url,
        files: result.files,
      };
    }

    if (result.status === "password-required") {
      return {
        status: "password-required" as const,
        url: knownEntry.url,
        fileName: knownEntry.urlFileName ?? undefined,
      };
    }

    return result;
  }

  if (knownEntry.source === "workspace") {
    return reopenRecentWorkspace(knownEntry);
  }

  return reopenLocalRecentFile(knownEntry);
};

export const saveRecentMarkdownFile = async (id: string, content: string) => {
  const knownEntry = readRecentFilesFromStorage().find(
    (file) => file.id === id
  );

  if (knownEntry?.source === "url") {
    throw new Error(
      "Remote documents are read-only. Save the content to a local file instead."
    );
  }

  const handle = await getHandle(id);

  if (!handle) {
    throw new Error(
      "This file cannot be saved because local access is unavailable."
    );
  }

  const markdownHandle = handle as MarkdownFileHandle;
  const hasPermission = await ensurePermission(markdownHandle, "readwrite");

  if (!hasPermission) {
    throw new Error("Write permission was denied for this local file.");
  }

  if (!markdownHandle.createWritable) {
    throw new Error("This browser does not support writing to local files.");
  }

  const writable = await markdownHandle.createWritable();
  await writable.write(content);
  await writable.close();

  if (!knownEntry) {
    throw new Error("The recent file entry could not be found.");
  }

  const nextEntry = {
    ...knownEntry,
    name: handle.name,
    lastOpenedAt: new Date().toISOString(),
    stats: getMarkdownDocumentStats(content),
  } satisfies RecentMarkdownFile;

  const recentFiles = persistRecentEntry(nextEntry);

  return { entry: nextEntry, recentFiles };
};

export const getRecentMarkdownFiles = () =>
  sortRecentFiles(readRecentFilesFromStorage());

export const canUsePersistentLocalFiles = () =>
  supportsOpenFilePicker() || supportsDirectoryPicker();

export const removeRecentMarkdownFile = async (id: string) => {
  const nextFiles = readRecentFilesFromStorage().filter(
    (file) => file.id !== id
  );
  writeRecentFilesToStorage(nextFiles);
  await deleteHandle(id);
  return nextFiles;
};

export const syncRecentMarkdownFileSnapshot = async (
  id: string,
  content: string
) => {
  const nextFiles = readRecentFilesFromStorage().map((file) =>
    file.id === id
      ? {
          ...file,
          stats: getMarkdownDocumentStats(content),
        }
      : file
  );

  writeRecentFilesToStorage(nextFiles);
  return nextFiles;
};

export const clearRecentMarkdownFiles = async () => {
  const recentFiles = readRecentFilesFromStorage();

  await Promise.all(recentFiles.map((file) => deleteHandle(file.id)));
  writeRecentFilesToStorage([]);

  return [];
};

export const shareRecentMarkdownFile = async (
  id: string,
  content: string,
  options: MarkdownShareOptions = {}
) => {
  const knownEntry = readRecentFilesFromStorage().find(
    (file) => file.id === id
  );

  if (!knownEntry) {
    throw new Error("The recent file entry could not be found.");
  }

  const result = await requestMarkdownShare(
    knownEntry.name,
    content,
    knownEntry.share?.id,
    options
  );
  const nextEntry = {
    ...knownEntry,
    share: result.share,
    stats: getMarkdownDocumentStats(content),
  } satisfies RecentMarkdownFile;
  const recentFiles = persistRecentEntry(nextEntry);

  return {
    entry: nextEntry,
    recentFiles,
    share: result.share,
  };
};

export const setRecentMarkdownFileShare = (
  id: string,
  share: RecentMarkdownFile["share"]
) => {
  const knownEntry = readRecentFilesFromStorage().find(
    (file) => file.id === id
  );

  if (!knownEntry) {
    throw new Error("The recent file entry could not be found.");
  }

  const nextEntry = {
    ...knownEntry,
    share,
  } satisfies RecentMarkdownFile;

  return persistRecentEntry(nextEntry);
};
