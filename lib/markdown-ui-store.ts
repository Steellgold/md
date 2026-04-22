"use client";

import { type ViewMode } from "@/types/view-mode";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type RecentFilesVisibleCount = 3 | 6 | 9 | 12;

type MarkdownUiStore = {
  viewMode: ViewMode;
  editorFocusMode: boolean;
  syncScrollEnabled: boolean;
  recentFilesExpanded: boolean;
  recentFilesVisibleCount: RecentFilesVisibleCount;
  collaborationDisplayName: string;
  setViewMode: (value: ViewMode) => void;
  toggleEditorFocusMode: () => void;
  setEditorFocusMode: (value: boolean) => void;
  toggleSyncScroll: () => void;
  setRecentFilesExpanded: (value: boolean) => void;
  setRecentFilesVisibleCount: (value: RecentFilesVisibleCount) => void;
  setCollaborationDisplayName: (value: string) => void;
};

export const useMarkdownUiStore = create<MarkdownUiStore>()(
  persist(
    (set) => ({
      viewMode: "editor",
      editorFocusMode: false,
      syncScrollEnabled: true,
      recentFilesExpanded: true,
      recentFilesVisibleCount: 9,
      collaborationDisplayName: "",
      setViewMode: (value) => set({ viewMode: value }),
      toggleEditorFocusMode: () =>
        set((state) => ({
          editorFocusMode: !state.editorFocusMode,
        })),
      setEditorFocusMode: (value) => set({ editorFocusMode: value }),
      toggleSyncScroll: () =>
        set((state) => ({
          syncScrollEnabled: !state.syncScrollEnabled,
        })),
      setRecentFilesExpanded: (value) => set({ recentFilesExpanded: value }),
      setRecentFilesVisibleCount: (value) =>
        set({ recentFilesVisibleCount: value }),
      setCollaborationDisplayName: (value) =>
        set({ collaborationDisplayName: value }),
    }),
    {
      name: "markdown-app:user-settings",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        viewMode: state.viewMode,
        editorFocusMode: state.editorFocusMode,
        syncScrollEnabled: state.syncScrollEnabled,
        recentFilesExpanded: state.recentFilesExpanded,
        recentFilesVisibleCount: state.recentFilesVisibleCount,
        collaborationDisplayName: state.collaborationDisplayName,
      }),
    }
  )
);
