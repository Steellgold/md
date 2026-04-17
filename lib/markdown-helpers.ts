"use client";

import {
  type MarkdownDocumentStats,
  type RecentMarkdownFile,
} from "@/types/markdown";

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

export const getMarkdownDocumentStats = (
  content: string
): MarkdownDocumentStats => {
  const trimmedContent = content.trim();

  return {
    characterCount: content.length,
    wordCount: trimmedContent ? trimmedContent.split(/\s+/u).length : 0,
    lineCount: content === "" ? 1 : content.split(/\r?\n/u).length,
  };
};

const numberFormatter = new Intl.NumberFormat();

export const formatMarkdownDocumentStats = (stats: MarkdownDocumentStats) =>
  [
    `${numberFormatter.format(stats.characterCount)} chars`,
    `${numberFormatter.format(stats.wordCount)} words`,
    `${numberFormatter.format(stats.lineCount)} lines`,
  ].join(" • ");

export const buildActiveDocumentMeta = (
  stats: MarkdownDocumentStats,
  file: RecentMarkdownFile | null
) => {
  const statsLabel = formatMarkdownDocumentStats(stats);

  if (!file?.lastOpenedAt) {
    return statsLabel;
  }

  const metadata = [statsLabel];

  if (file.url) {
    metadata.push("remote");
  }

  metadata.push(`opened ${new Date(file.lastOpenedAt).toLocaleString()}`);

  return metadata.join(" • ");
};

export const buildRecentFileMeta = (file: RecentMarkdownFile) => {
  const locationLabel = file.url ?? file.path;

  if (file.stats) {
    return locationLabel
      ? `${formatMarkdownDocumentStats(file.stats)} • ${locationLabel}`
      : formatMarkdownDocumentStats(file.stats);
  }

  if (locationLabel) {
    return locationLabel;
  }

  return `Opened ${new Date(file.lastOpenedAt).toLocaleString()}`;
};

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
