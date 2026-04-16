"use client";

import { type RecentMarkdownFile } from "@/lib/markdown-types";

export const MARKDOWN_FILE_TYPES = [
  {
    description: "Markdown",
    accept: {
      "text/markdown": [".md", ".markdown", ".mdown"],
      "text/plain": [".txt"],
    },
  },
];

export const getUnknownErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unknown error occurred.";
};

export const sortRecentFiles = (files: RecentMarkdownFile[]) =>
  [...files].sort(
    (left, right) =>
      new Date(right.lastOpenedAt).getTime() -
      new Date(left.lastOpenedAt).getTime()
  );

export const upsertRecentFile = (
  currentFiles: RecentMarkdownFile[],
  entry: RecentMarkdownFile,
  limit = 12
) =>
  sortRecentFiles(
    currentFiles.filter((file) => file.id !== entry.id).concat(entry)
  ).slice(0, limit);

export const buildFileLabel = (
  file: RecentMarkdownFile | null,
  fallback: string
) => file?.path ?? fallback;

export const getScrollRatio = (element: HTMLElement) => {
  const maxScroll = element.scrollHeight - element.clientHeight;

  if (maxScroll <= 0) {
    return 0;
  }

  return element.scrollTop / maxScroll;
};

export const setScrollRatio = (element: HTMLElement, ratio: number) => {
  const maxScroll = element.scrollHeight - element.clientHeight;
  element.scrollTop = maxScroll * ratio;
};
