"use client";

import { create } from "zustand";

import {
  canUsePersistentLocalFiles,
  clearRecentMarkdownFiles,
  createNewMarkdownFile,
  getRecentMarkdownFiles,
  openDroppedMarkdownFile,
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
  recentFiles,
  isBusy: false,
});

const getErrorState = (error: unknown) => ({
  error: getUnknownErrorMessage(error),
  isBusy: false,
});

export const useMarkdownStore = create<MarkdownStore>((set) => ({
  content: "",
  activeFile: null,
  recentFiles: [],
  hydrated: false,
  isBusy: false,
  error: null,
  canPersistFiles: canUsePersistentLocalFiles(),
  hydrate: () =>
    set({
      hydrated: true,
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
      const { entry, content, recentFiles } = await openMarkdownWithPicker();
      set(getResolvedState(entry, content, recentFiles));
    } catch (error) {
      set(getErrorState(error));
    }
  },
  openDroppedFile: async (file, items) => {
    set(getBusyState());

    try {
      const { entry, content, recentFiles } = await openDroppedMarkdownFile(
        file,
        items
      );
      set(getResolvedState(entry, content, recentFiles));
    } catch (error) {
      set(getErrorState(error));
    }
  },
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
        error: null,
      };
    }),
}));
