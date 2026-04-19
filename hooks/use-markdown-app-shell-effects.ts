"use client";

import { faker } from "@faker-js/faker";
import { useEffect } from "react";
import { toast } from "sonner";

import { defaultDocumentTitle } from "@/lib/markdown-app-constants";
import type { ParsedCollaborationJoinParams } from "@/lib/markdown-collaboration";

type UseMarkdownAppShellEffectsInput = {
  activeFileName: string | null;
  collaborationDisplayName: string;
  error: string | null;
  hydrated: boolean;
  parsedCollabJoin: ParsedCollaborationJoinParams | null;
  setCollaborationDisplayNameAction: (value: string) => void;
  setPreviewDetachedAction: (value: boolean) => void;
  clearErrorAction: () => void;
  hydrateAction: () => void;
  openScratchDocumentAction: (name?: string) => void;
  uiError: string | null;
  setUiErrorAction: (value: string | null) => void;
};

export const useMarkdownAppShellEffects = ({
  activeFileName,
  collaborationDisplayName,
  error,
  hydrated,
  parsedCollabJoin,
  setCollaborationDisplayNameAction,
  setPreviewDetachedAction,
  clearErrorAction,
  hydrateAction,
  openScratchDocumentAction,
  uiError,
  setUiErrorAction,
}: UseMarkdownAppShellEffectsInput) => {
  useEffect(() => {
    hydrateAction();
  }, [hydrateAction]);

  useEffect(() => {
    if (collaborationDisplayName.trim() !== "") {
      return;
    }

    setCollaborationDisplayNameAction(faker.person.fullName());
  }, [collaborationDisplayName, setCollaborationDisplayNameAction]);

  useEffect(() => {
    if (!hydrated || !parsedCollabJoin || activeFileName) {
      return;
    }

    openScratchDocumentAction(
      parsedCollabJoin.fileName ?? "Collaborative document.md"
    );
  }, [activeFileName, hydrated, openScratchDocumentAction, parsedCollabJoin]);

  useEffect(() => {
    document.title = activeFileName
      ? `${activeFileName} | ${defaultDocumentTitle}`
      : defaultDocumentTitle;
  }, [activeFileName]);

  useEffect(() => {
    if (!activeFileName) {
      setTimeout(() => setPreviewDetachedAction(false), 0);
    }
  }, [activeFileName, setPreviewDetachedAction]);

  useEffect(() => {
    if (!error) {
      return;
    }

    toast.error(error);
    clearErrorAction();
  }, [clearErrorAction, error]);

  useEffect(() => {
    if (!uiError) {
      return;
    }

    toast.error(uiError);
    setUiErrorAction(null);
  }, [setUiErrorAction, uiError]);
};
