"use client";

export type PermissionMode = "read" | "readwrite";

export type RecentMarkdownFileSource = "picker" | "drop";

export type MarkdownDocumentStats = {
  characterCount: number;
  wordCount: number;
  lineCount: number;
};

export type RecentMarkdownFile = {
  id: string;
  name: string;
  path: string | null;
  lastOpenedAt: string;
  source: RecentMarkdownFileSource;
  stats?: MarkdownDocumentStats;
};

export type OpenMarkdownResult = {
  entry: RecentMarkdownFile;
  content: string;
};

export type PickerOptions = {
  id?: string;
  source?: RecentMarkdownFileSource;
};

export type FilePickerAcceptType = {
  description?: string;
  accept: Record<string, string[]>;
};

export type OpenFilePickerOptions = {
  excludeAcceptAllOption?: boolean;
  id?: string;
  multiple?: boolean;
  startIn?: string;
  types?: FilePickerAcceptType[];
};

export type SaveFilePickerOptions = {
  excludeAcceptAllOption?: boolean;
  id?: string;
  suggestedName?: string;
  startIn?: string;
  types?: FilePickerAcceptType[];
};

export type MarkdownFileHandle = FileSystemFileHandle & {
  requestPermission?: (descriptor?: {
    mode?: PermissionMode;
  }) => Promise<PermissionState>;
  queryPermission?: (descriptor?: {
    mode?: PermissionMode;
  }) => Promise<PermissionState>;
  isSameEntry?: (other: FileSystemHandle) => Promise<boolean>;
  createWritable?: () => Promise<{
    write: (data: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

export type DataTransferItemWithHandle = DataTransferItem & {
  getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>;
};

export type MarkdownStore = {
  content: string;
  activeFile: RecentMarkdownFile | null;
  recentFiles: RecentMarkdownFile[];
  hydrated: boolean;
  isBusy: boolean;
  error: string | null;
  canPersistFiles: boolean;
  hydrate: () => void;
  clearError: () => void;
  setContent: (content: string) => void;
  openWithPicker: () => Promise<void>;
  openDroppedFile: (
    file: File,
    items?: DataTransferItemList | null
  ) => Promise<void>;
  reopenRecentFile: (id: string) => Promise<void>;
  createNewFile: () => Promise<void>;
  saveActiveFile: () => Promise<void>;
  removeRecentFile: (id: string) => Promise<void>;
  clearRecentFiles: () => Promise<void>;
  clearDocument: () => void;
};
