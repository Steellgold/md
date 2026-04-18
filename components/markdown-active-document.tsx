import { DetachedWindowPortal } from "@/components/detached-window-portal";
import { MarkdownDocumentTabs } from "@/components/markdown-document-tabs";
import { MarkdownToolbar } from "@/components/markdown-toolbar";
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
} from "@/types/markdown";
import { type MarkdownViewerSelection } from "@/types/markdown-viewer-selection";
import { GripVerticalIcon } from "lucide-react";
import { ChangeEvent, RefObject, useState } from "react";
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
  previewContent: string;
  editorRef: RefObject<HTMLTextAreaElement | null>;
  previewRef: RefObject<HTMLDivElement | null>;
  onEditorChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onEditorBlur: () => void;
  onEditorSelectionChange: (editor: HTMLTextAreaElement) => void;
  onEditorScroll: () => void;
  collaboratorSelections: CollaborationParticipant[];
  onPreviewScroll: () => void;
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
  taskListAction: () => void;
};

export const MarkdownActiveDocument = ({
  activeFile,
  openDocuments,
  activeDocumentId,
  recentFiles,
  isBusy,
  content,
  stats,
  previewContent,
  editorRef,
  previewRef,
  onEditorChange,
  onEditorBlur,
  onEditorSelectionChange,
  onEditorScroll,
  collaboratorSelections,
  onPreviewScroll,
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
  taskListAction,
}: MarkdownActiveDocumentProps) => {
  const [editorTopbarHeight, setEditorTopbarHeight] = useState(0);
  const displayedViewMode = previewDetached ? "editor" : viewMode;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <MarkdownToolbar
        activeFile={activeFile}
        openDocumentsCount={openDocuments.length}
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

      <ResizablePanelGroup
        orientation="horizontal"
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
              taskListAction={taskListAction}
            />
          </ResizablePanel>
        ) : null}

        {displayedViewMode === "split" ? (
          <ResizableHandle withHandle className="bg-border/80">
            <GripVerticalIcon />
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
              topOverlayHeight={editorTopbarHeight}
              onScroll={onPreviewScroll}
              previewDetached={previewDetached}
              togglePreviewDetachedAction={togglePreviewDetachedAction}
            />
          </ResizablePanel>
        ) : null}
      </ResizablePanelGroup>

      <DetachedWindowPortal
        open={previewDetached}
        title={`${activeFile.name} Preview | .MD`}
        onCloseAction={closePreviewDetachedAction}
        onBlocked={onDetachedPreviewBlocked}
      >
        <MarkdownPreviewPanel
          content={previewContent}
          previewRef={previewRef}
          editorSelection={previewSelection}
          onScroll={onPreviewScroll}
          previewDetached={previewDetached}
          togglePreviewDetachedAction={togglePreviewDetachedAction}
        />
      </DetachedWindowPortal>
    </div>
  );
};
