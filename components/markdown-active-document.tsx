import { GripVerticalIcon } from "lucide-react";
import * as React from "react";

import { MarkdownToolbar } from "@/components/markdown-toolbar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  type MarkdownOpenFromUrlActionResult,
  type RecentMarkdownFile,
} from "@/types/markdown";

import { type ViewMode } from "../types/view-mode";
import { MarkdownEditorPanel } from "./markdown-editor-panel";
import { MarkdownPreviewPanel } from "./markdown-preview-panel";

type MarkdownActiveDocumentProps = {
  activeFile: RecentMarkdownFile;
  recentFiles: RecentMarkdownFile[];
  isBusy: boolean;
  content: string;
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  previewRef: React.RefObject<HTMLDivElement | null>;
  onEditorChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onEditorScroll: () => void;
  onPreviewScroll: () => void;
  viewMode: ViewMode;
  setViewModeAction: (value: ViewMode) => void;
  syncScrollEnabled: boolean;
  toggleSyncScrollAction: () => void;
  openFileAction: () => void;
  openUrlAction: (
    url: string,
    fileName?: string
  ) => Promise<MarkdownOpenFromUrlActionResult>;
  goHomeAction: () => void;
  saveFileAction: () => void;
  refreshFileAction: () => void;
  clearDocumentAction: () => void;
  openRecentAction: (id: string) => void;
  removeRecentAction: (id: string) => void;
  clearRecentAction: () => void;
  undoAction: () => void;
  redoAction: () => void;
  boldAction: () => void;
  italicAction: () => void;
  headingAction: (level: 1 | 2 | 3 | 4 | 5 | 6) => void;
  inlineCodeAction: () => void;
  codeBlockAction: () => void;
  bulletListAction: () => void;
};

export const MarkdownActiveDocument = ({
  activeFile,
  recentFiles,
  isBusy,
  content,
  editorRef,
  previewRef,
  onEditorChange,
  onEditorScroll,
  onPreviewScroll,
  viewMode,
  setViewModeAction,
  syncScrollEnabled,
  toggleSyncScrollAction,
  openFileAction,
  openUrlAction,
  goHomeAction,
  saveFileAction,
  refreshFileAction,
  clearDocumentAction,
  openRecentAction,
  removeRecentAction,
  clearRecentAction,
  undoAction,
  redoAction,
  boldAction,
  italicAction,
  headingAction,
  inlineCodeAction,
  codeBlockAction,
  bulletListAction,
}: MarkdownActiveDocumentProps) => {
  const [editorTopbarHeight, setEditorTopbarHeight] = React.useState(0);

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <MarkdownToolbar
        activeFile={activeFile}
        content={content}
        recentFiles={recentFiles}
        isBusy={isBusy}
        openFileAction={openFileAction}
        openUrlAction={openUrlAction}
        goHomeAction={goHomeAction}
        saveFileAction={saveFileAction}
        refreshFileAction={refreshFileAction}
        clearDocumentAction={clearDocumentAction}
        openRecentAction={openRecentAction}
        removeRecentAction={removeRecentAction}
        clearRecentAction={clearRecentAction}
        viewMode={viewMode}
        setViewModeAction={setViewModeAction}
        syncScrollEnabled={syncScrollEnabled}
        toggleSyncScrollAction={toggleSyncScrollAction}
      />

      <ResizablePanelGroup
        orientation="horizontal"
        className="flex-1 min-h-0 bg-background"
      >
        {viewMode !== "preview" ? (
          <ResizablePanel
            defaultSize={viewMode === "editor" ? 100 : 50}
            minSize={30}
          >
            <MarkdownEditorPanel
              activeFile={activeFile}
              content={content}
              editorRef={editorRef}
              onTopbarHeightChange={setEditorTopbarHeight}
              onChange={onEditorChange}
              onScroll={onEditorScroll}
              undoAction={undoAction}
              redoAction={redoAction}
              boldAction={boldAction}
              italicAction={italicAction}
              headingAction={headingAction}
              inlineCodeAction={inlineCodeAction}
              codeBlockAction={codeBlockAction}
              bulletListAction={bulletListAction}
            />
          </ResizablePanel>
        ) : null}

        {viewMode === "split" ? (
          <ResizableHandle withHandle className="bg-border/80">
            <GripVerticalIcon />
          </ResizableHandle>
        ) : null}

        {viewMode !== "editor" ? (
          <ResizablePanel
            defaultSize={viewMode === "preview" ? 100 : 50}
            minSize={30}
          >
            <MarkdownPreviewPanel
              content={content}
              previewRef={previewRef}
              topOverlayHeight={editorTopbarHeight}
              onScroll={onPreviewScroll}
            />
          </ResizablePanel>
        ) : null}
      </ResizablePanelGroup>
    </div>
  );
};
