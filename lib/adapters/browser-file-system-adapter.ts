"use client";

import {
  type MarkdownDirectoryHandle,
  type MarkdownFileHandle,
  type OpenFilePickerOptions,
  type PermissionMode,
} from "@/types/markdown";

declare global {
  interface Window {
    showOpenFilePicker?: (
      options?: OpenFilePickerOptions
    ) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?: (
      options?: import("@/types/markdown").SaveFilePickerOptions
    ) => Promise<FileSystemFileHandle>;
    showDirectoryPicker?: (options?: {
      id?: string;
      mode?: PermissionMode;
      startIn?: string;
    }) => Promise<FileSystemDirectoryHandle>;
  }
}

const isBrowser = () => typeof window !== "undefined";

export const supportsOpenFilePicker = () =>
  isBrowser() && typeof window.showOpenFilePicker === "function";

export const supportsDirectoryPicker = () =>
  isBrowser() && typeof window.showDirectoryPicker === "function";

export const normalizeMarkdownContent = (content: string) =>
  content.replace(/\r\n/gu, "\n");

export const ensurePermission = async (
  handle: MarkdownFileHandle | MarkdownDirectoryHandle,
  mode: PermissionMode = "read"
) => {
  if (!handle.queryPermission || !handle.requestPermission) {
    return true;
  }

  const currentPermission = await handle.queryPermission({ mode });

  if (currentPermission === "granted") {
    return true;
  }

  const requestedPermission = await handle.requestPermission({ mode });
  return requestedPermission === "granted";
};

export const readMarkdownFileContent = async (handle: FileSystemFileHandle) => {
  const file = await handle.getFile();
  return normalizeMarkdownContent(await file.text());
};
