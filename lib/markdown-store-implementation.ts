"use client";

import {
  canUsePersistentLocalFiles,
  clearRecentMarkdownFiles,
  getRecentMarkdownFiles,
  removeRecentMarkdownFile,
  saveRecentMarkdownFile,
  syncRecentMarkdownFileSnapshot,
} from "@/lib/markdown-file-system";
import { getMarkdownDocumentStats } from "@/lib/markdown-helpers";
import {
  buildDocumentState,
  getBusyState,
  getErrorState,
  getIdleTransitionState,
  updateDocumentContent,
  upsertOpenDocument,
} from "@/lib/markdown-store-helpers";
import { markdownStoreOpenActions } from "@/lib/markdown-store-open-actions";
import {
  type CollaborationSession,
  type MarkdownShare,
  type MarkdownStore,
} from "@/types/markdown";
import type { StateCreator } from "zustand";

export const createMarkdownStore: StateCreator<
  MarkdownStore,
  [],
  [],
  MarkdownStore
> = (set, get, _store) => {
  void _store;
  return {
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
  ...markdownStoreOpenActions(set, get),
  saveActiveFile: async (options) => {
    const state = get();
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
        ...getIdleTransitionState(),
        recentFiles,
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
        ...getIdleTransitionState(),
        recentFiles: [],
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
    const state = get();

    if (!state.activeDocumentId) {
      set({
        content: "",
        activeFile: null,
      });
      return;
    }

    get().closeDocument(state.activeDocumentId);
  },
};
};
