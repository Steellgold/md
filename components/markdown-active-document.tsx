import { GripVerticalIcon } from "lucide-react";
import * as React from "react";

import { MarkdownToolbar } from "@/components/markdown-toolbar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { type RecentMarkdownFile } from "@/types/markdown";

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
  goHomeAction: () => void;
  saveFileAction: () => void;
  refreshFileAction: () => void;
  clearDocumentAction: () => void;
  openRecentAction: (id: string) => void;
  removeRecentAction: (id: string) => void;
  clearRecentAction: () => void;
  undoAction: () => void;
  redoAction: () => void;
  cutAction: () => void;
  copyAction: () => void;
  pasteAction: () => void;
  selectAllAction: () => void;
  boldAction: () => void;
  italicAction: () => void;
  headingAction: () => void;
  inlineCodeAction: () => void;
  codeBlockAction: () => void;
  bulletListAction: () => void;
  focusEditorAction: () => void;
  focusPreviewAction: () => void;
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
  goHomeAction,
  saveFileAction,
  refreshFileAction,
  clearDocumentAction,
  openRecentAction,
  removeRecentAction,
  clearRecentAction,
  undoAction,
  redoAction,
  cutAction,
  copyAction,
  pasteAction,
  selectAllAction,
  boldAction,
  italicAction,
  headingAction,
  inlineCodeAction,
  codeBlockAction,
  bulletListAction,
  focusEditorAction,
  focusPreviewAction,
}: MarkdownActiveDocumentProps) => {
  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <MarkdownToolbar
        activeFile={activeFile}
        content={content}
        recentFiles={recentFiles}
        isBusy={isBusy}
        openFileAction={openFileAction}
        goHomeAction={goHomeAction}
        saveFileAction={saveFileAction}
        refreshFileAction={refreshFileAction}
        clearDocumentAction={clearDocumentAction}
        openRecentAction={openRecentAction}
        removeRecentAction={removeRecentAction}
        clearRecentAction={clearRecentAction}
        cutAction={cutAction}
        copyAction={copyAction}
        pasteAction={pasteAction}
        selectAllAction={selectAllAction}
        focusEditorAction={focusEditorAction}
        focusPreviewAction={focusPreviewAction}
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
              onScroll={onPreviewScroll}
            />
          </ResizablePanel>
        ) : null}
      </ResizablePanelGroup>
    </div>
  );
};
