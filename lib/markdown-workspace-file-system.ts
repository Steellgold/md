"use client";

import {
  getMarkdownDocumentStats,
  sortRecentFiles,
} from "@/lib/markdown-helpers";
import { persistRecentEntry } from "@/lib/markdown-file-system-core";
import {
  ensurePermission,
  readMarkdownFileContent,
  supportsDirectoryPicker,
} from "@/lib/adapters/browser-file-system-adapter";
import {
  getHandle,
  saveHandle,
} from "@/lib/persistence/file-handles-repo";
import { readRecentFilesFromStorage } from "@/lib/persistence/recent-files-repo";
import {
  type MarkdownDirectoryHandle,
  type MarkdownFileHandle,
  type MarkdownWorkspace,
  type MarkdownWorkspacePage,
  type RecentMarkdownFile,
} from "@/types/markdown";

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
      const content = await readMarkdownFileContent(page.handle);

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
    recentFiles: sortRecentFiles(readRecentFilesFromStorage()),
  };
};

export const reopenRecentWorkspace = async (knownEntry: RecentMarkdownFile) => {
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
