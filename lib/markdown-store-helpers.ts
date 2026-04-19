"use client";

import { getMarkdownDocumentStats, getUnknownErrorMessage } from "@/lib/markdown-helpers";
import {
  type MarkdownStore,
  type MarkdownWorkspace,
  type OpenMarkdownDocument,
  type PendingMarkdownImport,
  type RecentMarkdownFile,
} from "@/types/markdown";

export const getBusyState = (busyMessage: string) => ({
  isBusy: true,
  busyMessage,
  error: null,
});

export const updateDocumentContent = (
  state: MarkdownStore,
  documentId: string,
  content: string
) => {
  const activeDocumentIndex = state.openDocuments.findIndex(
    (document) => document.id === documentId
  );

  if (activeDocumentIndex === -1) {
    return { content: state.content };
  }

  const currentDocument = state.openDocuments[activeDocumentIndex];
  const stats = getMarkdownDocumentStats(content);
  const nextDocument = {
    ...currentDocument,
    content,
    isDirty: content !== currentDocument.savedContent,
    file: {
      ...currentDocument.file,
      stats,
    },
  };

  const nextDocuments = [...state.openDocuments];
  nextDocuments[activeDocumentIndex] = nextDocument;

  return {
    openDocuments: nextDocuments,
    content: state.activeDocumentId === documentId ? content : state.content,
    activeFile:
      state.activeDocumentId === documentId
        ? nextDocument.file
        : state.activeFile,
    recentFiles: state.recentFiles.map((file) =>
      file.id === documentId ? nextDocument.file : file
    ),
  };
};

export const createOpenDocument = (
  entry: RecentMarkdownFile,
  content: string
): OpenMarkdownDocument => ({
  id: entry.id,
  file: entry,
  content,
  savedContent: content,
  isDirty: false,
});

export const upsertOpenDocument = (
  currentDocuments: OpenMarkdownDocument[],
  entry: RecentMarkdownFile,
  content: string
) => {
  const nextDocument = createOpenDocument(entry, content);
  const existingIndex = currentDocuments.findIndex(
    (document) => document.id === entry.id
  );

  if (existingIndex === -1) {
    return currentDocuments.concat(nextDocument);
  }

  return currentDocuments.map((document, index) =>
    index === existingIndex ? nextDocument : document
  );
};

export const upsertOpenDocuments = (
  currentDocuments: OpenMarkdownDocument[],
  imports: PendingMarkdownImport[]
) =>
  imports.reduce(
    (documents, pendingImport) =>
      upsertOpenDocument(documents, pendingImport.entry, pendingImport.content),
    currentDocuments
  );

export const resolveActiveDocumentId = (
  documents: OpenMarkdownDocument[],
  preferredId: string | null
) =>
  preferredId && documents.some((document) => document.id === preferredId)
    ? preferredId
    : (documents.at(-1)?.id ?? null);

export const buildDocumentState = (
  documents: OpenMarkdownDocument[],
  preferredId: string | null,
  recentFiles: MarkdownStore["recentFiles"],
  overrides: Partial<MarkdownStore> = {}
) => {
  const activeDocumentId = resolveActiveDocumentId(documents, preferredId);
  const activeDocument =
    documents.find((document) => document.id === activeDocumentId) ?? null;

  return {
    openDocuments: documents,
    activeDocumentId,
    activeFile: activeDocument?.file ?? null,
    content: activeDocument?.content ?? "",
    pendingImports: [],
    pendingRemoteOpen: null,
    recentFiles,
    isBusy: false,
    busyMessage: null,
    error: null,
    ...overrides,
  };
};

export const findWorkspacePage = (
  workspace: MarkdownWorkspace,
  relativePath: string
) =>
  workspace.pages.find((page) => page.relativePath === relativePath) ?? null;

export const getErrorState = (error: unknown) => ({
  error: getUnknownErrorMessage(error),
  isBusy: false,
  busyMessage: null,
  pendingImports: [],
  pendingRemoteOpen: null,
});

export const getIdleTransitionState = (
  overrides: Partial<MarkdownStore> = {}
): Partial<MarkdownStore> => ({
  pendingImports: [],
  pendingRemoteOpen: null,
  isBusy: false,
  busyMessage: null,
  error: null,
  ...overrides,
});

export const getPendingRemoteState = (
  url: string,
  files: string[] = [],
  passwordRequired = false
): Partial<MarkdownStore> =>
  getIdleTransitionState({
    pendingRemoteOpen: {
      url,
      files,
      passwordRequired,
    },
  });
