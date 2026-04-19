"use client";

import { useEffect, useMemo, useRef } from "react";

type DeepLink = {
  source: string;
  targetUrl: string;
} | null;

type UseMarkdownRouteSyncParams = {
  activeDocumentId: string | null;
  activeFilePresent: boolean;
  buildEditRouteAction: (documentId: string) => string;
  clearErrorAction: () => void;
  hydrated: boolean;
  isWorkspaceDocument: boolean;
  onOpenDeepLinkUrlAction: (url: string) => Promise<void>;
  onOpenRouteDocumentAction: (id: string) => Promise<void>;
  onSetActiveDocumentAction: (id: string) => void;
  openDocuments: { id: string }[];
  pathname: string;
  parsedDeepLink: DeepLink;
  routeDocumentId: string | null;
  router: {
    replace: (href: string, options?: { scroll?: boolean }) => void;
  };
  storeError: string | null;
};

export const useMarkdownRouteSync = ({
  activeDocumentId,
  activeFilePresent,
  buildEditRouteAction,
  clearErrorAction,
  hydrated,
  isWorkspaceDocument,
  onOpenDeepLinkUrlAction,
  onOpenRouteDocumentAction,
  onSetActiveDocumentAction,
  openDocuments,
  pathname,
  parsedDeepLink,
  routeDocumentId,
  router,
  storeError,
}: UseMarkdownRouteSyncParams) => {
  const attemptedDeepLinkRef = useRef<string | null>(null);
  const attemptedRouteDocumentIdRef = useRef<string | null>(null);
  const navigatingHomeRef = useRef(false);

  useEffect(() => {
    if (!parsedDeepLink) {
      attemptedDeepLinkRef.current = null;
      return;
    }

    if (isWorkspaceDocument) {
      return;
    }

    if (!hydrated || activeFilePresent) {
      return;
    }

    const deepLinkKey = `${parsedDeepLink.source}:${parsedDeepLink.targetUrl}`;

    if (attemptedDeepLinkRef.current === deepLinkKey) {
      return;
    }

    attemptedDeepLinkRef.current = deepLinkKey;

    void (async () => {
      await onOpenDeepLinkUrlAction(parsedDeepLink.targetUrl);
    })();
  }, [
    activeFilePresent,
    hydrated,
    isWorkspaceDocument,
    onOpenDeepLinkUrlAction,
    parsedDeepLink,
  ]);

  useEffect(() => {
    if (pathname === "/") {
      navigatingHomeRef.current = false;
    }
  }, [pathname]);

  useEffect(() => {
    if (!routeDocumentId) {
      attemptedRouteDocumentIdRef.current = null;
      return;
    }

    if (isWorkspaceDocument || !hydrated) {
      return;
    }

    if (activeDocumentId === routeDocumentId) {
      attemptedRouteDocumentIdRef.current = null;
      return;
    }

    if (attemptedRouteDocumentIdRef.current === routeDocumentId) {
      return;
    }

    if (!activeDocumentId && navigatingHomeRef.current) {
      return;
    }

    const existingOpenDocument = openDocuments.find(
      (document) => document.id === routeDocumentId
    );

    if (existingOpenDocument) {
      onSetActiveDocumentAction(routeDocumentId);
      attemptedRouteDocumentIdRef.current = null;
      return;
    }

    attemptedRouteDocumentIdRef.current = routeDocumentId;
    clearErrorAction();

    void onOpenRouteDocumentAction(routeDocumentId)
      .then(() => {
        if (storeError) {
          router.replace("/", { scroll: false });
          return;
        }

        if (activeDocumentId && activeDocumentId !== routeDocumentId) {
          router.replace(buildEditRouteAction(activeDocumentId), { scroll: false });
          return;
        }

        if (!activeDocumentId) {
          router.replace("/", { scroll: false });
        }
      })
      .finally(() => {
        if (attemptedRouteDocumentIdRef.current === routeDocumentId) {
          attemptedRouteDocumentIdRef.current = null;
        }
      });
  }, [
    activeDocumentId,
    buildEditRouteAction,
    clearErrorAction,
    hydrated,
    isWorkspaceDocument,
    onOpenRouteDocumentAction,
    onSetActiveDocumentAction,
    openDocuments,
    routeDocumentId,
    router,
    storeError,
  ]);

  useEffect(() => {
    if (!hydrated || isWorkspaceDocument) {
      return;
    }

    if (!activeDocumentId && parsedDeepLink) {
      return;
    }

    if (
      !activeDocumentId &&
      routeDocumentId &&
      attemptedRouteDocumentIdRef.current === routeDocumentId
    ) {
      return;
    }

    const targetPath = activeDocumentId
      ? buildEditRouteAction(activeDocumentId)
      : "/";

    if (pathname === targetPath) {
      return;
    }

    router.replace(targetPath, { scroll: false });
  }, [
    activeDocumentId,
    buildEditRouteAction,
    hydrated,
    isWorkspaceDocument,
    parsedDeepLink,
    pathname,
    routeDocumentId,
    router,
  ]);

  const clearPendingRouteAttempt = useMemo(
    () => () => {
      attemptedRouteDocumentIdRef.current = null;
      navigatingHomeRef.current = true;
    },
    []
  );

  return {
    clearPendingRouteAttempt,
  };
};
