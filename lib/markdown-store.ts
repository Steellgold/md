"use client";

import {
  canUsePersistentLocalFiles,
  clearRecentMarkdownFiles,
  createNewMarkdownFile,
  getRecentMarkdownFiles,
  openDroppedMarkdownFiles,
  openMarkdownFolder,
  openMarkdownFromUrl,
  openMarkdownWithPicker,
  openWorkspaceMarkdownPage,
  removeRecentMarkdownFile,
  reopenRecentMarkdownFile,
  saveRecentMarkdownFile,
  syncRecentMarkdownFileSnapshot,
} from "@/lib/markdown-file-system";
import {
  getMarkdownDocumentStats,
  getUnknownErrorMessage,
} from "@/lib/markdown-helpers";
import {
  type CollaborationSession,
  type MarkdownShare,
  type MarkdownStore,
  type MarkdownWorkspace,
  type OpenMarkdownDocument,
  type PendingMarkdownImport,
  type RecentMarkdownFile,
} from "@/types/markdown";
import { create } from "zustand";

const getBusyState = (busyMessage: string) => ({
  isBusy: true,
  busyMessage,
  error: null,
});

const updateDocumentContent = (
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
  const activeDocument = documents.find((document) => document.id === activeDocumentId) ?? null;

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

const findWorkspacePage = (
  workspace: MarkdownWorkspace,
  relativePath: string
) =>
  workspace.pages.find((page) => page.relativePath === relativePath) ?? null;

const getErrorState = (error: unknown) => ({
  error: getUnknownErrorMessage(error),
  isBusy: false,
  busyMessage: null,
  pendingImports: [],
  pendingRemoteOpen: null,
});

export const useMarkdownStore = create<MarkdownStore>((set) => ({
  openDocuments: [],
  activeDocumentId: null,
  content: "",
  activeFile: null,
  workspace: null,
  pendingImports: [],
  pendingRemoteOpen: null,
  recentFiles: [],
  hydrated: false,
  isBusy: false,
  busyMessage: null,
  error: null,
  canPersistFiles: canUsePersistentLocalFiles(),
  hydrate: () =>
    set({
      hydrated: true,
      pendingImports: [],
      pendingRemoteOpen: null,
      recentFiles: getRecentMarkdownFiles(),
      canPersistFiles: canUsePersistentLocalFiles(),
      busyMessage: null,
    }),
  clearError: () => set({ error: null }),
  setContent: (content) =>
    set((state) => {
      const activeDocumentId = state.activeDocumentId;

      if (!activeDocumentId) {
        return { content };
      }

      return updateDocumentContent(state, activeDocumentId, content);
    }),
  setDocumentContent: (id, content) =>
    set((state) => updateDocumentContent(state, id, content)),
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
  openFolder: async () => {
    set(getBusyState("Opening folder..."));

    try {
      const result = await openMarkdownFolder();

      set((state) =>
        buildDocumentState(
          upsertOpenDocuments(state.openDocuments, result.documents),
          result.entry.id,
          result.recentFiles,
          { workspace: result.workspace }
        )
      );
    } catch (error) {
      set(getErrorState(error));
    }
  },
  openWorkspacePageByPath: async (relativePath) => {
    const state = useMarkdownStore.getState();

    if (!state.workspace) {
      set(getErrorState(new Error("No workspace is currently open.")));
      return false;
    }

    const page = findWorkspacePage(state.workspace, relativePath);

    if (!page) {
      set(
        getErrorState(
          new Error(`No page found for workspace path "${relativePath}".`)
        )
      );
      return false;
    }

    const existingDocument =
      state.openDocuments.find((document) => document.id === page.id) ?? null;

    if (existingDocument) {
      set((currentState) =>
        buildDocumentState(
          currentState.openDocuments,
          existingDocument.id,
          currentState.recentFiles,
          { workspace: currentState.workspace }
        )
      );
      return true;
    }

    try {
      const result = await openWorkspaceMarkdownPage(page, state.workspace.id);

      set((currentState) =>
        buildDocumentState(
          upsertOpenDocument(
            currentState.openDocuments,
            result.entry,
            result.content
          ),
          result.entry.id,
          result.recentFiles,
          { workspace: currentState.workspace }
        )
      );
      return true;
    } catch (error) {
      set(getErrorState(error));
      return false;
    }
  },
  openWithPicker: async () => {
    set(getBusyState("Opening file..."));

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
    set(getBusyState("Loading document..."));

    try {
      const result = await openMarkdownFromUrl(url, { fileName });

      if ("status" in result && result.status === "password-required") {
        set({
          pendingImports: [],
          pendingRemoteOpen: {
            url,
            files: [],
            passwordRequired: true,
          },
          isBusy: false,
          busyMessage: null,
          error: null,
        });

        return result;
      }

      if ("status" in result && result.status === "selection-required") {
        set({
          pendingImports: [],
          pendingRemoteOpen: null,
          isBusy: false,
          busyMessage: null,
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
    set(getBusyState("Loading document..."));

    try {
      const result = await openMarkdownFromUrl(url);

      if (result.status === "password-required") {
        set({
          pendingImports: [],
          pendingRemoteOpen: {
            url,
            files: [],
            passwordRequired: true,
          },
          isBusy: false,
          busyMessage: null,
          error: null,
        });
        return;
      }

      if (result.status === "selection-required") {
        set({
          pendingImports: [],
          pendingRemoteOpen: {
            url,
            files: result.files,
          },
          isBusy: false,
          busyMessage: null,
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
    set(
      getBusyState(files.length > 1 ? "Loading files..." : "Loading file...")
    );

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
  openPendingRemoteFile: async (fileName, password) => {
    const state = useMarkdownStore.getState();
    const pendingRemoteOpen = state.pendingRemoteOpen;

    if (!pendingRemoteOpen) {
      set(getErrorState(new Error("No remote file is waiting to be opened.")));
      return;
    }

    set(getBusyState(`Opening ${fileName}...`));

    try {
      const rememberedFileName =
        pendingRemoteOpen.files.length === 1
          ? pendingRemoteOpen.files[0]
          : undefined;
      const effectiveFileName = fileName ?? rememberedFileName;

      const result = await openMarkdownFromUrl(pendingRemoteOpen.url, {
        fileName: effectiveFileName,
        password,
      });

      if (result.status === "password-required") {
        set({
          pendingRemoteOpen: {
            url: pendingRemoteOpen.url,
            files: [],
            passwordRequired: true,
          },
          isBusy: false,
          busyMessage: null,
          error: null,
        });
        return;
      }

      if (result.status === "selection-required") {
        set({
          pendingRemoteOpen: {
            url: pendingRemoteOpen.url,
            files: result.files,
            passwordRequired: false,
          },
          isBusy: false,
          busyMessage: null,
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
        busyMessage: null,
      });
    }
  },
  clearPendingRemoteOpen: () => set({ pendingRemoteOpen: null }),
  reopenRecentFile: async (id) => {
    const knownEntry =
      useMarkdownStore.getState().recentFiles.find((file) => file.id === id) ??
      null;

    set(getBusyState(`Opening ${knownEntry?.name ?? "file"}...`));

    try {
      const result = await reopenRecentMarkdownFile(id);

      if ("status" in result) {
        if (result.status === "password-required") {
          set({
            pendingImports: [],
            pendingRemoteOpen: {
              url: result.url,
              files: result.fileName ? [result.fileName] : [],
              passwordRequired: true,
            },
            isBusy: false,
            busyMessage: null,
            error: null,
          });
          return;
        }

        if (result.status === "selection-required") {
          set({
            pendingImports: [],
            pendingRemoteOpen: {
              url: result.url,
              files: result.files,
              passwordRequired: false,
            },
            isBusy: false,
            busyMessage: null,
            error: null,
          });
          return;
        }
      }

      if ("workspace" in result && "documents" in result) {
        set((state) =>
          buildDocumentState(
            upsertOpenDocuments(state.openDocuments, result.documents),
            result.entry.id,
            result.recentFiles,
            { workspace: result.workspace }
          )
        );
        return;
      }

      const { entry, content, recentFiles } = result;

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
    set(getBusyState("Creating file..."));

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
  createLocalCopyOfActiveFile: async () => {
    const state = useMarkdownStore.getState();
    const activeDocument =
      state.openDocuments.find(
        (document) => document.id === state.activeDocumentId
      ) ?? null;

    if (!activeDocument) {
      set(getErrorState(new Error("No active file to copy locally.")));
      return;
    }

    set(getBusyState("Creating local copy..."));

    try {
      const { entry, content, recentFiles } = await createNewMarkdownFile(
        activeDocument.content,
        activeDocument.file.name
      );

      set((currentState) =>
        buildDocumentState(
          upsertOpenDocument(currentState.openDocuments, entry, content),
          entry.id,
          recentFiles
        )
      );
    } catch (error) {
      set(getErrorState(error));
    }
  },
  saveActiveFile: async (options) => {
    const state = useMarkdownStore.getState();
    const activeDocument =
      state.openDocuments.find(
        (document) => document.id === state.activeDocumentId
      ) ?? null;

    if (!activeDocument) {
      set(getErrorState(new Error("No active file to save.")));
      return;
    }

    if (!options?.silent) {
      set(getBusyState("Saving changes..."));
    }

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
            recentFiles,
            { workspace: currentState.workspace }
          );
        });
    } catch (error) {
      set(getErrorState(error));
    }
  },
  setDocumentShare: (id: string, share: MarkdownShare) =>
    set((state) => {
      const nextDocuments = state.openDocuments.map((document) =>
        document.id === id
          ? {
              ...document,
              file: {
                ...document.file,
                share,
              },
            }
          : document
      );
      const nextActiveFile =
        state.activeFile?.id === id
          ? {
              ...state.activeFile,
              share,
            }
          : state.activeFile;

      return {
        openDocuments: nextDocuments,
        activeFile: nextActiveFile,
        recentFiles: state.recentFiles.map((file) =>
          file.id === id
            ? {
                ...file,
                share,
              }
            : file
        ),
      };
    }),
  setDocumentCollaboration: (id: string, collab: CollaborationSession | null) =>
    set((state) => {
      const nextDocuments = state.openDocuments.map((document) =>
        document.id === id
          ? {
              ...document,
              file: {
                ...document.file,
                collab,
              },
            }
          : document
      );
      const nextActiveFile =
        state.activeFile?.id === id
          ? {
              ...state.activeFile,
              collab,
            }
          : state.activeFile;

      return {
        openDocuments: nextDocuments,
        activeFile: nextActiveFile,
        recentFiles: state.recentFiles.map((file) =>
          file.id === id
            ? {
                ...file,
                collab,
              }
            : file
        ),
      };
    }),
  openScratchDocument: (name = "Collaborative document.md") =>
    set((state) => {
      const id = `collab-${crypto.randomUUID()}`;
      const file = {
        id,
        name,
        path: null,
        url: null,
        urlFileName: null,
        share: null,
        collab: null,
        lastOpenedAt: new Date().toISOString(),
        source: "collab" as const,
        stats: getMarkdownDocumentStats(""),
      };
      const scratchDocument = {
        id,
        file,
        content: "",
        savedContent: "",
        isDirty: true,
      };

        return buildDocumentState(
          upsertOpenDocument(state.openDocuments, file, ""),
          scratchDocument.id,
          state.recentFiles,
          { workspace: null }
        );
      }),
  goHome: () =>
    set((state) => {
      state.openDocuments.forEach((document) => {
        void syncRecentMarkdownFileSnapshot(document.id, document.content);
      });

        return buildDocumentState([], null, state.recentFiles, {
          workspace: null,
        });
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

        return buildDocumentState(nextDocuments, preferredId, state.recentFiles, {
          workspace: state.workspace,
        });
      }),
  removeRecentFile: async (id) => {
    try {
      const recentFiles = await removeRecentMarkdownFile(id);
      set((state) => ({
        recentFiles,
        isBusy: false,
        busyMessage: null,
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
    try {
      await clearRecentMarkdownFiles();
      set((state) => ({
        recentFiles: [],
        isBusy: false,
        busyMessage: null,
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
