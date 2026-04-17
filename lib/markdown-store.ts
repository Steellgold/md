"use client";

import { create } from "zustand";

import {
  canUsePersistentLocalFiles,
  clearRecentMarkdownFiles,
  createNewMarkdownFile,
  getRecentMarkdownFiles,
  openDroppedMarkdownFiles,
  openMarkdownFromUrl,
  openMarkdownWithPicker,
  removeRecentMarkdownFile,
  reopenRecentMarkdownFile,
  saveRecentMarkdownFile,
  syncRecentMarkdownFileSnapshot,
} from "@/lib/markdown-file-system";
import { getUnknownErrorMessage } from "@/lib/markdown-helpers";
import {
  type MarkdownStore,
  type OpenMarkdownDocument,
  type PendingMarkdownImport,
  type RecentMarkdownFile,
} from "@/types/markdown";

const getBusyState = () => ({ isBusy: true, error: null });

const createOpenDocument = (
  entry: RecentMarkdownFile,
  content: string
): OpenMarkdownDocument => ({
  id: entry.id,
  file: entry,
  content,
  savedContent: content,
  isDirty: false,
});

const upsertOpenDocument = (
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

const upsertOpenDocuments = (
  currentDocuments: OpenMarkdownDocument[],
  imports: PendingMarkdownImport[]
) =>
  imports.reduce(
    (documents, pendingImport) =>
      upsertOpenDocument(documents, pendingImport.entry, pendingImport.content),
    currentDocuments
  );

const resolveActiveDocumentId = (
  documents: OpenMarkdownDocument[],
  preferredId: string | null
) =>
  preferredId && documents.some((document) => document.id === preferredId)
    ? preferredId
    : (documents.at(-1)?.id ?? null);

const buildDocumentState = (
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
    error: null,
    ...overrides,
  };
};

const getErrorState = (error: unknown) => ({
  error: getUnknownErrorMessage(error),
  isBusy: false,
  pendingImports: [],
  pendingRemoteOpen: null,
});

export const useMarkdownStore = create<MarkdownStore>((set) => ({
  openDocuments: [],
  activeDocumentId: null,
  content: "",
  activeFile: null,
  pendingImports: [],
  pendingRemoteOpen: null,
  recentFiles: [],
  hydrated: false,
  isBusy: false,
  error: null,
  canPersistFiles: canUsePersistentLocalFiles(),
  hydrate: () =>
    set({
      hydrated: true,
      pendingImports: [],
      pendingRemoteOpen: null,
      recentFiles: getRecentMarkdownFiles(),
      canPersistFiles: canUsePersistentLocalFiles(),
    }),
  clearError: () => set({ error: null }),
  setContent: (content) =>
    set((state) => {
      const activeDocumentId = state.activeDocumentId;

      if (!activeDocumentId) {
        return { content };
      }

      const nextDocuments = state.openDocuments.map((document) => {
        if (document.id !== activeDocumentId) {
          return document;
        }

        const stats = {
          characterCount: content.length,
          wordCount: content.trim() ? content.trim().split(/\s+/u).length : 0,
          lineCount: content === "" ? 1 : content.split(/\r?\n/u).length,
        };

        return {
          ...document,
          content,
          isDirty: content !== document.savedContent,
          file: {
            ...document.file,
            stats,
          },
        };
      });

      const activeDocument =
        nextDocuments.find((document) => document.id === activeDocumentId) ??
        null;

      return {
        openDocuments: nextDocuments,
        content,
        activeFile: activeDocument?.file ?? null,
        recentFiles: state.recentFiles.map((file) =>
          file.id === activeDocumentId && activeDocument
            ? activeDocument.file
            : file
        ),
      };
    }),
  setActiveDocument: (id) =>
    set((state) => {
      const activeDocument =
        state.openDocuments.find((document) => document.id === id) ?? null;

      if (!activeDocument) {
        return state;
      }

      return {
        activeDocumentId: id,
        activeFile: activeDocument.file,
        content: activeDocument.content,
      };
    }),
  openWithPicker: async () => {
    set(getBusyState());

    try {
      const result = await openMarkdownWithPicker();

      if (result.status === "selection-required") {
        set((state) =>
          buildDocumentState(
            upsertOpenDocuments(state.openDocuments, result.documents),
            result.documents.at(-1)?.entry.id ?? state.activeDocumentId,
            result.recentFiles
          )
        );
        return;
      }

      set((state) =>
        buildDocumentState(
          upsertOpenDocument(state.openDocuments, result.entry, result.content),
          result.entry.id,
          result.recentFiles
        )
      );
    } catch (error) {
      set(getErrorState(error));
    }
  },
  openFromUrl: async (url, fileName) => {
    set(getBusyState());

    try {
      const result = await openMarkdownFromUrl(url, { fileName });

      if (result.status === "selection-required") {
        set({
          pendingImports: [],
          pendingRemoteOpen: null,
          isBusy: false,
          error: null,
        });

        return result;
      }

      set((state) =>
        buildDocumentState(
          upsertOpenDocument(state.openDocuments, result.entry, result.content),
          result.entry.id,
          result.recentFiles
        )
      );
      return { status: "opened" as const };
    } catch (error) {
      set(getErrorState(error));
      return { status: "error" as const };
    }
  },
  openDeepLinkUrl: async (url) => {
    set(getBusyState());

    try {
      const result = await openMarkdownFromUrl(url);

      if (result.status === "selection-required") {
        set({
          pendingImports: [],
          pendingRemoteOpen: {
            url,
            files: result.files,
          },
          isBusy: false,
          error: null,
        });
        return;
      }

      set((state) =>
        buildDocumentState(
          upsertOpenDocument(state.openDocuments, result.entry, result.content),
          result.entry.id,
          result.recentFiles
        )
      );
    } catch (error) {
      set(getErrorState(error));
    }
  },
  openDroppedFiles: async (files, items) => {
    set(getBusyState());

    try {
      const result = await openDroppedMarkdownFiles(files, items);

      if (result.status === "selection-required") {
        set((state) =>
          buildDocumentState(
            upsertOpenDocuments(state.openDocuments, result.documents),
            result.documents.at(-1)?.entry.id ?? state.activeDocumentId,
            result.recentFiles
          )
        );
        return;
      }

      set((state) =>
        buildDocumentState(
          upsertOpenDocument(state.openDocuments, result.entry, result.content),
          result.entry.id,
          result.recentFiles
        )
      );
    } catch (error) {
      set(getErrorState(error));
    }
  },
  clearPendingImports: () => set({ pendingImports: [] }),
  openPendingRemoteFile: async (fileName) => {
    const state = useMarkdownStore.getState();
    const pendingRemoteOpen = state.pendingRemoteOpen;

    if (!pendingRemoteOpen) {
      set(getErrorState(new Error("No remote file is waiting to be opened.")));
      return;
    }

    set(getBusyState());

    try {
      const result = await openMarkdownFromUrl(pendingRemoteOpen.url, {
        fileName,
      });

      if (result.status === "selection-required") {
        set({
          pendingRemoteOpen: {
            url: pendingRemoteOpen.url,
            files: result.files,
          },
          isBusy: false,
          error: null,
        });
        return;
      }

      set((currentState) =>
        buildDocumentState(
          upsertOpenDocument(
            currentState.openDocuments,
            result.entry,
            result.content
          ),
          result.entry.id,
          result.recentFiles
        )
      );
    } catch (error) {
      set({
        error: getUnknownErrorMessage(error),
        isBusy: false,
      });
    }
  },
  clearPendingRemoteOpen: () => set({ pendingRemoteOpen: null }),
  reopenRecentFile: async (id) => {
    set(getBusyState());

    try {
      const { entry, content, recentFiles } =
        await reopenRecentMarkdownFile(id);

      set((state) =>
        buildDocumentState(
          upsertOpenDocument(state.openDocuments, entry, content),
          entry.id,
          recentFiles
        )
      );
    } catch (error) {
      set(getErrorState(error));
    }
  },
  createNewFile: async () => {
    set(getBusyState());

    try {
      const { entry, content, recentFiles } = await createNewMarkdownFile("");
      set((state) =>
        buildDocumentState(
          upsertOpenDocument(state.openDocuments, entry, content),
          entry.id,
          recentFiles
        )
      );
    } catch (error) {
      set(getErrorState(error));
    }
  },
  saveActiveFile: async () => {
    const state = useMarkdownStore.getState();
    const activeDocument =
      state.openDocuments.find(
        (document) => document.id === state.activeDocumentId
      ) ?? null;

    if (!activeDocument) {
      set(getErrorState(new Error("No active file to save.")));
      return;
    }

    set(getBusyState());

    try {
      const { entry, recentFiles } = await saveRecentMarkdownFile(
        activeDocument.id,
        activeDocument.content
      );

      set((currentState) => {
        const nextDocuments = currentState.openDocuments.map((document) =>
          document.id === activeDocument.id
            ? {
                ...document,
                file: entry,
                savedContent: document.content,
                isDirty: false,
              }
            : document
        );

        return buildDocumentState(
          nextDocuments,
          activeDocument.id,
          recentFiles
        );
      });
    } catch (error) {
      set(getErrorState(error));
    }
  },
  goHome: () =>
    set((state) => {
      state.openDocuments.forEach((document) => {
        void syncRecentMarkdownFileSnapshot(document.id, document.content);
      });

      return buildDocumentState([], null, state.recentFiles);
    }),
  closeDocument: (id) =>
    set((state) => {
      const documentToClose =
        state.openDocuments.find((document) => document.id === id) ?? null;

      if (!documentToClose) {
        return state;
      }

      void syncRecentMarkdownFileSnapshot(id, documentToClose.content);

      const currentIndex = state.openDocuments.findIndex(
        (document) => document.id === id
      );
      const nextDocuments = state.openDocuments.filter(
        (document) => document.id !== id
      );
      const fallbackDocument =
        nextDocuments[currentIndex - 1] ??
        nextDocuments[currentIndex] ??
        nextDocuments.at(-1) ??
        null;
      const preferredId =
        state.activeDocumentId === id
          ? (fallbackDocument?.id ?? null)
          : state.activeDocumentId;

      return buildDocumentState(nextDocuments, preferredId, state.recentFiles);
    }),
  removeRecentFile: async (id) => {
    set(getBusyState());

    try {
      const recentFiles = await removeRecentMarkdownFile(id);
      set((state) => ({
        recentFiles,
        isBusy: false,
        pendingImports: [],
        pendingRemoteOpen: null,
        error: null,
        openDocuments: state.openDocuments,
        activeDocumentId: state.activeDocumentId,
        activeFile: state.activeFile,
        content: state.content,
      }));
    } catch (error) {
      set(getErrorState(error));
    }
  },
  clearRecentFiles: async () => {
    set(getBusyState());

    try {
      await clearRecentMarkdownFiles();
      set((state) => ({
        recentFiles: [],
        isBusy: false,
        pendingImports: [],
        pendingRemoteOpen: null,
        error: null,
        openDocuments: state.openDocuments,
        activeDocumentId: state.activeDocumentId,
        activeFile: state.activeFile,
        content: state.content,
      }));
    } catch (error) {
      set(getErrorState(error));
    }
  },
  clearDocument: () => {
    const state = useMarkdownStore.getState();

    if (!state.activeDocumentId) {
      set({
        content: "",
        activeFile: null,
      });
      return;
    }

    useMarkdownStore.getState().closeDocument(state.activeDocumentId);
  },
}));
