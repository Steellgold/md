"use client";

import { create } from "zustand";

import {
  canUsePersistentLocalFiles,
  clearRecentMarkdownFiles,
  createNewMarkdownFile,
  getRecentMarkdownFiles,
  openMarkdownFromUrl,
  openDroppedMarkdownFiles,
  openMarkdownWithPicker,
  removeRecentMarkdownFile,
  reopenRecentMarkdownFile,
  saveRecentMarkdownFile,
  syncRecentMarkdownFileSnapshot,
} from "@/lib/markdown-file-system";
import {
  getMarkdownDocumentStats,
  getUnknownErrorMessage,
} from "@/lib/markdown-helpers";
import { type MarkdownStore } from "@/types/markdown";

const getBusyState = () => ({ isBusy: true, error: null });

const getResolvedState = (
  entry: MarkdownStore["activeFile"],
  content: string,
  recentFiles: MarkdownStore["recentFiles"]
) => ({
  activeFile: entry,
  content,
  pendingImports: [],
  pendingRemoteOpen: null,
  recentFiles,
  isBusy: false,
  error: null,
});

const getErrorState = (error: unknown) => ({
  error: getUnknownErrorMessage(error),
  isBusy: false,
  pendingImports: [],
  pendingRemoteOpen: null,
});

export const useMarkdownStore = create<MarkdownStore>((set) => ({
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
      if (!state.activeFile) {
        return { content };
      }

      const stats = getMarkdownDocumentStats(content);

      return {
        content,
        activeFile: {
          ...state.activeFile,
          stats,
        },
        recentFiles: state.recentFiles.map((file) =>
          file.id === state.activeFile?.id
            ? {
                ...file,
                stats,
              }
            : file
        ),
      };
    }),
  openWithPicker: async () => {
    set(getBusyState());

    try {
      const result = await openMarkdownWithPicker();

      if (result.status === "selection-required") {
        set({
          pendingImports: result.documents,
          recentFiles: result.recentFiles,
          isBusy: false,
          error: null,
        });
        return;
      }

      set({
        ...getResolvedState(result.entry, result.content, result.recentFiles),
        pendingImports: [],
      });
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

      set(getResolvedState(result.entry, result.content, result.recentFiles));
      return { status: "opened" };
    } catch (error) {
      set(getErrorState(error));
      return { status: "error" };
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

      set(getResolvedState(result.entry, result.content, result.recentFiles));
    } catch (error) {
      set(getErrorState(error));
    }
  },
  openDroppedFiles: async (files, items) => {
    set(getBusyState());

    try {
      const result = await openDroppedMarkdownFiles(files, items);

      if (result.status === "selection-required") {
        set({
          pendingImports: result.documents,
          pendingRemoteOpen: null,
          recentFiles: result.recentFiles,
          isBusy: false,
          error: null,
        });
        return;
      }

      set({
        ...getResolvedState(result.entry, result.content, result.recentFiles),
        pendingImports: [],
      });
    } catch (error) {
      set(getErrorState(error));
    }
  },
  openPendingImport: (id) =>
    set((state) => {
      const selectedImport = state.pendingImports.find(
        (pendingImport) => pendingImport.entry.id === id
      );

      if (!selectedImport) {
        return state;
      }

      return {
        activeFile: selectedImport.entry,
        content: selectedImport.content,
        isBusy: false,
        pendingImports: [],
        error: null,
      };
    }),
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

      set(getResolvedState(result.entry, result.content, result.recentFiles));
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
      set(getResolvedState(entry, content, recentFiles));
    } catch (error) {
      set(getErrorState(error));
    }
  },
  createNewFile: async () => {
    set(getBusyState());

    try {
      const { entry, content, recentFiles } = await createNewMarkdownFile("");
      set(getResolvedState(entry, content, recentFiles));
    } catch (error) {
      set(getErrorState(error));
    }
  },
  saveActiveFile: async () => {
    const state = useMarkdownStore.getState();

    if (!state.activeFile) {
      set(getErrorState(new Error("No active file to save.")));
      return;
    }

    set(getBusyState());

    try {
      const { entry, recentFiles } = await saveRecentMarkdownFile(
        state.activeFile.id,
        state.content
      );

      set({
        activeFile: entry,
        recentFiles,
        isBusy: false,
        error: null,
      });
    } catch (error) {
      set(getErrorState(error));
    }
  },
  removeRecentFile: async (id) => {
    set(getBusyState());

    try {
      const recentFiles = await removeRecentMarkdownFile(id);
      set({
        recentFiles,
        isBusy: false,
        pendingImports: [],
        pendingRemoteOpen: null,
        error: null,
      });
    } catch (error) {
      set(getErrorState(error));
    }
  },
  clearRecentFiles: async () => {
    set(getBusyState());

    try {
      await clearRecentMarkdownFiles();
      set({
        recentFiles: [],
        isBusy: false,
        pendingImports: [],
        pendingRemoteOpen: null,
        error: null,
      });
    } catch (error) {
      set(getErrorState(error));
    }
  },
  clearDocument: () =>
    set((state) => {
      if (state.activeFile) {
        void syncRecentMarkdownFileSnapshot(state.activeFile.id, state.content);
      }

      return {
        content: "",
        activeFile: null,
        pendingImports: [],
        pendingRemoteOpen: null,
        error: null,
      };
    }),
}));
