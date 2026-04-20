import { DetachedWindowPortal } from "@/components/detached-window-portal";
import { MarkdownDocumentTabs } from "@/components/markdown-document-tabs";
import { MarkdownWorkspaceTree } from "@/components/markdown-workspace-tree";
import { MarkdownToolbar } from "@/components/markdown-toolbar";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  type CollaborationParticipant,
  type MarkdownDocumentStats,
  type OpenMarkdownDocument,
  type RecentMarkdownFile,
  type MarkdownWorkspace,
} from "@/types/markdown";
import { type MarkdownViewerSelection } from "@/types/markdown-viewer-selection";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  GripHorizontalIcon,
  GripVerticalIcon,
} from "lucide-react";
import { usePanelRef } from "react-resizable-panels";
import {
  ChangeEvent,
  RefObject,
  useState,
} from "react";
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
        clearDocumentAction={clearDocumentAction}
        openRecentAction={openRecentAction}
        clearRecentAction={clearRecentAction}
        viewMode={viewMode}
        setViewModeAction={setViewModeAction}
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
