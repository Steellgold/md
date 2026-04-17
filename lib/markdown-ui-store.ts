"use client";

import { type ViewMode } from "@/types/view-mode";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type RecentFilesVisibleCount = 3 | 6 | 9 | 12;

type MarkdownUiStore = {
  viewMode: ViewMode;
  syncScrollEnabled: boolean;
  recentFilesExpanded: boolean;
  recentFilesVisibleCount: RecentFilesVisibleCount;
  setViewMode: (value: ViewMode) => void;
  toggleSyncScroll: () => void;
  setRecentFilesExpanded: (value: boolean) => void;
  setRecentFilesVisibleCount: (value: RecentFilesVisibleCount) => void;
};

export const useMarkdownUiStore = create<MarkdownUiStore>()(
  persist(
    (set) => ({
      viewMode: "split",
      syncScrollEnabled: true,
      recentFilesExpanded: true,
      recentFilesVisibleCount: 9,
      setViewMode: (value) => set({ viewMode: value }),
      toggleSyncScroll: () =>
        set((state) => ({
          syncScrollEnabled: !state.syncScrollEnabled,
        })),
      setRecentFilesExpanded: (value) => set({ recentFilesExpanded: value }),
      setRecentFilesVisibleCount: (value) =>
        set({ recentFilesVisibleCount: value }),
    }),
    {
      name: "markdown-app:user-settings",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        viewMode: state.viewMode,
        syncScrollEnabled: state.syncScrollEnabled,
        recentFilesExpanded: state.recentFilesExpanded,
        recentFilesVisibleCount: state.recentFilesVisibleCount,
      }),
    }
  )
);
