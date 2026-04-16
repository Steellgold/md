"use client";

import {
  MARKDOWN_FILE_TYPES,
  sortRecentFiles,
  upsertRecentFile,
} from "@/lib/markdown-helpers";
import {
  type DataTransferItemWithHandle,
  type MarkdownFileHandle,
  type OpenFilePickerOptions,
  type PickerOptions,
  type PermissionMode,
  type RecentMarkdownFile,
} from "@/lib/markdown-types";

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
      options?: import("@/lib/markdown-types").SaveFilePickerOptions
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
  id = crypto.randomUUID()
) => {
  return {
    id,
    name: handle.name,
    path: null,
    lastOpenedAt: new Date().toISOString(),
    source,
  } satisfies RecentMarkdownFile;
};

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

  const existingEntry = await findMatchingRecentFile(handle);
  const entry = await createEntryFromHandle(
    handle,
    options.source ?? "picker",
    existingEntry?.id ?? options.id
  );
  const content = await readContent(handle);

  await saveHandle(entry.id, handle);
  const recentFiles = persistRecentEntry({
    ...entry,
    path: existingEntry?.path ?? entry.path,
  });

  return { entry, content, recentFiles };
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
        lastOpenedAt: new Date().toISOString(),
        source: "drop",
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
    ...(await createEntryFromHandle(handle, "drop", existingEntry?.id)),
    path: file.webkitRelativePath || existingEntry?.path || null,
  } satisfies RecentMarkdownFile;

  await saveHandle(entry.id, handle);
  const recentFiles = persistRecentEntry(entry);

  return { entry, content, recentFiles };
};

export const reopenRecentMarkdownFile = async (id: string) => {
  const handle = await getHandle(id);

  if (!handle) {
    throw new Error("This recent file is no longer available in the browser.");
  }

  const hasPermission = await ensurePermission(handle as MarkdownFileHandle);

  if (!hasPermission) {
    throw new Error("Permission is required to reopen this file.");
  }

  const knownEntry = readRecentFilesFromStorage().find(
    (file) => file.id === id
  );

  if (!knownEntry) {
    throw new Error("The recent file entry could not be found.");
  }

  const nextEntry = {
    ...knownEntry,
    name: handle.name,
    lastOpenedAt: new Date().toISOString(),
  } satisfies RecentMarkdownFile;

  const content = await readContent(handle);
  const recentFiles = persistRecentEntry(nextEntry);

  return { entry: nextEntry, content, recentFiles };
};

export const saveRecentMarkdownFile = async (id: string, content: string) => {
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

  const knownEntry = readRecentFilesFromStorage().find(
    (file) => file.id === id
  );

  if (!knownEntry) {
    throw new Error("The recent file entry could not be found.");
  }

  const nextEntry = {
    ...knownEntry,
    name: handle.name,
    lastOpenedAt: new Date().toISOString(),
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

export const clearRecentMarkdownFiles = async () => {
  const recentFiles = readRecentFilesFromStorage();

  await Promise.all(recentFiles.map((file) => deleteHandle(file.id)));
  writeRecentFilesToStorage([]);

  return [];
};
