"use client";

import {
  MARKDOWN_FILE_TYPES,
  getMarkdownDocumentStats,
  sortRecentFiles,
  upsertRecentFile,
} from "@/lib/markdown-helpers";
import {
  type DataTransferItemWithHandle,
  type MarkdownFileHandle,
  type OpenFilePickerOptions,
  type PermissionMode,
  type PickerOptions,
  type RecentMarkdownFile,
} from "@/types/markdown";

const RECENT_FILES_KEY = "markdown-app:recent-files";
const DB_NAME = "markdown-app";
const DB_VERSION = 1;
const HANDLE_STORE = "file-handles";

declare global {
  interface Window {
    showOpenFilePicker?: (
      options?: OpenFilePickerOptions
    ) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?: (
      options?: import("@/types/markdown").SaveFilePickerOptions
    ) => Promise<FileSystemFileHandle>;
  }
}

const isBrowser = () => typeof window !== "undefined";

const supportsOpenFilePicker = () =>
  isBrowser() && typeof window.showOpenFilePicker === "function";

const supportsLocalStorage = () =>
  isBrowser() && typeof window.localStorage !== "undefined";

const openDatabase = () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(HANDLE_STORE)) {
        database.createObjectStore(HANDLE_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB unavailable"));
  });
};

const withStore = <T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
) => {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(HANDLE_STORE, mode);
        const store = transaction.objectStore(HANDLE_STORE);
        const request = callback(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error("IndexedDB request failed"));

        transaction.oncomplete = () => database.close();
        transaction.onerror = () =>
          reject(
            transaction.error ?? new Error("IndexedDB transaction failed")
          );
      })
  );
};

const readRecentFilesFromStorage = () => {
  if (!supportsLocalStorage()) {
    return [] as RecentMarkdownFile[];
  }

  const raw = window.localStorage.getItem(RECENT_FILES_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as RecentMarkdownFile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeRecentFilesToStorage = (files: RecentMarkdownFile[]) => {
  if (!supportsLocalStorage()) {
    return;
  }

  window.localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(files));
};

const saveHandle = async (id: string, handle: FileSystemFileHandle) => {
  await withStore("readwrite", (store) => store.put(handle, id));
};

const deleteHandle = async (id: string) => {
  await withStore("readwrite", (store) => store.delete(id));
};

const getHandle = async (id: string) => {
  return withStore<FileSystemFileHandle | undefined>("readonly", (store) =>
    store.get(id)
  );
};

const ensurePermission = async (
  handle: MarkdownFileHandle,
  mode: PermissionMode = "read"
) => {
  if (!handle.queryPermission || !handle.requestPermission) {
    return true;
  }

  const currentPermission = await handle.queryPermission({ mode });

  if (currentPermission === "granted") {
    return true;
  }

  const requestedPermission = await handle.requestPermission({ mode });
  return requestedPermission === "granted";
};

const readContent = async (handle: FileSystemFileHandle) => {
  const file = await handle.getFile();
  return file.text();
};

const createEntryFromHandle = async (
  handle: FileSystemFileHandle,
  source: RecentMarkdownFile["source"],
  content: string,
  id = crypto.randomUUID()
) => {
  return {
    id,
    name: handle.name,
    path: null,
    url: null,
    urlFileName: null,
    lastOpenedAt: new Date().toISOString(),
    source,
    stats: getMarkdownDocumentStats(content),
  } satisfies RecentMarkdownFile;
};

const requestMarkdownFromUrl = async (
  url: string,
  fileName?: string
): Promise<
  | {
      status: "opened";
      content: string;
      name: string;
      selectedFileName: string | null;
      url: string;
    }
  | {
      status: "selection-required";
      files: string[];
    }
> => {
  const response = await fetch("/api/open-from-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, fileName }),
  });

  const payload = (await response.json()) as {
    content?: string;
    error?: string;
    files?: string[];
    name?: string;
    selectedFileName?: string | null;
    url?: string;
  };

  if (
    response.status === 409 &&
    Array.isArray(payload.files) &&
    payload.files.every((item) => typeof item === "string")
  ) {
    return {
      status: "selection-required",
      files: payload.files,
    };
  }

  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to open the remote URL.");
  }

  if (
    typeof payload.content !== "string" ||
    typeof payload.name !== "string" ||
    typeof payload.url !== "string"
  ) {
    throw new Error("The remote URL returned an invalid response.");
  }

  return {
    status: "opened",
    content: payload.content,
    name: payload.name,
    selectedFileName:
      typeof payload.selectedFileName === "string"
        ? payload.selectedFileName
        : null,
    url: payload.url,
  };
};

const findMatchingRemoteFile = (url: string, fileName: string | null) =>
  readRecentFilesFromStorage().find(
    (file) =>
      file.source === "url" &&
      file.url === url &&
      file.urlFileName === fileName
  ) ?? null;

const findMatchingRecentFile = async (handle: FileSystemFileHandle) => {
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

const persistRecentEntry = (entry: RecentMarkdownFile) => {
  const nextFiles = upsertRecentFile(readRecentFilesFromStorage(), entry);
  writeRecentFilesToStorage(nextFiles);
  return nextFiles;
};

export const openMarkdownWithPicker = async (options: PickerOptions = {}) => {
  if (!supportsOpenFilePicker()) {
    throw new Error(
      "This browser does not support persistent local file access."
    );
  }

  const [handle] = await window.showOpenFilePicker!({
    id: options.id ?? "markdown-open",
    multiple: false,
    excludeAcceptAllOption: true,
    types: MARKDOWN_FILE_TYPES,
  });

  const hasPermission = await ensurePermission(handle as MarkdownFileHandle);

  if (!hasPermission) {
    throw new Error("Read permission was denied.");
  }

  const content = await readContent(handle);
  const existingEntry = await findMatchingRecentFile(handle);
  const entry = await createEntryFromHandle(
    handle,
    options.source ?? "picker",
    content,
    existingEntry?.id ?? options.id
  );

  await saveHandle(entry.id, handle);
  const recentFiles = persistRecentEntry({
    ...entry,
    path: existingEntry?.path ?? entry.path,
  });

  return { entry, content, recentFiles };
};

export const openMarkdownFromUrl = async (
  url: string,
  options: {
    fileName?: string;
    id?: string;
  } = {}
) => {
  const normalizedUrl = url.trim();

  if (!normalizedUrl) {
    throw new Error("Enter a URL to open.");
  }

  const result = await requestMarkdownFromUrl(normalizedUrl, options.fileName);

  if (result.status === "selection-required") {
    return result;
  }

  const existingEntry =
    readRecentFilesFromStorage().find((file) => file.id === options.id) ??
    findMatchingRemoteFile(result.url, result.selectedFileName);

  const entry = {
    id: existingEntry?.id ?? options.id ?? crypto.randomUUID(),
    name: result.name,
    path: null,
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

export const openDroppedMarkdownFile = async (
  file: File,
  items?: DataTransferItemList | null
) => {
  let handle: FileSystemFileHandle | null = null;

  if (items) {
    for (const item of Array.from(items)) {
      const itemWithHandle = item as DataTransferItemWithHandle;
      const maybeHandle = itemWithHandle.getAsFileSystemHandle
        ? await itemWithHandle.getAsFileSystemHandle()
        : null;

      if (maybeHandle?.kind === "file") {
        handle = maybeHandle as FileSystemFileHandle;
        break;
      }
    }
  }

  const content = await file.text();

  if (!handle) {
    return {
      entry: {
        id: crypto.randomUUID(),
        name: file.name,
        path: file.webkitRelativePath || null,
        url: null,
        urlFileName: null,
        lastOpenedAt: new Date().toISOString(),
        source: "drop",
        stats: getMarkdownDocumentStats(content),
      } satisfies RecentMarkdownFile,
      content,
      recentFiles: readRecentFilesFromStorage(),
    };
  }

  const hasPermission = await ensurePermission(handle as MarkdownFileHandle);

  if (!hasPermission) {
    throw new Error("Read permission for the dropped file was denied.");
  }

  const existingEntry = await findMatchingRecentFile(handle);
  const entry = {
    ...(await createEntryFromHandle(handle, "drop", content, existingEntry?.id)),
    path: file.webkitRelativePath || existingEntry?.path || null,
  } satisfies RecentMarkdownFile;

  await saveHandle(entry.id, handle);
  const recentFiles = persistRecentEntry(entry);

  return { entry, content, recentFiles };
};

export const reopenRecentMarkdownFile = async (id: string) => {
  const knownEntry = readRecentFilesFromStorage().find((file) => file.id === id);

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
      throw new Error(
        "This remote document needs a file selection again. Open it from URL to choose the file."
      );
    }

    return result;
  }

  const handle = await getHandle(id);

  if (!handle) {
    throw new Error("This recent file is no longer available in the browser.");
  }

  const hasPermission = await ensurePermission(handle as MarkdownFileHandle);

  if (!hasPermission) {
    throw new Error("Permission is required to reopen this file.");
  }

  const content = await readContent(handle);
  const nextEntry = {
    ...knownEntry,
    name: handle.name,
    lastOpenedAt: new Date().toISOString(),
    stats: getMarkdownDocumentStats(content),
  } satisfies RecentMarkdownFile;

  const recentFiles = persistRecentEntry(nextEntry);

  return { entry: nextEntry, content, recentFiles };
};

export const saveRecentMarkdownFile = async (id: string, content: string) => {
  const knownEntry = readRecentFilesFromStorage().find((file) => file.id === id);

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

export const canUsePersistentLocalFiles = () => supportsOpenFilePicker();

export const createNewMarkdownFile = async (initialContent = "") => {
  if (
    !supportsOpenFilePicker() ||
    typeof window.showSaveFilePicker !== "function"
  ) {
    throw new Error("This browser does not support saving local files.");
  }

  const handle = await window.showSaveFilePicker({
    id: "markdown-save",
    suggestedName: "Untitled.md",
    excludeAcceptAllOption: true,
    types: MARKDOWN_FILE_TYPES,
  });

  const markdownHandle = handle as MarkdownFileHandle;
  const hasPermission = await ensurePermission(markdownHandle, "readwrite");

  if (!hasPermission) {
    throw new Error("Write permission was denied for this local file.");
  }

  if (!markdownHandle.createWritable) {
    throw new Error("This browser does not support writing to local files.");
  }

  const writable = await markdownHandle.createWritable();
  await writable.write(initialContent);
  await writable.close();

  const existingEntry = await findMatchingRecentFile(handle);
  const entry = await createEntryFromHandle(
    handle,
    "picker",
    initialContent,
    existingEntry?.id
  );

  await saveHandle(entry.id, handle);
  const recentFiles = persistRecentEntry({
    ...entry,
    path: existingEntry?.path ?? entry.path,
  });

  return { entry, content: initialContent, recentFiles };
};

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
