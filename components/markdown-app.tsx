"use client";

import { MarkdownActiveDocument } from "@/components/markdown-active-document";
import { MarkdownCollaborationDialog } from "@/components/markdown-collaboration-dialog";
import { MarkdownCommandPalette } from "@/components/markdown-command-palette";
import { MarkdownEmptyState } from "@/components/markdown-empty-state";
import { MarkdownOpenUrlDialog } from "@/components/markdown-open-url-dialog";
import { MarkdownRecentFiles } from "@/components/markdown-recent-files";
import { MarkdownRemotePasswordDialog } from "@/components/markdown-remote-password-dialog";
import { MarkdownRemoteSelectionDialog } from "@/components/markdown-remote-selection-dialog";
import { MarkdownShareDialog } from "@/components/markdown-share-dialog";
import { MarkdownSharedViewer } from "@/components/markdown-shared-viewer";
import { Spinner } from "@/components/ui/spinner";
import { useMarkdownHotkeys } from "@/hooks/use-markdown-hotkeys";
import { useMarkdownCollaboration } from "@/hooks/use-markdown-collaboration";
import { useScrollSync } from "@/hooks/use-scroll-sync";
import { extractMarkdownDeepLink } from "@/lib/markdown-deep-link";
import {
  insertBlockAction,
  prefixLinesAction,
  wrapSelectionAction,
} from "@/lib/markdown-editor";
import {
  buildMarkdownExportFileName,
  buildMarkdownExportHtml,
  downloadTextFile,
} from "@/lib/markdown-export";
import { shareRecentMarkdownFile } from "@/lib/markdown-file-system";
import {
  createCollaborationRoom,
  createCollaborationRoomId,
  createCollaborationToken,
  joinCollaborationRoom,
  parseCollaborationJoinParams,
} from "@/lib/markdown-collaboration";
import {
  getMarkdownDocumentStats,
  getUnknownErrorMessage,
} from "@/lib/markdown-helpers";
import {
  computeMarkdownContentHash,
  hasPendingMarkdownShareChanges,
  isMarkdownShareDirectUrl,
} from "@/lib/markdown-share";
import { useMarkdownStore } from "@/lib/markdown-store";
import { useMarkdownUiStore } from "@/lib/markdown-ui-store";
import { cn } from "@/lib/utils";
import { type MarkdownViewerSelection } from "@/types/markdown-viewer-selection";
import { faker } from "@faker-js/faker";
import { ArrowUpRightIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type ChangeEvent,
  type DragEvent as ReactDragEvent,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

const defaultDocumentTitle = ".MD";
const LARGE_FILE_THRESHOLD = 20_000;
const LARGE_FILE_SYNC_DELAY_MS = 180;
const LARGE_FILE_PREVIEW_SYNC_DELAY_MS = 80;
const LARGE_FILE_HISTORY_GROUP_WINDOW_MS = 800;
const MAX_HISTORY_ENTRIES = 100;
const editPathPrefix = "/edit/";

type EditorHistoryEntry = {
  content: string;
  selection: MarkdownViewerSelection;
  timestamp: number;
};

type EditorHistoryState = {
  entries: EditorHistoryEntry[];
  index: number;
};

const decodePathSegment = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const getRouteDocumentId = (pathname: string) => {
  if (!pathname.startsWith(editPathPrefix)) {
    return null;
  }

  const rawDocumentId = pathname.slice(editPathPrefix.length).split("/")[0] ?? "";
  const normalizedDocumentId = decodePathSegment(rawDocumentId).trim();

  return normalizedDocumentId === "" ? null : normalizedDocumentId;
};

const buildEditRoute = (documentId: string) =>
  `${editPathPrefix}${encodeURIComponent(documentId)}`;

export const MarkdownApp = () => {
  const {
    openDocuments,
    activeDocumentId,
    content,
    activeFile,
    pendingRemoteOpen,
    recentFiles,
    hydrated,
    isBusy,
    busyMessage,
    error,
    canPersistFiles,
    hydrate,
    clearError,
    setContent,
    setDocumentContent,
    openWithPicker,
    openFromUrl,
    openDeepLinkUrl,
    openDroppedFiles,
    openPendingRemoteFile,
    reopenRecentFile,
    createNewFile,
    openScratchDocument,
    createLocalCopyOfActiveFile,
    saveActiveFile,
    setDocumentShare,
    setDocumentCollaboration,
    goHome,
    setActiveDocument,
    closeDocument,
    removeRecentFile,
    clearRecentFiles,
    clearPendingRemoteOpen,
    clearDocument,
  } = useMarkdownStore();

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewMode = useMarkdownUiStore((state) => state.viewMode);
  const syncScrollEnabled = useMarkdownUiStore(
    (state) => state.syncScrollEnabled
  );
  const collaborationDisplayName = useMarkdownUiStore(
    (state) => state.collaborationDisplayName
  );

  const setViewMode = useMarkdownUiStore((state) => state.setViewMode);
  const setCollaborationDisplayName = useMarkdownUiStore(
    (state) => state.setCollaborationDisplayName
  );

  const toggleSyncScroll = useMarkdownUiStore(
    (state) => state.toggleSyncScroll
  );

  const [isDragActive, setIsDragActive] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isOpenUrlDialogOpen, setIsOpenUrlDialogOpen] = useState(false);
  const [isShareBusy, setIsShareBusy] = useState(false);
  const [isCollabBusy, setIsCollabBusy] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isCollabDialogOpen, setIsCollabDialogOpen] = useState(false);
  const [pendingRecentFileId, setPendingRecentFileId] = useState<string | null>(null);
  const [previewDetached, setPreviewDetached] = useState(false);
  const [previewRenderContent, setPreviewRenderContent] = useState(content);
  const [sharePassword, setSharePassword] = useState("");
  const [shareDialogUrl, setShareDialogUrl] = useState<string | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);
  const [collabAccessMode, setCollabAccessMode] = useState<
    "open" | "invite" | "password"
  >("open");
  const [collabRoomId, setCollabRoomId] = useState("");
  const [collabInviteToken, setCollabInviteToken] = useState("");
  const [collabPassword, setCollabPassword] = useState("");
  const [collabJoinUrl, setCollabJoinUrl] = useState<string | null>(null);
  const [collabWsBaseUrl, setCollabWsBaseUrl] = useState<string | null>(null);
  const [collabAuthToken, setCollabAuthToken] = useState<string | null>(null);
  const [pendingJoinRoomId, setPendingJoinRoomId] = useState<string | null>(null);
  const [contentHash, setContentHash] = useState<string | null>(null);
  const [editorSelection, setEditorSelection] = useState<MarkdownViewerSelection | null>(null);

  const attemptedDeepLinkRef = useRef<string | null>(null);
  const attemptedRouteDocumentIdRef = useRef<string | null>(null);
  const navigatingHomeRef = useRef(false);
  const historyRef = useRef<Map<string, EditorHistoryState>>(new Map());
  const contentSyncTimeoutRef = useRef<number | null>(null);
  const previewSyncTimeoutRef = useRef<number | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingSelectionRef = useRef<MarkdownViewerSelection | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const searchParamsKey = searchParams.toString();
  const isLargeDocument = content.length >= LARGE_FILE_THRESHOLD;
  const isPreviewVisible = previewDetached || viewMode !== "editor";
  const shouldTrackPreviewSelection = !isLargeDocument && (previewDetached || viewMode !== "editor");
  const deferredStatsContent = useDeferredValue(content);
  const deferredPreviewContent = useDeferredValue(previewRenderContent);
  const previewContent = isLargeDocument ? previewRenderContent : deferredPreviewContent;

  const deferredPreviewSelection = useDeferredValue(
    shouldTrackPreviewSelection ? editorSelection : null
  );

  const activeDocumentStats = useMemo(
    () => getMarkdownDocumentStats(deferredStatsContent),
    [deferredStatsContent]
  );

  const pendingRecentFile = recentFiles.find((file) => file.id === pendingRecentFileId) ?? null;
  const isPageBusy = (isBusy && busyMessage !== null) || isCollabBusy;
  const effectiveBusyMessage = busyMessage ?? (isCollabBusy ? "Connecting..." : null);

  const hasPendingShareChanges = hasPendingMarkdownShareChanges(
    activeFile?.share ?? null,
    contentHash
  );

  const isSharedViewerMode = activeFile?.source === "url" && isMarkdownShareDirectUrl(activeFile.url);

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
  const collaborateActionLabel = collabAuthToken ? "Collaborating" : "Collaborate";

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

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (collaborationDisplayName.trim() !== "") {
      return;
    }

    setCollaborationDisplayName(faker.person.fullName());
  }, [collaborationDisplayName, setCollaborationDisplayName]);

  useEffect(() => {
    return () => {
      if (contentSyncTimeoutRef.current) {
        window.clearTimeout(contentSyncTimeoutRef.current);
      }

      if (previewSyncTimeoutRef.current) {
        window.clearTimeout(previewSyncTimeoutRef.current);
      }
    };
  }, []);

  const syncPreviewContent = useCallback(
    (nextValue: string, options?: { immediate?: boolean }) => {
      if (previewSyncTimeoutRef.current) {
        window.clearTimeout(previewSyncTimeoutRef.current);
        previewSyncTimeoutRef.current = null;
      }

      const applyPreviewContent = () => {
        startTransition(() => {
          setPreviewRenderContent((currentValue) =>
            currentValue === nextValue ? currentValue : nextValue
          );
        });
      };

      if (!isPreviewVisible || options?.immediate || !isLargeDocument) {
        applyPreviewContent();
        return;
      }

      previewSyncTimeoutRef.current = window.setTimeout(() => {
        applyPreviewContent();
        previewSyncTimeoutRef.current = null;
      }, LARGE_FILE_PREVIEW_SYNC_DELAY_MS);
    },
    [isLargeDocument, isPreviewVisible]
  );

  const collaboration = useMarkdownCollaboration({
    enabled: Boolean(activeFile && collabRoomId && collabWsBaseUrl && collabAuthToken),
    roomId: collabRoomId || null,
    wsBaseUrl: collabWsBaseUrl,
    authToken: collabAuthToken,
    userName: collaborativeUserName,
    userAvatarUrl: collaborativeAvatarUrl,
    initialContent: content,
    onContentChange: (nextContent) => {
      startTransition(() => {
        if (activeDocumentId) {
          setDocumentContent(activeDocumentId, nextContent);
          return;
        }

        setContent(nextContent);
      });
      syncPreviewContent(nextContent, { immediate: true });
    },
  });

  useEffect(() => {
    if (!parsedDeepLink) {
      attemptedDeepLinkRef.current = null;
      return;
    }

    if (!hydrated || activeFile) {
      return;
    }

    const deepLinkKey = `${parsedDeepLink.source}:${parsedDeepLink.targetUrl}`;

    if (attemptedDeepLinkRef.current === deepLinkKey) {
      return;
    }

    attemptedDeepLinkRef.current = deepLinkKey;

    void (async () => {
      await openDeepLinkUrl(parsedDeepLink.targetUrl);

      const openedDocumentId = useMarkdownStore.getState().activeDocumentId;

      if (openedDocumentId) {
        router.replace(buildEditRoute(openedDocumentId), { scroll: false });
      }
    })();
  }, [activeFile, hydrated, openDeepLinkUrl, parsedDeepLink, router]);

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

    if (!hydrated) {
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

    attemptedRouteDocumentIdRef.current = routeDocumentId;
    clearError();

    void reopenRecentFile(routeDocumentId)
      .then(() => {
        const nextState = useMarkdownStore.getState();

        if (
          nextState.error ||
          nextState.activeDocumentId !== routeDocumentId
        ) {
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
    clearError,
    hydrated,
    reopenRecentFile,
    routeDocumentId,
    router,
  ]);

  useEffect(() => {
    if (!hydrated) {
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

    const targetPath = activeDocumentId ? buildEditRoute(activeDocumentId) : "/";

    if (pathname === targetPath) {
      return;
    }

    router.replace(targetPath, { scroll: false });
  }, [activeDocumentId, hydrated, parsedDeepLink, pathname, routeDocumentId, router]);

  useEffect(() => {
    if (!hydrated || !parsedCollabJoin) {
      return;
    }

    if (!activeFile) {
      openScratchDocument("Collaborative document.md");
    }

    setCollabAccessMode(parsedCollabJoin.accessMode);
    setCollabRoomId(parsedCollabJoin.roomId);
    setCollabInviteToken(parsedCollabJoin.inviteToken ?? "");
    setCollabJoinUrl(window.location.toString());
    setPendingJoinRoomId(parsedCollabJoin.roomId);

    if (parsedCollabJoin.accessMode === "password") {
      setIsCollabDialogOpen(true);
      return;
    }

    void joinCollaborationRoom({
      roomId: parsedCollabJoin.roomId,
      inviteToken: parsedCollabJoin.inviteToken,
    })
      .then((connection) => {
        setCollabWsBaseUrl(connection.wsBaseUrl);
        setCollabAuthToken(connection.token);
        setPendingJoinRoomId(null);
      })
      .catch((error) => {
        setUiError(getUnknownErrorMessage(error));
      });
  }, [activeFile, hydrated, openScratchDocument, parsedCollabJoin]);

  useEffect(() => {
    document.title = activeFile
      ? `${activeFile.name} | ${defaultDocumentTitle}`
      : defaultDocumentTitle;
  }, [activeFile]);

  useEffect(() => {
    if (!activeFile) {
      setTimeout(() => setPreviewDetached(false), 0);
    }
  }, [activeFile]);

  useEffect(() => {
    if (!activeFile) {
      setContentHash(null);
      setIsShareDialogOpen(false);
      setSharePassword("");
      setShareDialogUrl(null);
      setCollabWsBaseUrl(null);
      setCollabAuthToken(null);
      setPendingJoinRoomId(null);
      setCollabJoinUrl(null);
      setCollabPassword("");
      return;
    }

    if (activeFile.collab) {
      setCollabAccessMode(activeFile.collab.accessMode);
      setCollabRoomId(activeFile.collab.roomId);
      setCollabInviteToken(activeFile.collab.inviteToken ?? "");
      setCollabJoinUrl(activeFile.collab.joinUrl);
    } else if (!parsedCollabJoin && !collabAuthToken) {
      setCollabWsBaseUrl(null);
      setCollabAuthToken(null);
      setCollabJoinUrl(null);
    }

    let cancelled = false;
    const nextContent = editorRef.current?.value ?? content;

    void computeMarkdownContentHash(nextContent)
      .then((nextHash) => {
        if (!cancelled) {
          setContentHash(nextHash);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setContentHash(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeDocumentId, activeFile, collabAuthToken, content, parsedCollabJoin]);

  useEffect(() => {
    if (!activeFile?.collab || collabAuthToken || pendingJoinRoomId) {
      return;
    }

    if (activeFile.collab.accessMode === "password") {
      setPendingJoinRoomId(activeFile.collab.roomId);
      setCollabAccessMode("password");
      setCollabRoomId(activeFile.collab.roomId);
      setCollabJoinUrl(activeFile.collab.joinUrl);
      setIsCollabDialogOpen(true);
      return;
    }

    void joinCollaborationRoom({
      roomId: activeFile.collab.roomId,
      inviteToken: activeFile.collab.inviteToken,
    })
      .then((connection) => {
        setCollabWsBaseUrl(connection.wsBaseUrl);
        setCollabAuthToken(connection.token);
      })
      .catch((error) => {
        setUiError(getUnknownErrorMessage(error));
      });
  }, [activeFile, collabAuthToken, pendingJoinRoomId]);

  useEffect(() => {
    if (!activeFile || activeFile.collab || !collabRoomId || !collabJoinUrl) {
      return;
    }

    const inviteToken =
      collabAccessMode === "invite" ? collabInviteToken.trim() || null : null;

    setDocumentCollaboration(activeFile.id, {
      roomId: collabRoomId,
      accessMode: collabAccessMode,
      inviteToken,
      joinUrl: collabJoinUrl,
    });
  }, [
    activeFile,
    collabAccessMode,
    collabInviteToken,
    collabJoinUrl,
    collabRoomId,
    setDocumentCollaboration,
  ]);

  useEffect(() => {
    const nextPreviewContent = isPreviewVisible
      ? (editorRef.current?.value ?? content)
      : content;

    syncPreviewContent(nextPreviewContent, { immediate: true });
  }, [activeDocumentId, content, isPreviewVisible, syncPreviewContent]);

  useEffect(() => {
    const nextHistory = new Map<string, EditorHistoryState>();

    openDocuments.forEach((document) => {
      const existingHistory = historyRef.current.get(document.id);
      const initialSelection = {
        start: document.content.length,
        end: document.content.length,
      };

      if (!existingHistory) {
        nextHistory.set(document.id, {
          entries: [
            {
              content: document.content,
              selection: initialSelection,
              timestamp: Date.now(),
            },
          ],
          index: 0,
        });
        return;
      }

      const activeEntry = existingHistory.entries[existingHistory.index];

      if (!document.isDirty && activeEntry?.content !== document.content) {
        nextHistory.set(document.id, {
          entries: [
            {
              content: document.content,
              selection: initialSelection,
              timestamp: Date.now(),
            },
          ],
          index: 0,
        });
        return;
      }

      nextHistory.set(document.id, existingHistory);
    });

    historyRef.current = nextHistory;
  }, [openDocuments]);

  useEffect(() => {
    if (isSharedViewerMode) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) {
        return;
      }

      if (event.shiftKey) {
        return;
      }

      if (event.key.toLowerCase() !== "k") {
        return;
      }

      event.preventDefault();
      setIsCommandPaletteOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSharedViewerMode]);

  const handleEditorChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const nextValue = event.target.value;
      const documentId = activeDocumentId;
      const now = Date.now();
      const nextSelection = {
        start: event.target.selectionStart,
        end: event.target.selectionEnd,
      };

      if (collaboration.isActive) {
        syncPreviewContent(nextValue);
        collaboration.applyLocalContent(nextValue);
        collaboration.updateLocalSelection(nextSelection);
        if (shouldTrackPreviewSelection) {
          setEditorSelection(nextSelection);
        }
        return;
      }

      if (activeDocumentId) {
        const currentHistory = historyRef.current.get(activeDocumentId) ?? {
          entries: [],
          index: -1,
        };
        const activeEntry = currentHistory.entries[currentHistory.index];

        if (activeEntry?.content !== nextValue) {
          const shouldReplaceActiveEntry =
            isLargeDocument &&
            Boolean(activeEntry) &&
            currentHistory.index === currentHistory.entries.length - 1 &&
            now - (activeEntry?.timestamp ?? 0) <
              LARGE_FILE_HISTORY_GROUP_WINDOW_MS;

          if (shouldReplaceActiveEntry) {
            currentHistory.entries[currentHistory.index] = {
              content: nextValue,
              selection: nextSelection,
              timestamp: now,
            };
          } else {
            const nextEntries = currentHistory.entries.slice(
              0,
              currentHistory.index + 1
            );
            nextEntries.push({
              content: nextValue,
              selection: nextSelection,
              timestamp: now,
            });

            if (nextEntries.length > MAX_HISTORY_ENTRIES) {
              nextEntries.splice(0, nextEntries.length - MAX_HISTORY_ENTRIES);
            }

            historyRef.current.set(activeDocumentId, {
              entries: nextEntries,
              index: nextEntries.length - 1,
            });
          }
        }
      }

      if (contentSyncTimeoutRef.current) {
        window.clearTimeout(contentSyncTimeoutRef.current);
      }

      syncPreviewContent(nextValue);

      if (!isLargeDocument) {
        startTransition(() => {
          if (documentId) {
            setDocumentContent(documentId, nextValue);
            return;
          }

          setContent(nextValue);
        });
        return;
      }

      contentSyncTimeoutRef.current = window.setTimeout(() => {
        startTransition(() => {
          if (documentId) {
            setDocumentContent(documentId, nextValue);
            return;
          }

          setContent(nextValue);
        });
        contentSyncTimeoutRef.current = null;
      }, LARGE_FILE_SYNC_DELAY_MS);
    },
    [
      activeDocumentId,
      collaboration,
      isLargeDocument,
      setContent,
      setDocumentContent,
      shouldTrackPreviewSelection,
      syncPreviewContent,
    ]
  );

  const flushPendingEditorContent = useCallback(() => {
    if (contentSyncTimeoutRef.current) {
      window.clearTimeout(contentSyncTimeoutRef.current);
      contentSyncTimeoutRef.current = null;
    }

    const editorContent = editorRef.current?.value;

    if (typeof editorContent === "string" && editorContent !== content) {
      if (activeDocumentId) {
        setDocumentContent(activeDocumentId, editorContent);
      } else {
        setContent(editorContent);
      }
    }

    return editorContent ?? content;
  }, [activeDocumentId, content, setContent, setDocumentContent]);

  const clearEditorSelection = useCallback(() => {
    flushPendingEditorContent();

    setEditorSelection(null);
  }, [flushPendingEditorContent]);

  const syncEditorSelection = useCallback(
    (editor: HTMLTextAreaElement | null) => {
      if (!editor) {
        return;
      }

      const nextSelection = {
        start: editor.selectionStart,
        end: editor.selectionEnd,
      };

      if (activeDocumentId) {
        const currentHistory = historyRef.current.get(activeDocumentId);

        if (currentHistory && currentHistory.index >= 0) {
          currentHistory.entries[currentHistory.index] = {
            ...currentHistory.entries[currentHistory.index],
            selection: nextSelection,
          };
        }
      }

      if (!shouldTrackPreviewSelection) {
        if (collaboration.isActive) {
          collaboration.updateLocalSelection(nextSelection);
        }
        return;
      }

      if (collaboration.isActive) {
        collaboration.updateLocalSelection(nextSelection);
      }

      setEditorSelection((currentValue) =>
        currentValue?.start === nextSelection.start &&
        currentValue?.end === nextSelection.end
          ? currentValue
          : nextSelection
      );
    },
    [activeDocumentId, collaboration, shouldTrackPreviewSelection]
  );

  const { handleEditorScroll, handlePreviewScroll, syncPreviewToEditor } =
    useScrollSync({
      syncScrollEnabled,
      editorRef,
      previewRef,
    });

  useEffect(() => {
    if (!activeFile || !syncScrollEnabled) {
      return;
    }

    if (previewDetached || viewMode === "editor") {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      syncPreviewToEditor();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [
    activeFile,
    previewDetached,
    syncPreviewToEditor,
    syncScrollEnabled,
    viewMode,
  ]);

  useEffect(() => {
    if (!shouldTrackPreviewSelection) {
      return;
    }

    if (!activeFile) {
      setTimeout(() => setEditorSelection(null), 0);
      return;
    }

    if (pendingSelectionRef.current) {
      return;
    }

    if (!editorSelection) {
      return;
    }

    syncEditorSelection(editorRef.current);
  }, [
    activeFile,
    content,
    editorSelection,
    shouldTrackPreviewSelection,
    syncEditorSelection,
  ]);

  useLayoutEffect(() => {
    const pendingSelection = pendingSelectionRef.current;
    const editorElement = editorRef.current;

    if (!pendingSelection || !editorElement) {
      return;
    }

    editorElement.focus();
    editorElement.setSelectionRange(
      pendingSelection.start,
      pendingSelection.end
    );
    if (shouldTrackPreviewSelection) {
      setEditorSelection(pendingSelection);
    }
    pendingSelectionRef.current = null;
  }, [activeDocumentId, content, shouldTrackPreviewSelection]);

  useEffect(() => {
    if (!activeFile) {
      return;
    }

    const handleSelectionChange = () => {
      const editorElement = editorRef.current;

      if (!editorElement || document.activeElement !== editorElement) {
        return;
      }

      syncEditorSelection(editorElement);
    };

    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [activeFile, syncEditorSelection]);

  const handleDragOver = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragActive(true);
    },
    []
  );

  const handleDragLeave = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (
        event.currentTarget instanceof HTMLElement &&
        event.currentTarget.contains(event.relatedTarget as Node | null)
      ) {
        return;
      }

      setIsDragActive(false);
    },
    []
  );

  const handleDrop = useCallback(
    async (event: ReactDragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragActive(false);

      const files = Array.from(event.dataTransfer?.files ?? []);

      if (files.length === 0) {
        return;
      }

      await openDroppedFiles(files, event.dataTransfer?.items ?? null);
    },
    [openDroppedFiles]
  );

  const handleRefresh = useCallback(async () => {
    flushPendingEditorContent();

    if (!activeFile) {
      return;
    }

    clearError();
    await reopenRecentFile(activeFile.id);
    if (!useMarkdownStore.getState().error) {
      toast.success("File reopened.", {
        description: activeFile.name,
      });
    }
  }, [activeFile, clearError, flushPendingEditorContent, reopenRecentFile]);

  const openRecentFileAction = useCallback(
    (id: string) => {
      if (!activeFile) {
        setPendingRecentFileId(id);
      }

      const selectedFileName =
        recentFiles.find((file) => file.id === id)?.name ?? "Recent file";

      clearError();

      void reopenRecentFile(id)
        .then(() => {
          if (!useMarkdownStore.getState().error) {
            toast.success("File reopened.", {
              description: selectedFileName,
            });
          }
        })
        .finally(() => {
          setPendingRecentFileId((currentValue) =>
            currentValue === id ? null : currentValue
          );
        });
    },
    [activeFile, clearError, recentFiles, reopenRecentFile]
  );

  const saveActiveFileAction = useCallback(async () => {
    flushPendingEditorContent();
    clearError();
    await saveActiveFile();
    if (!useMarkdownStore.getState().error && activeFile) {
      toast.success("File saved.", {
        description: activeFile.name,
      });
    }
  }, [activeFile, clearError, flushPendingEditorContent, saveActiveFile]);

  const editSharedFileLocallyAction = useCallback(async () => {
    flushPendingEditorContent();
    await createLocalCopyOfActiveFile();
  }, [createLocalCopyOfActiveFile, flushPendingEditorContent]);

  const copyShareUrlAction = useCallback(async () => {
    if (!shareDialogUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareDialogUrl);
      toast.success("Link copied to clipboard.");
    } catch (error) {
      setUiError(getUnknownErrorMessage(error));
    }
  }, [shareDialogUrl]);

  const openShareDialogAction = useCallback(() => {
    if (!activeFile) {
      return;
    }

    setSharePassword("");
    setShareDialogUrl(activeFile.share?.url ?? null);
    setIsShareDialogOpen(true);
  }, [activeFile]);

  const openCollabDialogAction = useCallback(() => {
    if (!activeFile) {
      return;
    }

    const existingCollab = activeFile.collab ?? null;

    setCollabAccessMode(existingCollab?.accessMode ?? "open");
    setCollabRoomId(existingCollab?.roomId ?? createCollaborationRoomId());
    setCollabInviteToken(
      existingCollab?.inviteToken ?? createCollaborationToken()
    );
    setCollabPassword("");
    setCollabJoinUrl(existingCollab?.joinUrl ?? collabJoinUrl);
    setIsCollabDialogOpen(true);
  }, [activeFile, collabJoinUrl]);

  const startCollaborationAction = useCallback(async () => {
    if (!activeFile) {
      return;
    }

    setIsCollabBusy(true);

    try {
      if (pendingJoinRoomId) {
        const connection = await joinCollaborationRoom({
          roomId: pendingJoinRoomId,
          inviteToken: collabAccessMode === "invite" ? collabInviteToken : null,
          password: collabAccessMode === "password" ? collabPassword : null,
        });

        setCollabWsBaseUrl(connection.wsBaseUrl);
        setCollabAuthToken(connection.token);
        setPendingJoinRoomId(null);
        setIsCollabDialogOpen(false);
        toast.success("Joined collaboration.");
        return;
      }

      const room = await createCollaborationRoom({
        accessMode: collabAccessMode,
        inviteToken: collabAccessMode === "invite" ? collabInviteToken : null,
        password: collabAccessMode === "password" ? collabPassword : null,
      });
      const connection = await joinCollaborationRoom({
        roomId: room.id,
        inviteToken: room.inviteToken,
        password: collabAccessMode === "password" ? collabPassword : null,
      });

      setCollabRoomId(room.id);
      setCollabInviteToken(room.inviteToken ?? "");
      setCollabJoinUrl(room.joinUrl);
      setCollabWsBaseUrl(connection.wsBaseUrl);
      setCollabAuthToken(connection.token);

      const collab = {
        roomId: room.id,
        accessMode: collabAccessMode,
        inviteToken: room.inviteToken,
        joinUrl: room.joinUrl,
      } as const;

      setDocumentCollaboration(activeFile.id, collab);
      toast.success("Collaboration started.");
    } catch (error) {
      setUiError(getUnknownErrorMessage(error));
    } finally {
      setIsCollabBusy(false);
    }
  }, [
    activeFile,
    collabAccessMode,
    collabInviteToken,
    collabPassword,
    pendingJoinRoomId,
    setDocumentCollaboration,
  ]);

  const stopCollaborationAction = useCallback(() => {
    if (!activeFile) {
      return;
    }

    setCollabWsBaseUrl(null);
    setCollabAuthToken(null);
    setPendingJoinRoomId(null);
    setCollabJoinUrl(null);
    setCollabPassword("");
    setDocumentCollaboration(activeFile.id, null);
    setIsCollabDialogOpen(false);
    toast.success("Collaboration stopped.");
  }, [activeFile, setDocumentCollaboration]);

  const copyCollaborationLinkAction = useCallback(async () => {
    if (!collabJoinUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(collabJoinUrl);
      toast.success("Collaboration link copied.");
    } catch (error) {
      setUiError(getUnknownErrorMessage(error));
    }
  }, [collabJoinUrl]);

  const regenerateCollaborationDisplayNameAction = useCallback(() => {
    setCollaborationDisplayName(faker.person.fullName());
  }, [setCollaborationDisplayName]);

  const shareActiveFileAction = useCallback(async () => {
    if (!activeFile) {
      return;
    }

    const nextContent = flushPendingEditorContent();
    const hadShare = Boolean(activeFile.share);
    const wasShareUpdate = hadShare && (hasPendingShareChanges || sharePassword.trim() !== "");

    setIsShareBusy(true);

    try {
      const result = await shareRecentMarkdownFile(activeFile.id, nextContent, {
        password: sharePassword,
      });

      setDocumentShare(activeFile.id, result.share);
      setContentHash(result.share.contentHash);
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
      setUiError(getUnknownErrorMessage(error));
    } finally {
      setIsShareBusy(false);
    }
  }, [
    activeFile,
    flushPendingEditorContent,
    hasPendingShareChanges,
    setDocumentShare,
    sharePassword,
  ]);

  const removeSharePasswordAction = useCallback(async () => {
    if (!activeFile?.share?.requiresPassword) {
      return;
    }

    const nextContent = flushPendingEditorContent();

    setIsShareBusy(true);

    try {
      const result = await shareRecentMarkdownFile(activeFile.id, nextContent, {
        removePassword: true,
      });

      setDocumentShare(activeFile.id, result.share);
      setContentHash(result.share.contentHash);
      setShareDialogUrl(result.share.url);
      setSharePassword("");
      setIsShareDialogOpen(true);
      toast.success("Password removed from shared link.");
    } catch (error) {
      setUiError(getUnknownErrorMessage(error));
    } finally {
      setIsShareBusy(false);
    }
  }, [activeFile, flushPendingEditorContent, setDocumentShare]);

  const goHomeAction = useCallback(() => {
    navigatingHomeRef.current = true;
    attemptedRouteDocumentIdRef.current = null;
    flushPendingEditorContent();
    goHome();
    router.replace("/", { scroll: false });
  }, [flushPendingEditorContent, goHome, router]);

  const clearDocumentAction = useCallback(() => {
    flushPendingEditorContent();
    clearDocument();
  }, [clearDocument, flushPendingEditorContent]);

  const setActiveDocumentAction = useCallback(
    (id: string) => {
      flushPendingEditorContent();
      setActiveDocument(id);
    },
    [flushPendingEditorContent, setActiveDocument]
  );

  const closeDocumentAction = useCallback(
    (id: string) => {
      flushPendingEditorContent();
      closeDocument(id);
    },
    [closeDocument, flushPendingEditorContent]
  );

  const undoAction = useCallback(() => {
    if (collaboration.isActive) {
      collaboration.undo();
      return;
    }

    if (contentSyncTimeoutRef.current) {
      window.clearTimeout(contentSyncTimeoutRef.current);
      contentSyncTimeoutRef.current = null;
    }

    if (!activeDocumentId) {
      return;
    }

    const currentHistory = historyRef.current.get(activeDocumentId);

    if (!currentHistory || currentHistory.index <= 0) {
      return;
    }

    const nextIndex = currentHistory.index - 1;
    const nextEntry = currentHistory.entries[nextIndex];

    historyRef.current.set(activeDocumentId, {
      entries: currentHistory.entries,
      index: nextIndex,
    });
    pendingSelectionRef.current = nextEntry.selection;
    syncPreviewContent(nextEntry.content, { immediate: true });
    startTransition(() => {
      setContent(nextEntry.content);
    });
  }, [activeDocumentId, collaboration, setContent, syncPreviewContent]);

  const redoAction = useCallback(() => {
    if (collaboration.isActive) {
      collaboration.redo();
      return;
    }

    if (contentSyncTimeoutRef.current) {
      window.clearTimeout(contentSyncTimeoutRef.current);
      contentSyncTimeoutRef.current = null;
    }

    if (!activeDocumentId) {
      return;
    }

    const currentHistory = historyRef.current.get(activeDocumentId);

    if (
      !currentHistory ||
      currentHistory.index >= currentHistory.entries.length - 1
    ) {
      return;
    }

    const nextIndex = currentHistory.index + 1;
    const nextEntry = currentHistory.entries[nextIndex];

    historyRef.current.set(activeDocumentId, {
      entries: currentHistory.entries,
      index: nextIndex,
    });
    pendingSelectionRef.current = nextEntry.selection;
    syncPreviewContent(nextEntry.content, { immediate: true });
    startTransition(() => {
      setContent(nextEntry.content);
    });
  }, [activeDocumentId, collaboration, setContent, syncPreviewContent]);

  useMarkdownHotkeys({
    enabled: Boolean(activeFile) && !isSharedViewerMode,
    saveEnabled: activeFile?.source === "picker" || activeFile?.source === "drop",
    onSaveAction: saveActiveFileAction,
    onOpenSwitcherAction: () => setIsCommandPaletteOpen(true),
    onUndoAction: undoAction,
    onRedoAction: redoAction,
    editorRef,
  });

  const boldAction = useCallback(() => {
    wrapSelectionAction(editorRef.current, "**", "**", "bold text");
  }, []);

  const italicAction = useCallback(() => {
    wrapSelectionAction(editorRef.current, "_", "_", "italic text");
  }, []);

  const headingAction = useCallback((level: 1 | 2 | 3 | 4 | 5 | 6) => {
    insertBlockAction(
      editorRef.current,
      `${"#".repeat(level)} `,
      "",
      "Heading"
    );
  }, []);

  const inlineCodeAction = useCallback(() => {
    wrapSelectionAction(editorRef.current, "`", "`", "inline code");
  }, []);

  const codeBlockAction = useCallback(() => {
    insertBlockAction(editorRef.current, "```md\n", "\n```", "code block");
  }, []);

  const bulletListAction = useCallback(() => {
    prefixLinesAction(editorRef.current, "- ", "List item");
  }, []);

  const orderedListAction = useCallback(() => {
    prefixLinesAction(
      editorRef.current,
      (index) => `${index + 1}. `,
      "List item"
    );
  }, []);

  const taskListAction = useCallback(() => {
    prefixLinesAction(editorRef.current, "- [ ] ", "Task item");
  }, []);

  const togglePreviewDetached = useCallback(() => {
    setUiError(null);
    setPreviewDetached((currentValue) => !currentValue);
  }, []);

  const closePreviewDetached = useCallback(() => {
    setPreviewDetached(false);
  }, []);

  const showCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(true);
  }, []);

  useEffect(() => {
    if (!error) {
      return;
    }

    toast.error(error);
    clearError();
  }, [clearError, error]);

  useEffect(() => {
    if (!uiError) {
      return;
    }

    toast.error(uiError);
    setUiError(null);
  }, [uiError]);

  const showOpenUrlDialog = useCallback(() => {
    setIsCommandPaletteOpen(false);
    setIsOpenUrlDialogOpen(true);
  }, []);

  const exportMarkdownFile = useCallback(() => {
    if (!activeFile) {
      return;
    }

    const nextContent = flushPendingEditorContent();

    downloadTextFile(
      buildMarkdownExportFileName(activeFile.name, "md"),
      nextContent,
      "text/markdown;charset=utf-8"
    );
  }, [activeFile, flushPendingEditorContent]);

  const exportHtmlFile = useCallback(() => {
    if (!activeFile) {
      return;
    }

    const nextContent = flushPendingEditorContent();

    downloadTextFile(
      buildMarkdownExportFileName(activeFile.name, "html"),
      buildMarkdownExportHtml(activeFile.name, nextContent),
      "text/html;charset=utf-8"
    );
  }, [activeFile, flushPendingEditorContent]);

  if (!hydrated) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Loading application...
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex min-h-svh flex-col",
        activeFile ? "h-svh p-0" : "gap-4 p-4"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {activeFile && isSharedViewerMode ? (
        <MarkdownSharedViewer
          activeFile={activeFile}
          content={previewContent}
          isBusy={isBusy}
          previewRef={previewRef}
          editLocallyAction={() => {
            void editSharedFileLocallyAction();
          }}
        />
      ) : activeFile ? (
        <MarkdownActiveDocument
          activeFile={activeFile}
          openDocuments={openDocuments}
          activeDocumentId={activeDocumentId}
          recentFiles={recentFiles}
          isBusy={isBusy || isShareBusy}
          content={content}
          stats={activeDocumentStats}
          previewContent={previewContent}
          editorRef={editorRef}
          previewRef={previewRef}
          onEditorChange={handleEditorChange}
          onEditorBlur={clearEditorSelection}
          onEditorSelectionChange={syncEditorSelection}
          onEditorScroll={handleEditorScroll}
          collaboratorSelections={collaboration.participants}
          onPreviewScroll={handlePreviewScroll}
          previewSelection={deferredPreviewSelection}
          viewMode={viewMode}
          setViewModeAction={setViewMode}
          previewDetached={previewDetached}
          togglePreviewDetachedAction={togglePreviewDetached}
          closePreviewDetachedAction={closePreviewDetached}
          onDetachedPreviewBlocked={setUiError}
          syncScrollEnabled={syncScrollEnabled}
          toggleSyncScrollAction={toggleSyncScroll}
          openFileAction={openWithPicker}
          showCommandPaletteAction={showCommandPalette}
          showOpenUrlDialogAction={showOpenUrlDialog}
          goHomeAction={goHomeAction}
          saveFileAction={saveActiveFileAction}
          shareActionLabel={shareActionLabel}
          shareFileAction={openShareDialogAction}
          collaborateActionLabel={collaborateActionLabel}
          collaborateFileAction={openCollabDialogAction}
          collaborators={collaboration.participants}
          collaborationConnected={collaboration.isConnected}
          refreshFileAction={handleRefresh}
          clearDocumentAction={clearDocumentAction}
          setActiveDocumentAction={setActiveDocumentAction}
          closeDocumentAction={closeDocumentAction}
          openRecentAction={openRecentFileAction}
          clearRecentAction={clearRecentFiles}
          undoAction={undoAction}
          redoAction={redoAction}
          boldAction={boldAction}
          italicAction={italicAction}
          headingAction={headingAction}
          inlineCodeAction={inlineCodeAction}
          codeBlockAction={codeBlockAction}
          bulletListAction={bulletListAction}
          orderedListAction={orderedListAction}
          taskListAction={taskListAction}
        />
      ) : (
        <div className="flex flex-1 flex-col">
          <div className="pt-3 text-center text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Tip:</span> press{" "}
            <button
              type="button"
              onClick={showCommandPalette}
              className="font-medium text-foreground underline underline-offset-4"
            >
              Ctrl/Cmd + K
            </button>{" "}
            for quick actions.
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div className="flex w-full max-w-3xl flex-col gap-4">
              <MarkdownEmptyState
                isDragActive={isDragActive}
                isBusy={isBusy}
                canPersistFiles={canPersistFiles}
                openFileAction={openWithPicker}
                showOpenUrlDialogAction={showOpenUrlDialog}
                createNewAction={createNewFile}
              />

              <MarkdownRecentFiles
                recentFiles={recentFiles}
                isBusy={isBusy}
                openingRecentFileId={pendingRecentFileId}
                openRecentAction={openRecentFileAction}
                removeRecentAction={removeRecentFile}
                clearRecentAction={clearRecentFiles}
              />
            </div>
          </div>

          <footer className="pb-3 text-center text-xs text-muted-foreground">
            <div className="flex flex-col items-center gap-1">
              <div>
                Made by{" "}
                <a
                  href="https://github.com/steellgold"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-foreground transition-colors hover:text-primary hover:underline"
                >
                  Gaëtan H
                  <ArrowUpRightIcon className="size-3" />
                </a>
              </div>

              <div>
                Contribute on{" "}
                <a
                  href="https://github.com/Steellgold/md"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-foreground transition-colors hover:text-primary hover:underline"
                >
                  GitHub
                  <ArrowUpRightIcon className="size-3" />
                </a>
              </div>
            </div>
          </footer>
        </div>
      )}

      {isPageBusy ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/80 px-4 backdrop-blur-md">
          <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border bg-background/95 px-6 py-5 text-center shadow-xl">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Spinner className="size-5" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {effectiveBusyMessage}
              </p>
              <p className="text-sm text-muted-foreground">
                {pendingRecentFile && !activeFile
                  ? "Loading the document into the editor."
                  : "Please wait a moment."}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <MarkdownRemoteSelectionDialog
        isBusy={isBusy}
        files={pendingRemoteOpen?.files ?? []}
        openFileAction={(fileName) => {
          void openPendingRemoteFile(fileName);
        }}
        clearRemoteSelectionAction={clearPendingRemoteOpen}
      />

      <MarkdownRemotePasswordDialog
        isBusy={isBusy}
        isOpen={Boolean(pendingRemoteOpen?.passwordRequired)}
        onOpenChange={(open) => {
          if (!open) {
            clearPendingRemoteOpen();
          }
        }}
        openProtectedFileAction={(password) => {
          void openPendingRemoteFile(undefined, password);
        }}
      />

      <MarkdownOpenUrlDialog
        isBusy={isBusy}
        openUrlAction={openFromUrl}
        open={isOpenUrlDialogOpen}
        onOpenChange={setIsOpenUrlDialogOpen}
      />

      <MarkdownShareDialog
        isBusy={isShareBusy}
        open={isShareDialogOpen}
        onOpenChangeAction={(open) => {
          setIsShareDialogOpen(open);

          if (!open) {
            setSharePassword("");
          }
        }}
        onCopyAction={() => {
          void copyShareUrlAction();
        }}
        onPasswordChangeAction={setSharePassword}
        onRemovePasswordAction={() => {
          void removeSharePasswordAction();
        }}
        onSubmitAction={() => {
          void shareActiveFileAction();
        }}
        password={sharePassword}
        shareUrl={shareDialogUrl}
        hasProtectedShare={Boolean(activeFile?.share?.requiresPassword)}
        submitLabel={shareDialogSubmitLabel}
      />

      <MarkdownCollaborationDialog
        open={isCollabDialogOpen}
        isBusy={isCollabBusy}
        roomId={collabRoomId}
        displayName={collaborativeUserName}
        accessMode={collabAccessMode}
        inviteToken={collabInviteToken}
        password={collabPassword}
        joinUrl={collabJoinUrl}
        connected={collaboration.isConnected}
        participantsCount={collaboration.participants.length}
        onOpenChangeAction={setIsCollabDialogOpen}
        onDisplayNameChangeAction={setCollaborationDisplayName}
        onGenerateDisplayNameAction={
          regenerateCollaborationDisplayNameAction
        }
        onAccessModeChangeAction={setCollabAccessMode}
        onInviteTokenChangeAction={setCollabInviteToken}
        onPasswordChangeAction={setCollabPassword}
        onSubmitAction={() => {
          void startCollaborationAction();
        }}
        onStopAction={stopCollaborationAction}
        onCopyLinkAction={() => {
          void copyCollaborationLinkAction();
        }}
      />

      <MarkdownCommandPalette
        open={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
        activeDocumentId={activeDocumentId}
        activeFileName={activeFile?.name ?? null}
        openDocuments={openDocuments}
        recentFiles={recentFiles}
        viewMode={viewMode}
        canSaveActiveFile={
          activeFile?.source === "picker" || activeFile?.source === "drop"
        }
        hasActiveFile={Boolean(activeFile)}
        isBusy={isBusy || isShareBusy}
        openFileAction={() => {
          void openWithPicker();
        }}
        openUrlDialogAction={showOpenUrlDialog}
        createNewAction={() => {
          void createNewFile();
        }}
        saveFileAction={() => {
          void saveActiveFileAction();
        }}
        shareActionLabel={shareActionLabel}
        shareFileAction={openShareDialogAction}
        refreshFileAction={() => {
          void handleRefresh();
        }}
        exportMarkdownAction={exportMarkdownFile}
        exportHtmlAction={exportHtmlFile}
        goHomeAction={goHomeAction}
        closeDocumentAction={clearDocumentAction}
        openRecentAction={(id) => {
          openRecentFileAction(id);
        }}
        setActiveDocumentAction={setActiveDocumentAction}
        setViewModeAction={setViewMode}
      />
    </div>
  );
};
