"use client";

import { extractMarkdownDeepLink } from "@/lib/markdown-deep-link";
import { getMarkdownDocumentStats } from "@/lib/markdown-helpers";
import { getRouteDocumentId } from "@/lib/markdown-app-routing";
import { isMarkdownShareDirectUrl } from "@/lib/markdown-share";
import { parseCollaborationJoinParams } from "@/lib/markdown-collaboration";
import type { MarkdownWorkspace, OpenMarkdownDocument, RecentMarkdownFile } from "@/types/markdown";
import { useDeferredValue, useMemo } from "react";

type UseMarkdownAppDerivedStateInput = {
  activeDocumentId: string | null;
  activeFile: RecentMarkdownFile | null;
  collaborationDisplayName: string;
  content: string;
  openDocuments: OpenMarkdownDocument[];
  pathname: string;
  searchParamsKey: string;
  workspace: MarkdownWorkspace | null;
};

export const useMarkdownAppDerivedState = ({
  activeDocumentId,
  activeFile,
  collaborationDisplayName,
  content,
  openDocuments,
  pathname,
  searchParamsKey,
  workspace,
}: UseMarkdownAppDerivedStateInput) => {
  const deferredStatsContent = useDeferredValue(content);
  const activeDocumentStats = useMemo(
    () => getMarkdownDocumentStats(deferredStatsContent),
    [deferredStatsContent]
  );
  const activeOpenDocument = useMemo(
    () =>
      openDocuments.find((document) => document.id === activeDocumentId) ?? null,
    [activeDocumentId, openDocuments]
  );
  const internalLinkTargets = useMemo(() => {
    if (!workspace || !activeFile?.relativePath) {
      return [] as string[];
    }

    return workspace.pages
      .map((page) => page.relativePath)
      .filter((relativePath) => relativePath !== activeFile.relativePath);
  }, [activeFile, workspace]);
  const canSaveActiveFile =
    activeFile?.source === "picker" ||
    activeFile?.source === "drop" ||
    activeFile?.source === "folder";
  const isSharedViewerMode =
    activeFile?.source === "url" && isMarkdownShareDirectUrl(activeFile.url);
  const parsedDeepLink = useMemo(
    () =>
      extractMarkdownDeepLink(pathname, new URLSearchParams(searchParamsKey)),
    [pathname, searchParamsKey]
  );
  const routeDocumentId = useMemo(() => getRouteDocumentId(pathname), [pathname]);
  const parsedCollabJoin = useMemo(
    () => parseCollaborationJoinParams(new URLSearchParams(searchParamsKey)),
    [searchParamsKey]
  );
  const collaborativeUserName = useMemo(
    () => collaborationDisplayName.trim() || "Anonymous",
    [collaborationDisplayName]
  );
  const collaborativeAvatarUrl = useMemo(
    () =>
      `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(
        collaborativeUserName
      )}`,
    [collaborativeUserName]
  );

  return {
    activeDocumentStats,
    activeOpenDocument,
    canSaveActiveFile,
    collaborativeAvatarUrl,
    collaborativeUserName,
    internalLinkTargets,
    isSharedViewerMode,
    parsedCollabJoin,
    parsedDeepLink,
    routeDocumentId,
  };
};
