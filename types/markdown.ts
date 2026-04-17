"use client";

export type PermissionMode = "read" | "readwrite";

export type RecentMarkdownFileSource = "picker" | "drop" | "url";

export type MarkdownDocumentStats = {
  characterCount: number;
  wordCount: number;
  lineCount: number;
};

export type RecentMarkdownFile = {
  id: string;
  name: string;
  path: string | null;
  url: string | null;
  urlFileName: string | null;
  lastOpenedAt: string;
  source: RecentMarkdownFileSource;
  stats?: MarkdownDocumentStats;
};

export type MarkdownOpenFromUrlActionResult =
  | {
      status: "opened";
    }
  | {
      status: "selection-required";
      files: string[];
    }
  | {
      status: "error";
    };

export type PendingMarkdownImport = {
  entry: RecentMarkdownFile;
  content: string;
};

export type OpenMarkdownDocument = {
  id: string;
  file: RecentMarkdownFile;
  content: string;
  savedContent: string;
  isDirty: boolean;
};

export type PendingRemoteMarkdownOpen = {
  url: string;
  files: string[];
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
  openDocuments: OpenMarkdownDocument[];
  activeDocumentId: string | null;
  content: string;
  activeFile: RecentMarkdownFile | null;
  pendingImports: PendingMarkdownImport[];
  pendingRemoteOpen: PendingRemoteMarkdownOpen | null;
  recentFiles: RecentMarkdownFile[];
  hydrated: boolean;
  isBusy: boolean;
  error: string | null;
  canPersistFiles: boolean;
  hydrate: () => void;
  clearError: () => void;
  setContent: (content: string) => void;
  setDocumentContent: (id: string, content: string) => void;
  setActiveDocument: (id: string) => void;
  openWithPicker: () => Promise<void>;
  openFromUrl: (
    url: string,
    fileName?: string
  ) => Promise<MarkdownOpenFromUrlActionResult>;
  openDeepLinkUrl: (url: string) => Promise<void>;
  openDroppedFiles: (
    files: File[],
    items?: DataTransferItemList | null
  ) => Promise<void>;
  clearPendingImports: () => void;
  openPendingRemoteFile: (fileName: string) => Promise<void>;
  clearPendingRemoteOpen: () => void;
  reopenRecentFile: (id: string) => Promise<void>;
  createNewFile: () => Promise<void>;
  saveActiveFile: () => Promise<void>;
  goHome: () => void;
  closeDocument: (id: string) => void;
  removeRecentFile: (id: string) => Promise<void>;
  clearRecentFiles: () => Promise<void>;
  clearDocument: () => void;
};
