"use client";

import {
  MARKDOWN_FILE_TYPES,
  getMarkdownDocumentStats,
  sortRecentFiles,
  upsertRecentFile,
} from "@/lib/markdown-helpers";
import {
  type DataTransferItemWithHandle,
  type MarkdownDirectoryHandle,
  type MarkdownFileHandle,
  type MarkdownShare,
  type MarkdownShareOptions,
  type MarkdownShareResult,
  type MarkdownWorkspace,
  type MarkdownWorkspacePage,
  type OpenFilePickerOptions,
  type PendingMarkdownImport,
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
    showDirectoryPicker?: (options?: {
      id?: string;
      mode?: PermissionMode;
      startIn?: string;
    }) => Promise<FileSystemDirectoryHandle>;
  }
}

const isBrowser = () => typeof window !== "undefined";

const supportsOpenFilePicker = () =>
  isBrowser() && typeof window.showOpenFilePicker === "function";

const supportsDirectoryPicker = () =>
  isBrowser() && typeof window.showDirectoryPicker === "function";

const supportsLocalStorage = () =>
  isBrowser() && typeof window.localStorage !== "undefined";

const stripHashAndQuery = (value: string) =>
  value.replace(/[?#].*$/u, "").trim();

const decodeWorkspacePathSegment = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const normalizeWorkspacePath = (value: string) => {
  const sanitized = stripHashAndQuery(value).replace(/\\/gu, "/");

  if (!sanitized) {
    return null;
  }

  const normalized = sanitized
    .split("/")
    .map((segment) => decodeWorkspacePathSegment(segment))
    .filter((segment) => segment !== "" && segment !== ".")
    .reduce<string[] | null>((segments, segment) => {
      if (!segments) {
        return null;
      }

      if (segment === "..") {
        if (segments.length === 0) {
          return null;
        }

        return segments.slice(0, -1);
      }

      return segments.concat(segment);
    }, []);

  if (!normalized || normalized.length === 0) {
    return null;
  }

  return normalized.join("/");
};

const basename = (value: string) => {
  const normalized = value.replace(/\\/gu, "/");
  const segments = normalized.split("/");
  return segments.at(-1) ?? normalized;
};

const normalizeMarkdownContent = (content: string) =>
  content.replace(/\r\n/gu, "\n");

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

const saveHandle = async (id: string, handle: FileSystemHandle) => {
  await withStore("readwrite", (store) => store.put(handle, id));
};

const deleteHandle = async (id: string) => {
  await withStore("readwrite", (store) => store.delete(id));
};

const getHandle = async (id: string) => {
  return withStore<FileSystemHandle | undefined>("readonly", (store) =>
    store.get(id)
  );
};

const ensurePermission = async (
  handle: MarkdownFileHandle | MarkdownDirectoryHandle,
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
  return normalizeMarkdownContent(await file.text());
};

export const isInternalMarkdownLink = (href: string) => {
  const normalizedHref = href.trim();

  if (!normalizedHref) {
    return false;
  }

  if (
    normalizedHref.startsWith("#") ||
    /^[a-z][a-z\d+\-.]*:/iu.test(normalizedHref) ||
    normalizedHref.startsWith("//")
  ) {
    return false;
  }

  const normalizedPath = normalizeWorkspacePath(normalizedHref);
  return normalizedPath !== null && normalizedPath.toLowerCase().endsWith(".md");
};

export const resolveWorkspaceRelativePath = (
  fromRelativePath: string,
  href: string
) => {
  if (!isInternalMarkdownLink(href)) {
    return null;
  }

  const cleanHref = stripHashAndQuery(href).replace(/\\/gu, "/");
  const fromPath = normalizeWorkspacePath(fromRelativePath);

  if (!fromPath) {
    return null;
  }

  const currentDirectory =
    fromPath.lastIndexOf("/") >= 0
      ? fromPath.slice(0, fromPath.lastIndexOf("/"))
      : "";
  const targetCandidate = cleanHref.startsWith("/")
    ? cleanHref.slice(1)
    : currentDirectory
      ? `${currentDirectory}/${cleanHref}`
      : cleanHref;

  const normalizedPath = normalizeWorkspacePath(targetCandidate);

  if (!normalizedPath || !normalizedPath.toLowerCase().endsWith(".md")) {
    return null;
  }

  return normalizedPath;
};

export const buildRelativeWorkspaceLink = (
  fromRelativePath: string,
  toRelativePath: string
) => {
  const fromPath = normalizeWorkspacePath(fromRelativePath);
  const toPath = normalizeWorkspacePath(toRelativePath);

  if (!fromPath || !toPath) {
    return null;
  }

  const fromDirectorySegments = fromPath.split("/").slice(0, -1);
  const toSegments = toPath.split("/");
  let sharedIndex = 0;

  while (
    sharedIndex < fromDirectorySegments.length &&
    sharedIndex < toSegments.length &&
    fromDirectorySegments[sharedIndex] === toSegments[sharedIndex]
  ) {
    sharedIndex += 1;
  }

  const upwardSegments = Array.from(
    { length: fromDirectorySegments.length - sharedIndex },
    () => ".."
  );
  const downwardSegments = toSegments.slice(sharedIndex);
  const relativePath = upwardSegments.concat(downwardSegments).join("/");

  if (!relativePath || relativePath === basename(toPath)) {
    return `./${basename(toPath)}`;
  }

  if (relativePath.startsWith("..")) {
    return relativePath;
  }

  return `./${relativePath}`;
};

const normalizeRemoteUrl = (value: string | null | undefined) => {
  const trimmedValue = (value ?? "").trim();

  if (trimmedValue === "") {
    return null;
  }

  try {
    return new URL(trimmedValue).toString();
  } catch {
    return trimmedValue;
  }
};

const getShareTargetUrl = (value: string | null | undefined) => {
  const normalizedValue = normalizeRemoteUrl(value);

  if (!normalizedValue) {
    return null;
  }

  try {
    const shareUrl = new URL(normalizedValue);
    return normalizeRemoteUrl(shareUrl.searchParams.get("open"));
  } catch {
    return null;
  }
};

const createEntryFromHandle = async (
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

const requestMarkdownFromUrl = async (
  url: string,
  fileName?: string,
  password?: string
): Promise<
  | {
      status: "opened";
      content: string;
      name: string;
      selectedFileName: string | null;
      url: string;
    }
  | {
      status: "password-required";
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
    body: JSON.stringify({ url, fileName, password }),
  });

  const payload = (await response.json()) as {
    content?: string;
    error?: string;
    files?: string[];
    name?: string;
    requiresPassword?: boolean;
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

  if (response.status === 401 && payload.requiresPassword) {
    return {
      status: "password-required",
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
    content: normalizeMarkdownContent(payload.content),
    name: payload.name,
    selectedFileName:
      typeof payload.selectedFileName === "string"
        ? payload.selectedFileName
        : null,
    url: payload.url,
  };
};

const requestMarkdownShare = async (
  fileName: string,
  content: string,
  existingShareId?: string | null,
  options: MarkdownShareOptions = {}
): Promise<MarkdownShareResult> => {
  const response = await fetch("/api/share", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      existingShareId,
      name: fileName,
      password: options.password,
      removePassword: options.removePassword,
    }),
  });
  const payload = (await response.json()) as {
    error?: string;
    share?: MarkdownShare;
  };

  if (!response.ok || !payload.share) {
    throw new Error(payload.error ?? "Unable to share the document.");
  }

  return {
    share: payload.share,
  };
};

const findMatchingRemoteFile = (url: string, fileName: string | null) =>
  readRecentFilesFromStorage().find(
    (file) =>
      file.source === "url" && file.url === url && file.urlFileName === fileName
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

const persistRecentEntries = (entries: RecentMarkdownFile[]) => {
  const nextFiles = entries.reduce(
    (files, entry) => upsertRecentFile(files, entry),
    readRecentFilesFromStorage()
  );

  writeRecentFilesToStorage(nextFiles);
  return nextFiles;
};

const reopenLocalRecentFile = async (knownEntry: RecentMarkdownFile) => {
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

  const content = await readContent(fileHandle);
  const nextEntry = {
    ...knownEntry,
    name: fileHandle.name,
    lastOpenedAt: new Date().toISOString(),
    stats: getMarkdownDocumentStats(content),
  } satisfies RecentMarkdownFile;
  const recentFiles = persistRecentEntry(nextEntry);

  return { entry: nextEntry, content, recentFiles };
};

const createEntryFromFile = (
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

const buildWorkspacePageId = (workspaceId: string, relativePath: string) =>
  `workspace:${workspaceId}:${relativePath}`;

const createEntryFromWorkspacePage = (
  page: MarkdownWorkspacePage,
  workspaceId: string,
  content: string,
  existingEntry: RecentMarkdownFile | null = null
) => {
  return {
    id: page.id,
    name: page.name,
    path: page.relativePath,
    relativePath: page.relativePath,
    workspaceId,
    share: existingEntry?.share ?? null,
    url: null,
    urlFileName: null,
    lastOpenedAt: new Date().toISOString(),
    source: "folder",
    stats: getMarkdownDocumentStats(content),
  } satisfies RecentMarkdownFile;
};

const createWorkspaceRecentEntry = (
  workspace: MarkdownWorkspace,
  existingEntry: RecentMarkdownFile | null = null
) => {
  return {
    id: workspace.id,
    name: workspace.name,
    path: workspace.name,
    relativePath: null,
    workspaceId: workspace.id,
    share: existingEntry?.share ?? null,
    url: null,
    urlFileName: null,
    lastOpenedAt: new Date().toISOString(),
    source: "workspace",
    stats: {
      characterCount: 0,
      wordCount: 0,
      lineCount: 0,
      fileCount: workspace.pages.length,
    },
  } satisfies RecentMarkdownFile;
};

const listWorkspaceMarkdownPages = async (
  directoryHandle: FileSystemDirectoryHandle,
  parentPath = ""
): Promise<MarkdownWorkspacePage[]> => {
  const pages: MarkdownWorkspacePage[] = [];
  const entries = (
    directoryHandle as FileSystemDirectoryHandle & {
      entries?: () => AsyncIterable<[string, FileSystemHandle]>;
    }
  ).entries;

  if (!entries) {
    throw new Error(
      "Directory iteration is not supported in this browser version."
    );
  }

  for await (const [name, handle] of entries.call(directoryHandle)) {
    if (handle.kind === "directory") {
      const nestedPath = parentPath ? `${parentPath}/${name}` : name;
      const nestedPages = await listWorkspaceMarkdownPages(
        handle as FileSystemDirectoryHandle,
        nestedPath
      );
      pages.push(...nestedPages);
      continue;
    }

    if (!name.toLowerCase().endsWith(".md")) {
      continue;
    }

    const relativePath = parentPath ? `${parentPath}/${name}` : name;

    pages.push({
      id: "",
      name,
      relativePath,
      handle: handle as FileSystemFileHandle,
      content: "",
    });
  }

  return pages.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath)
  );
};

const loadWorkspaceMarkdownPages = async (
  directoryHandle: FileSystemDirectoryHandle,
  workspaceId: string
) => {
  const storedRecentFiles = readRecentFilesFromStorage();
  const recentFilesById = new Map(
    storedRecentFiles.map((file) => [file.id, file] as const)
  );
  const pages = await listWorkspaceMarkdownPages(directoryHandle);

  if (pages.length === 0) {
    throw new Error("No Markdown files were found in the selected folder.");
  }

  const permissionResults = await Promise.all(
    pages.map((page) => ensurePermission(page.handle as MarkdownFileHandle))
  );

  if (permissionResults.some((hasPermission) => !hasPermission)) {
    throw new Error("Read permission was denied for the selected folder.");
  }

  const pagesWithContent = await Promise.all(
    pages.map(async (page) => {
      const content = await readContent(page.handle);

      return {
        ...page,
        id: buildWorkspacePageId(workspaceId, page.relativePath),
        content,
      };
    })
  );

  const documents = pagesWithContent.map((page) => ({
    entry: createEntryFromWorkspacePage(
      page,
      workspaceId,
      page.content,
      recentFilesById.get(page.id) ?? null
    ),
    content: page.content,
  }));

  return { pages: pagesWithContent, documents };
};

export const openMarkdownFolder = async () => {
  if (!supportsDirectoryPicker()) {
    throw new Error(
      "This browser does not support local folder access for Markdown workspaces."
    );
  }

  const directoryHandle = await window.showDirectoryPicker!({
    id: "markdown-folder-open",
    mode: "readwrite",
  });
  const workspaceId = crypto.randomUUID();
  const { pages, documents } = await loadWorkspaceMarkdownPages(
    directoryHandle,
    workspaceId
  );
  const firstDocument = documents[0];
  const workspace: MarkdownWorkspace = {
    id: workspaceId,
    name: directoryHandle.name,
    pages,
  };
  const recentWorkspaceEntry = createWorkspaceRecentEntry(workspace);

  await saveHandle(workspaceId, directoryHandle);
  await Promise.all(
    pages.map((page) => saveHandle(page.id, page.handle))
  );

  const recentFiles = persistRecentEntry(recentWorkspaceEntry);

  return {
    workspace,
    entry: firstDocument.entry,
    content: firstDocument.content,
    documents,
    recentFiles,
  };
};

export const openWorkspaceMarkdownPage = async (
  page: MarkdownWorkspacePage,
  workspaceId: string
) => {
  const content = page.content;
  const entry = createEntryFromWorkspacePage(page, workspaceId, content);

  return {
    entry,
    content,
    recentFiles: getRecentMarkdownFiles(),
  };
};

const reopenRecentWorkspace = async (knownEntry: RecentMarkdownFile) => {
  const handle = await getHandle(knownEntry.id);

  if (!handle) {
    throw new Error("This recent folder is no longer available in the browser.");
  }

  if (handle.kind !== "directory") {
    throw new Error("The saved folder handle is invalid.");
  }

  const directoryHandle = handle as MarkdownDirectoryHandle;
  const hasPermission = await ensurePermission(directoryHandle);

  if (!hasPermission) {
    throw new Error("Permission is required to reopen this folder.");
  }

  const workspaceId = knownEntry.workspaceId ?? knownEntry.id;
  const { pages, documents } = await loadWorkspaceMarkdownPages(
    directoryHandle,
    workspaceId
  );

  const workspace: MarkdownWorkspace = {
    id: workspaceId,
    name: directoryHandle.name,
    pages,
  };
  const recentWorkspaceEntry = createWorkspaceRecentEntry(workspace, knownEntry);

  await saveHandle(workspaceId, directoryHandle);
  await Promise.all(
    pages.map((page) => saveHandle(page.id, page.handle))
  );

  const recentFiles = persistRecentEntry(recentWorkspaceEntry);
  const firstDocument = documents[0];

  return {
    workspace,
    entry: firstDocument.entry,
    content: firstDocument.content,
    documents,
    recentFiles,
  };
};

export const openMarkdownWithPicker = async (options: PickerOptions = {}) => {
  if (!supportsOpenFilePicker()) {
    throw new Error(
      "This browser does not support persistent local file access."
    );
  }

  const handles = await window.showOpenFilePicker!({
    id: options.id ?? "markdown-open",
    multiple: true,
    excludeAcceptAllOption: true,
    types: MARKDOWN_FILE_TYPES,
  });

  if (handles.length === 0) {
    throw new Error("No files were selected.");
  }

  const documents: PendingMarkdownImport[] = [];

  for (const handle of handles) {
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
      existingEntry?.id ?? options.id,
      existingEntry?.share ?? null
    );

    await saveHandle(entry.id, handle);
    documents.push({
      entry: {
        ...entry,
        path: existingEntry?.path ?? entry.path,
      },
      content,
    });
  }

  const recentFiles = persistRecentEntries(
    documents.map((document) => document.entry)
  );

  if (documents.length === 1) {
    const [document] = documents;

    return {
      status: "opened" as const,
      entry: document.entry,
      content: document.content,
      recentFiles,
    };
  }

  return {
    status: "selection-required" as const,
    documents,
    recentFiles,
  };
};

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

export const openDroppedMarkdownFiles = async (
  files: File[],
  items?: DataTransferItemList | null
) => {
  if (files.length === 0) {
    throw new Error("No files were provided.");
  }

  const handles: Array<FileSystemFileHandle | null> = [];

  if (items) {
    for (const item of Array.from(items)) {
      const itemWithHandle = item as DataTransferItemWithHandle;
      const maybeHandle = itemWithHandle.getAsFileSystemHandle
        ? await itemWithHandle.getAsFileSystemHandle()
        : null;

      if (maybeHandle?.kind === "file") {
        handles.push(maybeHandle as FileSystemFileHandle);
      }
    }
  }

  const documents: PendingMarkdownImport[] = [];

  for (const [index, file] of files.entries()) {
    const handle = handles[index] ?? null;
    const content = await file.text();
    const normalizedContent = normalizeMarkdownContent(content);

    if (!handle) {
      documents.push({
        entry: createEntryFromFile(file, normalizedContent, "drop"),
        content: normalizedContent,
      });
      continue;
    }

    const hasPermission = await ensurePermission(handle as MarkdownFileHandle);

    if (!hasPermission) {
      throw new Error("Read permission for the dropped file was denied.");
    }

    const existingEntry = await findMatchingRecentFile(handle);
    const entry = {
      ...(await createEntryFromHandle(
        handle,
        "drop",
        normalizedContent,
        existingEntry?.id,
        existingEntry?.share ?? null
      )),
      path: file.webkitRelativePath || existingEntry?.path || null,
    } satisfies RecentMarkdownFile;

    await saveHandle(entry.id, handle);
    documents.push({ entry, content: normalizedContent });
  }

  const recentFiles = persistRecentEntries(
    documents.map((document) => document.entry)
  );

  if (documents.length === 1) {
    const [document] = documents;

    return {
      status: "opened" as const,
      entry: document.entry,
      content: document.content,
      recentFiles,
    };
  }

  return {
    status: "selection-required" as const,
    documents,
    recentFiles,
  };
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

export const createNewMarkdownFile = async (
  initialContent = "",
  suggestedName = "Untitled.md"
) => {
  if (
    !supportsOpenFilePicker() ||
    typeof window.showSaveFilePicker !== "function"
  ) {
    throw new Error("This browser does not support saving local files.");
  }

  const handle = await window.showSaveFilePicker({
    id: "markdown-save",
    suggestedName,
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
    existingEntry?.id,
    existingEntry?.share ?? null
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
