"use client";

import {
  createNewMarkdownFile,
  openDroppedMarkdownFiles,
  openMarkdownFolder,
  openMarkdownWithInputPicker,
  openMarkdownFromUrl,
  openMarkdownWithPicker,
  openWorkspaceMarkdownPage,
  reopenRecentMarkdownFile,
} from "@/lib/markdown-file-system";
import {
  buildDocumentState,
  findWorkspacePage,
  getBusyState,
  getErrorState,
  getIdleTransitionState,
  getPendingRemoteState,
  upsertOpenDocument,
  upsertOpenDocuments,
} from "@/lib/markdown-store-helpers";
import { getUnknownErrorMessage, isUserAbortError } from "@/lib/markdown-helpers";
import { type MarkdownStore } from "@/types/markdown";
import type { StoreApi } from "zustand";

type MarkdownStoreSet = StoreApi<MarkdownStore>["setState"];
type MarkdownStoreGet = StoreApi<MarkdownStore>["getState"];

export const markdownStoreOpenActions = (
  set: MarkdownStoreSet,
  get: MarkdownStoreGet
) =>
  ({
  openFolder: async () => {
    set(getBusyState("Opening folder..."));

    try {
      const result = await openMarkdownFolder();

      set((state) =>
        buildDocumentState(
          upsertOpenDocuments(state.openDocuments, result.documents),
          result.entry.id,
          result.recentFiles,
          { workspace: result.workspace }
        )
      );
    } catch (error) {
      if (isUserAbortError(error)) {
        set(getIdleTransitionState());
        return;
      }

      set(getErrorState(error));
    }
  },
  openWorkspacePageByPath: async (relativePath) => {
    const state = get();

    if (!state.workspace) {
      set(getErrorState(new Error("No workspace is currently open.")));
      return false;
    }

    const page = findWorkspacePage(state.workspace, relativePath);

    if (!page) {
      set(
        getErrorState(
          new Error(`No page found for workspace path "${relativePath}".`)
        )
      );
      return false;
    }

    const existingDocument =
      state.openDocuments.find((document) => document.id === page.id) ?? null;

    if (existingDocument) {
      set((currentState) =>
        buildDocumentState(
          currentState.openDocuments,
          existingDocument.id,
          currentState.recentFiles,
          { workspace: currentState.workspace }
        )
      );
      return true;
    }

    try {
      const result = await openWorkspaceMarkdownPage(page, state.workspace.id);

      set((currentState) =>
        buildDocumentState(
          upsertOpenDocument(
            currentState.openDocuments,
            result.entry,
            result.content
          ),
          result.entry.id,
          result.recentFiles,
          { workspace: currentState.workspace }
        )
      );
      return true;
    } catch (error) {
      set(getErrorState(error));
      return false;
    }
  },
  openWithPicker: async () => {
    set(getBusyState("Opening file..."));

    try {
      const preferInputPickerFallback =
        typeof window !== "undefined" &&
        window.matchMedia("(pointer: coarse)").matches;
      const result = preferInputPickerFallback
        ? await openMarkdownWithInputPicker()
        : await openMarkdownWithPicker();

      if (result.status === "selection-required") {
        set((state) =>
          buildDocumentState(
            upsertOpenDocuments(state.openDocuments, result.documents),
            result.documents.at(-1)?.entry.id ?? state.activeDocumentId,
            result.recentFiles
          )
        );
        return;
      }

      set((state) =>
        buildDocumentState(
          upsertOpenDocument(state.openDocuments, result.entry, result.content),
          result.entry.id,
          result.recentFiles
        )
      );
    } catch (error) {
      if (isUserAbortError(error)) {
        set(getIdleTransitionState());
        return;
      }

      set(getErrorState(error));
    }
  },
  openFromUrl: async (url, fileName) => {
    set(getBusyState("Loading document..."));

    try {
      const result = await openMarkdownFromUrl(url, { fileName });

      if ("status" in result && result.status === "password-required") {
        set(getPendingRemoteState(url, [], true));

        return result;
      }

      if ("status" in result && result.status === "selection-required") {
        set(getIdleTransitionState());

        return result;
      }

      set((state) =>
        buildDocumentState(
          upsertOpenDocument(state.openDocuments, result.entry, result.content),
          result.entry.id,
          result.recentFiles
        )
      );
      return { status: "opened" as const };
    } catch (error) {
      set(getErrorState(error));
      return { status: "error" as const };
    }
  },
  openDeepLinkUrl: async (url) => {
    set(getBusyState("Loading document..."));

    try {
      const result = await openMarkdownFromUrl(url);

      if (result.status === "password-required") {
        set(getPendingRemoteState(url, [], true));
        return;
      }

      if (result.status === "selection-required") {
        set(getPendingRemoteState(url, result.files, false));
        return;
      }

      set((state) =>
        buildDocumentState(
          upsertOpenDocument(state.openDocuments, result.entry, result.content),
          result.entry.id,
          result.recentFiles
        )
      );
    } catch (error) {
      set(getErrorState(error));
    }
  },
  openDroppedFiles: async (files, items) => {
    set(
      getBusyState(files.length > 1 ? "Loading files..." : "Loading file...")
    );

    try {
      const result = await openDroppedMarkdownFiles(files, items);

      if (result.status === "selection-required") {
        set((state) =>
          buildDocumentState(
            upsertOpenDocuments(state.openDocuments, result.documents),
            result.documents.at(-1)?.entry.id ?? state.activeDocumentId,
            result.recentFiles
          )
        );
        return;
      }

      set((state) =>
        buildDocumentState(
          upsertOpenDocument(state.openDocuments, result.entry, result.content),
          result.entry.id,
          result.recentFiles
        )
      );
    } catch (error) {
      set(getErrorState(error));
    }
  },
  clearPendingImports: () => set({ pendingImports: [] }),
  openPendingRemoteFile: async (fileName, password) => {
    const state = get();
    const pendingRemoteOpen = state.pendingRemoteOpen;

    if (!pendingRemoteOpen) {
      set(getErrorState(new Error("No remote file is waiting to be opened.")));
      return;
    }

    set(getBusyState(`Opening ${fileName}...`));

    try {
      const rememberedFileName =
        pendingRemoteOpen.files.length === 1
          ? pendingRemoteOpen.files[0]
          : undefined;
      const effectiveFileName = fileName ?? rememberedFileName;

      const result = await openMarkdownFromUrl(pendingRemoteOpen.url, {
        fileName: effectiveFileName,
        password,
      });

      if (result.status === "password-required") {
        set(getPendingRemoteState(pendingRemoteOpen.url, [], true));
        return;
      }

      if (result.status === "selection-required") {
        set(getPendingRemoteState(pendingRemoteOpen.url, result.files, false));
        return;
      }

      set((currentState) =>
        buildDocumentState(
          upsertOpenDocument(
            currentState.openDocuments,
            result.entry,
            result.content
          ),
          result.entry.id,
          result.recentFiles
        )
      );
    } catch (error) {
      set({
        error: getUnknownErrorMessage(error),
        isBusy: false,
        busyMessage: null,
      });
    }
  },
  clearPendingRemoteOpen: () => set({ pendingRemoteOpen: null }),
  reopenRecentFile: async (id) => {
    const knownEntry =
      get().recentFiles.find((file) => file.id === id) ?? null;

    set(getBusyState(`Opening ${knownEntry?.name ?? "file"}...`));

    try {
      const result = await reopenRecentMarkdownFile(id);

      if ("status" in result) {
        if (result.status === "password-required") {
          set(
            getPendingRemoteState(
              result.url,
              result.fileName ? [result.fileName] : [],
              true
            )
          );
          return;
        }

        if (result.status === "selection-required") {
          set(getPendingRemoteState(result.url, result.files, false));
          return;
        }
      }

      if ("workspace" in result && "documents" in result) {
        set((state) =>
          buildDocumentState(
            upsertOpenDocuments(state.openDocuments, result.documents),
            result.entry.id,
            result.recentFiles,
            { workspace: result.workspace }
          )
        );
        return;
      }

      const { entry, content, recentFiles } = result;

      set((state) =>
        buildDocumentState(
          upsertOpenDocument(state.openDocuments, entry, content),
          entry.id,
          recentFiles
        )
      );
    } catch (error) {
      set(getErrorState(error));
    }
  },
  createNewFile: async () => {
    set(getBusyState("Creating file..."));

    try {
      const { entry, content, recentFiles } = await createNewMarkdownFile("");
      set((state) =>
        buildDocumentState(
          upsertOpenDocument(state.openDocuments, entry, content),
          entry.id,
          recentFiles
        )
      );
    } catch (error) {
      if (isUserAbortError(error)) {
        set(getIdleTransitionState());
        return;
      }

      set(getErrorState(error));
    }
  },
  createLocalCopyOfActiveFile: async () => {
    const state = get();
    const activeDocument =
      state.openDocuments.find(
        (document) => document.id === state.activeDocumentId
      ) ?? null;

    if (!activeDocument) {
      set(getErrorState(new Error("No active file to copy locally.")));
      return;
    }

    set(getBusyState("Creating local copy..."));

    try {
      const { entry, content, recentFiles } = await createNewMarkdownFile(
        activeDocument.content,
        activeDocument.file.name
      );

      set((currentState) =>
        buildDocumentState(
          upsertOpenDocument(currentState.openDocuments, entry, content),
          entry.id,
          recentFiles
        )
      );
    } catch (error) {
      if (isUserAbortError(error)) {
        set(getIdleTransitionState());
        return;
      }

      set(getErrorState(error));
    }
  },
  }) satisfies Pick<
    MarkdownStore,
    | "openFolder"
    | "openWorkspacePageByPath"
    | "openWithPicker"
    | "openFromUrl"
    | "openDeepLinkUrl"
    | "openDroppedFiles"
    | "clearPendingImports"
    | "openPendingRemoteFile"
    | "clearPendingRemoteOpen"
    | "reopenRecentFile"
    | "createNewFile"
    | "createLocalCopyOfActiveFile"
  >;
