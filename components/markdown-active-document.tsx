import { DetachedWindowPortal } from "@/components/detached-window-portal";
import { MarkdownDocumentTabs } from "@/components/markdown-document-tabs";
import { MarkdownToolbar } from "@/components/markdown-toolbar";
import { MarkdownWorkspaceTree } from "@/components/markdown-workspace-tree";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import { getScrollRatio, setScrollRatio } from "@/lib/markdown-helpers";
import {
  type CollaborationParticipant,
  type MarkdownDocumentStats,
  type MarkdownWorkspace,
  type OpenMarkdownDocument,
  type RecentMarkdownFile,
} from "@/types/markdown";
import { type MarkdownViewerSelection } from "@/types/markdown-viewer-selection";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  GripHorizontalIcon,
  GripVerticalIcon,
} from "lucide-react";
import {
  ChangeEvent,
  RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePanelRef } from "react-resizable-panels";
import { type ViewMode } from "../types/view-mode";
import { MarkdownEditorPanel } from "./markdown-editor-panel";
import { MarkdownPreviewPanel } from "./markdown-preview-panel";

type MarkdownActiveDocumentProps = {
  activeFile: RecentMarkdownFile;
  openDocuments: OpenMarkdownDocument[];
  activeDocumentId: string | null;
  recentFiles: RecentMarkdownFile[];
  isBusy: boolean;
  content: string;
  stats: MarkdownDocumentStats;
  workspace: MarkdownWorkspace | null;
  previewContent: string;
  editorRef: RefObject<HTMLTextAreaElement | null>;
  previewRef: RefObject<HTMLDivElement | null>;
  onEditorChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onEditorBlur: () => void;
  onEditorSelectionChange: (editor: HTMLTextAreaElement) => void;
  onEditorScroll: () => void;
  collaboratorSelections: CollaborationParticipant[];
  onPreviewScroll: () => void;
  onOpenInternalLinkAction?: (href: string) => void;
  previewSelection: MarkdownViewerSelection | null;
  viewMode: ViewMode;
  setViewModeAction: (value: ViewMode) => void;
  editorFocusMode: boolean;
  toggleEditorFocusModeAction: () => void;
  previewDetached: boolean;
  togglePreviewDetachedAction: () => void;
  closePreviewDetachedAction: () => void;
  onDetachedPreviewBlocked: (message: string) => void;
  syncScrollEnabled: boolean;
  toggleSyncScrollAction: () => void;
  openFileAction: () => void;
  showCommandPaletteAction: () => void;
  showOpenUrlDialogAction: () => void;
  goHomeAction: () => void;
  saveFileAction: () => void;
  saveFileBusy: boolean;
  shareActionLabel: string;
  shareFileAction: () => void;
  collaborateActionLabel: string;
  collaborateFileAction: () => void;
  collaborationActive: boolean;
  collaborationStartedAt: string | null;
  displayName: string;
  onDisplayNameChangeAction: (value: string) => void;
  onGenerateDisplayNameAction: () => void;
  collaborators: CollaborationParticipant[];
  collaborationConnected: boolean;
  refreshFileAction: () => void;
  exportHtmlAction: () => void;
  exportPdfAction: () => void;
  clearDocumentAction: () => void;
  setActiveDocumentAction: (id: string) => void;
  openWorkspacePageAction: (relativePath: string) => void;
  closeDocumentAction: (id: string) => void;
  openRecentAction: (id: string) => void;
  clearRecentAction: () => void;
  undoAction: () => void;
  redoAction: () => void;
  boldAction: () => void;
  italicAction: () => void;
  headingAction: (level: 1 | 2 | 3 | 4 | 5 | 6) => void;
  inlineCodeAction: () => void;
  codeBlockAction: () => void;
  bulletListAction: () => void;
  orderedListAction: () => void;
  alphaListAction: () => void;
  taskListAction: () => void;
  insertTableAction: (columns: number, rows: number) => void;
  internalLinkTargets: string[];
  insertInternalLinkAction: (relativePath: string) => void;
  insertExternalLinkAction: () => void;
};

const WORKSPACE_TREE_HEADER_ONLY_SIZE = "56px";
const WORKSPACE_TREE_DEFAULT_SIZE = "176px";

export const MarkdownActiveDocument = ({
  activeFile,
  openDocuments,
  activeDocumentId,
  recentFiles,
  isBusy,
  content,
  stats,
  workspace,
  previewContent,
  editorRef,
  previewRef,
  onEditorChange,
  onEditorBlur,
  onEditorSelectionChange,
  onEditorScroll,
  collaboratorSelections,
  onPreviewScroll,
  onOpenInternalLinkAction,
  previewSelection,
  viewMode,
  setViewModeAction,
  editorFocusMode,
  toggleEditorFocusModeAction,
  previewDetached,
  togglePreviewDetachedAction,
  closePreviewDetachedAction,
  onDetachedPreviewBlocked,
  syncScrollEnabled,
  toggleSyncScrollAction,
  openFileAction,
  showCommandPaletteAction,
  showOpenUrlDialogAction,
  goHomeAction,
  saveFileAction,
  saveFileBusy,
  shareActionLabel,
  shareFileAction,
  collaborateActionLabel,
  collaborateFileAction,
  collaborationActive,
  collaborationStartedAt,
  displayName,
  onDisplayNameChangeAction,
  onGenerateDisplayNameAction,
  collaborators,
  collaborationConnected,
  refreshFileAction,
  exportHtmlAction,
  exportPdfAction,
  clearDocumentAction,
  setActiveDocumentAction,
  openWorkspacePageAction,
  closeDocumentAction,
  openRecentAction,
  clearRecentAction,
  undoAction,
  redoAction,
  boldAction,
  italicAction,
  headingAction,
  inlineCodeAction,
  codeBlockAction,
  bulletListAction,
  orderedListAction,
  alphaListAction,
  taskListAction,
  insertTableAction,
  internalLinkTargets,
  insertInternalLinkAction,
  insertExternalLinkAction,
}: MarkdownActiveDocumentProps) => {
  const isMobile = useIsMobile();
  const [editorTopbarHeight, setEditorTopbarHeight] = useState(0);
  const [isWorkspaceTreeCollapsed, setIsWorkspaceTreeCollapsed] = useState(false);
  const [focusView, setFocusView] = useState<"editor" | "preview">("editor");
  const focusScrollRatioRef = useRef(0);
  const workspaceTreePanelRef = usePanelRef();
  const displayedViewMode = previewDetached ? "editor" : viewMode;
  const isSplitView = displayedViewMode === "split";
  const splitOrientation = isMobile && isSplitView ? "vertical" : "horizontal";

  const toggleWorkspaceTreeCollapsed = () => {
    const panel = workspaceTreePanelRef.current;

    if (!panel) {
      return;
    }

    if (isWorkspaceTreeCollapsed) {
      panel.resize(WORKSPACE_TREE_DEFAULT_SIZE);
      setIsWorkspaceTreeCollapsed(false);
      return;
    }

    panel.resize(WORKSPACE_TREE_HEADER_ONLY_SIZE);
    setIsWorkspaceTreeCollapsed(true);
  };

  useEffect(() => {
    if (!editorFocusMode) {
      return;
    }

    const onWindowKeyDown = (event: globalThis.KeyboardEvent) => {
      if (
        event.key !== "Tab" ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.repeat
      ) {
        return;
      }

      const activeElement =
        focusView === "editor" ? editorRef.current : previewRef.current;

      if (activeElement) {
        focusScrollRatioRef.current = getScrollRatio(activeElement);
      }

      event.preventDefault();
      event.stopPropagation();
      setFocusView((currentView) =>
        currentView === "editor" ? "preview" : "editor"
      );
    };

    window.addEventListener("keydown", onWindowKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", onWindowKeyDown, {
        capture: true,
      });
    };
  }, [editorFocusMode, editorRef, focusView, previewRef]);

  useEffect(() => {
    if (!editorFocusMode || focusView !== "preview") {
      return;
    }

    const editorElement = editorRef.current;
    const previewElement = previewRef.current;

    if (!editorElement || !previewElement) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      if (previewRef.current) {
        setScrollRatio(previewRef.current, focusScrollRatioRef.current);
        previewRef.current.focus();
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [editorFocusMode, focusView, editorRef, previewRef]);

  useEffect(() => {
    if (!editorFocusMode || focusView !== "editor") {
      return;
    }

    const previewElement = previewRef.current;
    const editorElement = editorRef.current;

    if (!previewElement || !editorElement) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      if (editorRef.current) {
        setScrollRatio(editorRef.current, focusScrollRatioRef.current);
        editorRef.current.focus();
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [editorFocusMode, focusView, editorRef, previewRef]);

  const handleFocusEditorScroll = () => {
    const editorElement = editorRef.current;

    if (editorElement) {
      focusScrollRatioRef.current = getScrollRatio(editorElement);
    }

    onEditorScroll();
  };

  const handleFocusPreviewScroll = () => {
    const previewElement = previewRef.current;

    if (previewElement) {
      focusScrollRatioRef.current = getScrollRatio(previewElement);
    }

    onPreviewScroll();
  };

  if (editorFocusMode) {
    return (
      <div className="relative flex min-h-0 flex-1 items-stretch justify-center overflow-hidden bg-background p-4">
        <div className="h-full w-full">
          {focusView === "editor" ? (
            <MarkdownEditorPanel
              activeFile={activeFile}
              content={content}
              stats={stats}
              editorRef={editorRef}
              onChange={onEditorChange}
              onBlur={onEditorBlur}
              onSelectionChange={onEditorSelectionChange}
              onScroll={handleFocusEditorScroll}
              collaboratorSelections={collaboratorSelections}
              undoAction={undoAction}
              redoAction={redoAction}
              boldAction={boldAction}
              italicAction={italicAction}
              headingAction={headingAction}
              inlineCodeAction={inlineCodeAction}
              codeBlockAction={codeBlockAction}
              bulletListAction={bulletListAction}
              orderedListAction={orderedListAction}
              alphaListAction={alphaListAction}
              taskListAction={taskListAction}
              insertTableAction={insertTableAction}
              internalLinkTargets={internalLinkTargets}
              insertInternalLinkAction={insertInternalLinkAction}
              insertExternalLinkAction={insertExternalLinkAction}
              focusMode
              onExitFocusModeAction={toggleEditorFocusModeAction}
              className="rounded-md border border-border/70 bg-card"
              textareaClassName="p-4 text-base"
            />
          ) : (
            <div className="h-full rounded-md border border-border/70 bg-card">
              <MarkdownPreviewPanel
                content={previewContent}
                previewRef={previewRef}
                editorSelection={previewSelection}
                onOpenInternalLinkAction={onOpenInternalLinkAction}
                onScroll={handleFocusPreviewScroll}
                previewDetached={previewDetached}
                togglePreviewDetachedAction={togglePreviewDetachedAction}
              />
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <MarkdownToolbar
        activeFile={activeFile}
        openDocumentsCount={openDocuments.length}
        dirtyOpenDocumentNames={openDocuments
          .filter((document) => document.isDirty)
          .map((document) => document.file.name)}
        recentFiles={recentFiles}
        isBusy={isBusy}
        openFileAction={openFileAction}
        showCommandPaletteAction={showCommandPaletteAction}
        showOpenUrlDialogAction={showOpenUrlDialogAction}
        goHomeAction={goHomeAction}
        saveFileAction={saveFileAction}
        saveFileBusy={saveFileBusy}
        shareActionLabel={shareActionLabel}
        shareFileAction={shareFileAction}
        collaborateActionLabel={collaborateActionLabel}
        collaborateFileAction={collaborateFileAction}
        collaborationActive={collaborationActive}
        collaborationStartedAt={collaborationStartedAt}
        displayName={displayName}
        onDisplayNameChangeAction={onDisplayNameChangeAction}
        onGenerateDisplayNameAction={onGenerateDisplayNameAction}
        collaborators={collaborators}
        collaborationConnected={collaborationConnected}
        refreshFileAction={refreshFileAction}
        exportHtmlAction={exportHtmlAction}
        exportPdfAction={exportPdfAction}
        clearDocumentAction={clearDocumentAction}
        openRecentAction={openRecentAction}
        clearRecentAction={clearRecentAction}
        viewMode={viewMode}
        editorFocusMode={editorFocusMode}
        setViewModeAction={setViewModeAction}
        toggleEditorFocusModeAction={toggleEditorFocusModeAction}
        syncScrollEnabled={syncScrollEnabled}
        toggleSyncScrollAction={toggleSyncScrollAction}
      />

      <MarkdownDocumentTabs
        openDocuments={openDocuments}
        activeDocumentId={activeDocumentId}
        setActiveDocumentAction={setActiveDocumentAction}
        closeDocumentAction={closeDocumentAction}
      />
      {workspace ? (
        <ResizablePanelGroup
          orientation="horizontal"
          className="min-h-0 flex-1 bg-background"
        >
          <ResizablePanel defaultSize={65} minSize={35}>
            <div className="min-h-0 h-full">
              <ResizablePanelGroup
                orientation="vertical"
                className="min-h-0 h-full"
              >
                <ResizablePanel
                  minSize={35}
                >
                  <MarkdownEditorPanel
                    activeFile={activeFile}
                    content={content}
                    stats={stats}
                    editorRef={editorRef}
                    onTopbarHeightChange={setEditorTopbarHeight}
                    onChange={onEditorChange}
                    onBlur={onEditorBlur}
                    onSelectionChange={onEditorSelectionChange}
                    onScroll={onEditorScroll}
                    collaboratorSelections={collaboratorSelections}
                    undoAction={undoAction}
                    redoAction={redoAction}
                    boldAction={boldAction}
                    italicAction={italicAction}
                    headingAction={headingAction}
                    inlineCodeAction={inlineCodeAction}
                    codeBlockAction={codeBlockAction}
                    bulletListAction={bulletListAction}
                    orderedListAction={orderedListAction}
                    alphaListAction={alphaListAction}
                    taskListAction={taskListAction}
                    insertTableAction={insertTableAction}
                    internalLinkTargets={internalLinkTargets}
                    insertInternalLinkAction={insertInternalLinkAction}
                    insertExternalLinkAction={insertExternalLinkAction}
                  />
                </ResizablePanel>

                <ResizableHandle withHandle className="bg-border/80" />

                <ResizablePanel
                  panelRef={workspaceTreePanelRef}
                  defaultSize={WORKSPACE_TREE_DEFAULT_SIZE}
                  minSize={WORKSPACE_TREE_HEADER_ONLY_SIZE}
                  onResize={() => {
                    const panelSizeInPixels =
                      workspaceTreePanelRef.current?.getSize().inPixels ?? 0;

                    setIsWorkspaceTreeCollapsed(
                      panelSizeInPixels <= 60
                    );
                  }}
                >
                  <div className="flex h-full min-h-0 flex-col border-t border-border/70">
                    <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Workspace files
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {workspace.pages.length} pages
                        </p>
                      </div>

                      <button
                        type="button"
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        onClick={toggleWorkspaceTreeCollapsed}
                        aria-label={
                          isWorkspaceTreeCollapsed
                            ? "Expand workspace files"
                            : "Collapse workspace files"
                        }
                        title={
                          isWorkspaceTreeCollapsed
                            ? "Expand workspace files"
                            : "Collapse workspace files"
                        }
                      >
                        {isWorkspaceTreeCollapsed ? (
                          <ChevronUpIcon className="size-4" />
                        ) : (
                          <ChevronDownIcon className="size-4" />
                        )}
                      </button>
                    </div>

                    {!isWorkspaceTreeCollapsed ? (
                      <div className="min-h-0 flex-1 p-2">
                        <MarkdownWorkspaceTree
                          workspace={workspace}
                          activeRelativePath={activeFile.relativePath ?? null}
                          openWorkspacePageAction={openWorkspacePageAction}
                        />
                      </div>
                    ) : null}
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-border/80">
            <GripVerticalIcon />
          </ResizableHandle>

          <ResizablePanel defaultSize={35} minSize={25}>
            <MarkdownPreviewPanel
              content={previewContent}
              previewRef={previewRef}
              editorSelection={previewSelection}
              onOpenInternalLinkAction={onOpenInternalLinkAction}
              topOverlayHeight={editorTopbarHeight}
              onScroll={onPreviewScroll}
              previewDetached={previewDetached}
              togglePreviewDetachedAction={togglePreviewDetachedAction}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <ResizablePanelGroup
          orientation={splitOrientation}
          className="min-h-0 flex-1 bg-background"
        >
          {displayedViewMode !== "preview" ? (
            <ResizablePanel
              defaultSize={displayedViewMode === "editor" ? 100 : 50}
              minSize={30}
            >
              <MarkdownEditorPanel
                activeFile={activeFile}
                content={content}
                stats={stats}
                editorRef={editorRef}
                onTopbarHeightChange={setEditorTopbarHeight}
                onChange={onEditorChange}
                onBlur={onEditorBlur}
                onSelectionChange={onEditorSelectionChange}
                onScroll={onEditorScroll}
                collaboratorSelections={collaboratorSelections}
                undoAction={undoAction}
                redoAction={redoAction}
                boldAction={boldAction}
                italicAction={italicAction}
                headingAction={headingAction}
                inlineCodeAction={inlineCodeAction}
                codeBlockAction={codeBlockAction}
                bulletListAction={bulletListAction}
                orderedListAction={orderedListAction}
                alphaListAction={alphaListAction}
                taskListAction={taskListAction}
                insertTableAction={insertTableAction}
                internalLinkTargets={internalLinkTargets}
                insertInternalLinkAction={insertInternalLinkAction}
                insertExternalLinkAction={insertExternalLinkAction}
              />
            </ResizablePanel>
          ) : null}

          {isSplitView ? (
            <ResizableHandle withHandle className="bg-border/80">
              {splitOrientation === "vertical" ? (
                <GripHorizontalIcon />
              ) : (
                <GripVerticalIcon />
              )}
            </ResizableHandle>
          ) : null}

          {displayedViewMode !== "editor" ? (
            <ResizablePanel
              defaultSize={displayedViewMode === "preview" ? 100 : 50}
              minSize={30}
            >
              <MarkdownPreviewPanel
                content={previewContent}
                previewRef={previewRef}
                editorSelection={previewSelection}
                onOpenInternalLinkAction={onOpenInternalLinkAction}
                topOverlayHeight={editorTopbarHeight}
                onScroll={onPreviewScroll}
                previewDetached={previewDetached}
                togglePreviewDetachedAction={togglePreviewDetachedAction}
              />
            </ResizablePanel>
          ) : null}
        </ResizablePanelGroup>
      )}

      <DetachedWindowPortal
        open={previewDetached}
        title={`${activeFile.name} Preview | .MD`}
        onCloseAction={closePreviewDetachedAction}
        onBlockedAction={onDetachedPreviewBlocked}
      >
        <MarkdownPreviewPanel
          content={previewContent}
          previewRef={previewRef}
          editorSelection={previewSelection}
          onOpenInternalLinkAction={onOpenInternalLinkAction}
          onScroll={onPreviewScroll}
          previewDetached={previewDetached}
          togglePreviewDetachedAction={togglePreviewDetachedAction}
        />
      </DetachedWindowPortal>
    </div>
  );
};
