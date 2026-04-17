"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { type ViewMode } from "@/types/view-mode";

type MarkdownUiStore = {
  viewMode: ViewMode;
  syncScrollEnabled: boolean;
  setViewMode: (value: ViewMode) => void;
  toggleSyncScroll: () => void;
};

export const useMarkdownUiStore = create<MarkdownUiStore>()(
  persist(
    (set) => ({
      viewMode: "split",
      syncScrollEnabled: true,
      setViewMode: (value) => set({ viewMode: value }),
      toggleSyncScroll: () =>
        set((state) => ({
          syncScrollEnabled: !state.syncScrollEnabled,
        })),
    }),
    {
      name: "markdown-app:user-settings",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        viewMode: state.viewMode,
        syncScrollEnabled: state.syncScrollEnabled,
      }),
    }
  )
);
