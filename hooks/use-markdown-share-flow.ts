"use client";

import { shareRecentMarkdownFile } from "@/lib/markdown-file-system";
import { getUnknownErrorMessage } from "@/lib/markdown-helpers";
import { type RecentMarkdownFile } from "@/types/markdown";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type UseMarkdownShareFlowParams = {
  activeFile: RecentMarkdownFile | null;
  contentHash: string | null;
  flushPendingEditorContentAction: () => string;
  onErrorAction: (message: string) => void;
  onShareUpdatedAction: (
    documentId: string,
    share: RecentMarkdownFile["share"],
    contentHash: string
  ) => void;
};

export const useMarkdownShareFlow = ({
  activeFile,
  contentHash,
  flushPendingEditorContentAction,
  onErrorAction,
  onShareUpdatedAction,
}: UseMarkdownShareFlowParams) => {
  const [isShareBusy, setIsShareBusy] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [sharePassword, setSharePassword] = useState("");
  const [shareDialogUrl, setShareDialogUrl] = useState<string | null>(null);

  const hasPendingShareChanges = useMemo(() => {
    const currentShare = activeFile?.share ?? null;

    if (!currentShare || !contentHash) {
      return false;
    }

    return currentShare.contentHash !== contentHash;
  }, [activeFile?.share, contentHash]);

  const shareActionLabel = isShareBusy
    ? "Sharing..."
    : !activeFile?.share
      ? "Share"
      : hasPendingShareChanges
        ? "Share changes"
        : "Share";

  const shareDialogSubmitLabel = !activeFile?.share
    ? "Create link"
    : hasPendingShareChanges || sharePassword.trim() !== ""
      ? "Update share"
      : "Refresh link";

  const copyShareUrlAction = useCallback(async () => {
    if (!shareDialogUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareDialogUrl);
      toast.success("Link copied to clipboard.");
    } catch (error) {
      onErrorAction(getUnknownErrorMessage(error));
    }
  }, [onErrorAction, shareDialogUrl]);

  const openShareDialogAction = useCallback(() => {
    if (!activeFile) {
      return;
    }

    setSharePassword("");
    setShareDialogUrl(activeFile.share?.url ?? null);
    setIsShareDialogOpen(true);
  }, [activeFile]);

  const shareActiveFileAction = useCallback(async () => {
    if (!activeFile) {
      return;
    }

    const nextContent = flushPendingEditorContentAction();
    const hadShare = Boolean(activeFile.share);
    const wasShareUpdate =
      hadShare && (hasPendingShareChanges || sharePassword.trim() !== "");

    setIsShareBusy(true);

    try {
      const result = await shareRecentMarkdownFile(activeFile.id, nextContent, {
        password: sharePassword,
      });

      onShareUpdatedAction(activeFile.id, result.share, result.share.contentHash);
      setShareDialogUrl(result.share.url);
      setSharePassword("");
      setIsShareDialogOpen(true);
      toast.success(
        !hadShare
          ? "Link created."
          : wasShareUpdate
            ? "Link updated."
            : "Link refreshed."
      );
    } catch (error) {
      onErrorAction(getUnknownErrorMessage(error));
    } finally {
      setIsShareBusy(false);
    }
  }, [
    activeFile,
    flushPendingEditorContentAction,
    hasPendingShareChanges,
    onErrorAction,
    onShareUpdatedAction,
    sharePassword,
  ]);

  const removeSharePasswordAction = useCallback(async () => {
    if (!activeFile?.share?.requiresPassword) {
      return;
    }

    const nextContent = flushPendingEditorContentAction();

    setIsShareBusy(true);

    try {
      const result = await shareRecentMarkdownFile(activeFile.id, nextContent, {
        removePassword: true,
      });

      onShareUpdatedAction(activeFile.id, result.share, result.share.contentHash);
      setShareDialogUrl(result.share.url);
      setSharePassword("");
      setIsShareDialogOpen(true);
      toast.success("Password removed from shared link.");
    } catch (error) {
      onErrorAction(getUnknownErrorMessage(error));
    } finally {
      setIsShareBusy(false);
    }
  }, [activeFile, flushPendingEditorContentAction, onErrorAction, onShareUpdatedAction]);

  useEffect(() => {
    if (activeFile) {
      return;
    }

    setIsShareDialogOpen(false);
    setSharePassword("");
    setShareDialogUrl(null);
  }, [activeFile]);

  return {
    copyShareUrlAction,
    hasPendingShareChanges,
    isShareBusy,
    isShareDialogOpen,
    openShareDialogAction,
    removeSharePasswordAction,
    setIsShareDialogOpen,
    setSharePassword,
    shareActionLabel,
    shareActiveFileAction,
    shareDialogSubmitLabel,
    shareDialogUrl,
    sharePassword,
  };
};
