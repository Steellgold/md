import type { RecentMarkdownFile } from "@/types/markdown";

const RECENT_FILES_KEY = "markdown-app:recent-files";

const isBrowser = () => typeof window !== "undefined";

const supportsLocalStorage = () =>
  isBrowser() && typeof window.localStorage !== "undefined";

export const readRecentFilesFromStorage = () => {
  if (!supportsLocalStorage()) {
    return [] as RecentMarkdownFile[];
  }

  const raw = window.localStorage.getItem(RECENT_FILES_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as RecentMarkdownFile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const writeRecentFilesToStorage = (files: RecentMarkdownFile[]) => {
  if (!supportsLocalStorage()) {
    return;
  }

  window.localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(files));
};
