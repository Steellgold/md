"use client";

import { MARKDOWN_FILE_TYPES } from "@/lib/markdown-helpers";
import {
  createEntryFromFile,
  createEntryFromHandle,
  findMatchingRecentFile,
  persistRecentEntries,
} from "@/lib/markdown-file-system-core";
import {
  ensurePermission,
  normalizeMarkdownContent,
  readMarkdownFileContent,
  supportsOpenFilePicker,
} from "@/lib/adapters/browser-file-system-adapter";
import { saveHandle } from "@/lib/persistence/file-handles-repo";
import {
  type DataTransferItemWithHandle,
  type MarkdownFileHandle,
  type PendingMarkdownImport,
  type PickerOptions,
} from "@/types/markdown";

export const openMarkdownWithPicker = async (options: PickerOptions = {}) => {
  if (!supportsOpenFilePicker()) {
    throw new Error(
      "This browser does not support persistent local file access."
    );
  }

  const handles = await window.showOpenFilePicker!({
    id: options.id ?? "markdown-open",
    multiple: true,
    excludeAcceptAllOption: true,
    types: MARKDOWN_FILE_TYPES,
  });

  if (handles.length === 0) {
    throw new Error("No files were selected.");
  }

  const documents: PendingMarkdownImport[] = [];

  for (const handle of handles) {
    const hasPermission = await ensurePermission(handle as MarkdownFileHandle);

    if (!hasPermission) {
      throw new Error("Read permission was denied.");
    }

    const content = await readMarkdownFileContent(handle);
    const existingEntry = await findMatchingRecentFile(handle);
    const entry = await createEntryFromHandle(
      handle,
      options.source ?? "picker",
      content,
      existingEntry?.id ?? options.id,
      existingEntry?.share ?? null
    );

    await saveHandle(entry.id, handle);
    documents.push({
      entry: {
        ...entry,
        path: existingEntry?.path ?? entry.path,
      },
      content,
    });
  }

  const recentFiles = persistRecentEntries(
    documents.map((document) => document.entry)
  );

  if (documents.length === 1) {
    const [document] = documents;

    return {
      status: "opened" as const,
      entry: document.entry,
      content: document.content,
      recentFiles,
    };
  }

  return {
    status: "selection-required" as const,
    documents,
    recentFiles,
  };
};

const pickFilesFromInput = (accept = ".md,.markdown,.mdown,.txt") =>
  new Promise<File[]>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = true;

    input.addEventListener("change", () => {
      resolve(Array.from(input.files ?? []));
    });

    // If focus returns and no file was selected, treat as canceled.
    input.addEventListener(
      "blur",
      () => {
        window.setTimeout(() => {
          if (!input.files || input.files.length === 0) {
            resolve([]);
          }
        }, 0);
      },
      { once: true }
    );

    input.click();
  });

export const openMarkdownWithInputPicker = async (
  options: PickerOptions = {}
) => {
  const files = await pickFilesFromInput();

  if (files.length === 0) {
    throw new DOMException("The user aborted a request.", "AbortError");
  }

  const documents: PendingMarkdownImport[] = [];

  for (const file of files) {
    const content = normalizeMarkdownContent(await file.text());
    documents.push({
      entry: createEntryFromFile(file, content, options.source ?? "picker"),
      content,
    });
  }

  const recentFiles = persistRecentEntries(
    documents.map((document) => document.entry)
  );

  if (documents.length === 1) {
    const [document] = documents;

    return {
      status: "opened" as const,
      entry: document.entry,
      content: document.content,
      recentFiles,
    };
  }

  return {
    status: "selection-required" as const,
    documents,
    recentFiles,
  };
};

export const openDroppedMarkdownFiles = async (
  files: File[],
  items?: DataTransferItemList | null
) => {
  if (files.length === 0) {
    throw new Error("No files were provided.");
  }

  const handles: Array<FileSystemFileHandle | null> = [];

  if (items) {
    for (const item of Array.from(items)) {
      const itemWithHandle = item as DataTransferItemWithHandle;
      const maybeHandle = itemWithHandle.getAsFileSystemHandle
        ? await itemWithHandle.getAsFileSystemHandle()
        : null;

      if (maybeHandle?.kind === "file") {
        handles.push(maybeHandle as FileSystemFileHandle);
      }
    }
  }

  const documents: PendingMarkdownImport[] = [];

  for (const [index, file] of files.entries()) {
    const handle = handles[index] ?? null;
    const content = await file.text();
    const normalizedContent = normalizeMarkdownContent(content);

    if (!handle) {
      documents.push({
        entry: createEntryFromFile(file, normalizedContent, "drop"),
        content: normalizedContent,
      });
      continue;
    }

    const hasPermission = await ensurePermission(handle as MarkdownFileHandle);

    if (!hasPermission) {
      throw new Error("Read permission for the dropped file was denied.");
    }

    const existingEntry = await findMatchingRecentFile(handle);
    const entry = {
      ...(await createEntryFromHandle(
        handle,
        "drop",
        normalizedContent,
        existingEntry?.id,
        existingEntry?.share ?? null
      )),
      path: file.webkitRelativePath || existingEntry?.path || null,
    };

    await saveHandle(entry.id, handle);
    documents.push({ entry, content: normalizedContent });
  }

  const recentFiles = persistRecentEntries(
    documents.map((document) => document.entry)
  );

  if (documents.length === 1) {
    const [document] = documents;

    return {
      status: "opened" as const,
      entry: document.entry,
      content: document.content,
      recentFiles,
    };
  }

  return {
    status: "selection-required" as const,
    documents,
    recentFiles,
  };
};

export const createNewMarkdownFile = async (
  initialContent = "",
  suggestedName = "Untitled.md"
) => {
  if (
    !supportsOpenFilePicker() ||
    typeof window.showSaveFilePicker !== "function"
  ) {
    throw new Error("This browser does not support saving local files.");
  }

  const handle = await window.showSaveFilePicker({
    id: "markdown-save",
    suggestedName,
    excludeAcceptAllOption: true,
    types: MARKDOWN_FILE_TYPES,
  });

  const markdownHandle = handle as MarkdownFileHandle;
  const hasPermission = await ensurePermission(markdownHandle, "readwrite");

  if (!hasPermission) {
    throw new Error("Write permission was denied for this local file.");
  }

  if (!markdownHandle.createWritable) {
    throw new Error("This browser does not support writing to local files.");
  }

  const writable = await markdownHandle.createWritable();
  await writable.write(initialContent);
  await writable.close();

  const existingEntry = await findMatchingRecentFile(handle);
  const entry = await createEntryFromHandle(
    handle,
    "picker",
    initialContent,
    existingEntry?.id,
    existingEntry?.share ?? null
  );

  await saveHandle(entry.id, handle);
  const recentFiles = persistRecentEntries([
    {
      ...entry,
      path: existingEntry?.path ?? entry.path,
    },
  ]);

  return { entry, content: initialContent, recentFiles };
};
