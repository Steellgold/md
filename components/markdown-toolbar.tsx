"use client";

import {
  CheckIcon,
  CodeIcon,
  CopyIcon,
  FilePlus2Icon,
  FolderOpenIcon,
  Heading1Icon,
  HistoryIcon,
  HouseIcon,
  ItalicIcon,
  ListIcon,
  PanelLeftIcon,
  PanelRightIcon,
  PilcrowIcon,
  RefreshCcwIcon,
  SaveIcon,
  Trash2Icon,
  TypeIcon,
  XIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { buildFileLabel } from "@/lib/markdown-helpers";
import { type RecentMarkdownFile } from "@/lib/markdown-types";

type MarkdownToolbarProps = {
  activeFile: RecentMarkdownFile | null;
  recentFiles: RecentMarkdownFile[];
  isBusy: boolean;
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
  viewMode: "split" | "editor" | "preview";
  setViewModeAction: (value: "split" | "editor" | "preview") => void;
  syncScrollEnabled: boolean;
  toggleSyncScrollAction: () => void;
};

export const MarkdownToolbar = ({
  activeFile,
  recentFiles,
  isBusy,
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
  viewMode,
  setViewModeAction,
  syncScrollEnabled,
  toggleSyncScrollAction,
}: MarkdownToolbarProps) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-md border-b bg-card/80 p-3 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onSelect={goHomeAction}>
                <HouseIcon />
                Back to home
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={openFileAction}>
                <FilePlus2Icon />
                Open file
                <MenubarShortcut>Ctrl+O</MenubarShortcut>
              </MenubarItem>
              <MenubarItem
                onSelect={saveFileAction}
                disabled={!activeFile || isBusy}
              >
                <SaveIcon />
                Save file
                <MenubarShortcut>Ctrl+S</MenubarShortcut>
              </MenubarItem>
              <MenubarItem
                onSelect={refreshFileAction}
                disabled={!activeFile || isBusy}
              >
                <RefreshCcwIcon />
                Reopen file
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem
                onSelect={clearDocumentAction}
                disabled={!activeFile}
              >
                <XIcon />
                Close document
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onSelect={undoAction} disabled={!activeFile}>
                <RefreshCcwIcon />
                Undo
                <MenubarShortcut>Ctrl+Z</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={redoAction} disabled={!activeFile}>
                <RefreshCcwIcon />
                Redo
                <MenubarShortcut>Ctrl+Y</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={cutAction} disabled={!activeFile}>
                <TypeIcon />
                Cut
                <MenubarShortcut>Ctrl+X</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={copyAction} disabled={!activeFile}>
                <CopyIcon />
                Copy
                <MenubarShortcut>Ctrl+C</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={pasteAction} disabled={!activeFile}>
                <PilcrowIcon />
                Paste
                <MenubarShortcut>Ctrl+V</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={selectAllAction} disabled={!activeFile}>
                <CheckIcon />
                Select all
                <MenubarShortcut>Ctrl+A</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger>Insert</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onSelect={headingAction} disabled={!activeFile}>
                <Heading1Icon />
                Heading
              </MenubarItem>
              <MenubarItem onSelect={boldAction} disabled={!activeFile}>
                <TypeIcon />
                Bold
                <MenubarShortcut>Ctrl+B</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={italicAction} disabled={!activeFile}>
                <ItalicIcon />
                Italic
                <MenubarShortcut>Ctrl+I</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onSelect={inlineCodeAction} disabled={!activeFile}>
                <CodeIcon />
                Inline code
              </MenubarItem>
              <MenubarItem onSelect={codeBlockAction} disabled={!activeFile}>
                <CodeIcon />
                Code block
              </MenubarItem>
              <MenubarItem onSelect={bulletListAction} disabled={!activeFile}>
                <ListIcon />
                Bullet list
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarRadioGroup
                value={viewMode}
                onValueChange={(value) =>
                  setViewModeAction(value as "split" | "editor" | "preview")
                }
              >
                <MenubarRadioItem value="split">
                  <PanelLeftIcon />
                  Split view
                </MenubarRadioItem>
                <MenubarRadioItem value="editor">
                  <TypeIcon />
                  Editor only
                </MenubarRadioItem>
                <MenubarRadioItem value="preview">
                  <PanelRightIcon />
                  Preview only
                </MenubarRadioItem>
              </MenubarRadioGroup>
              <MenubarSeparator />
              <MenubarCheckboxItem
                checked={syncScrollEnabled}
                onCheckedChange={toggleSyncScrollAction}
              >
                Sync scrolling
              </MenubarCheckboxItem>
              <MenubarSeparator />
              <MenubarItem onSelect={focusEditorAction} disabled={!activeFile}>
                <TypeIcon />
                Focus editor
              </MenubarItem>
              <MenubarItem onSelect={focusPreviewAction} disabled={!activeFile}>
                <PanelRightIcon />
                Focus preview
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>

        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            {activeFile?.name ?? "No document open"}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {buildFileLabel(activeFile, "Local file")}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {activeFile ? <Badge variant="outline">Local editing</Badge> : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={recentFiles.length === 0}>
              <HistoryIcon data-icon="inline-start" />
              Recent
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Reopen a file</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {recentFiles.length > 0 ? (
              <DropdownMenuGroup>
                {recentFiles.map((file) => {
                  const secondaryLabel = buildFileLabel(
                    file,
                    "Locally authorized file"
                  );

                  return (
                    <DropdownMenuItem
                      key={file.id}
                      className="justify-between gap-3"
                      onSelect={() => openRecentAction(file.id)}
                    >
                      <div className="flex min-w-0 items-start gap-2">
                        <FolderOpenIcon />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate">{file.name}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {secondaryLabel}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void removeRecentAction(file.id);
                        }}
                        aria-label={`Remove ${file.name} from recent files`}
                      >
                        <Trash2Icon className="size-4" />
                      </button>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>
            ) : (
              <DropdownMenuItem disabled>No recent files</DropdownMenuItem>
            )}
            {recentFiles.length > 0 ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={clearRecentAction}
                  variant="destructive"
                >
                  <Trash2Icon />
                  Clear history
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={openFileAction} disabled={isBusy}>
          <FolderOpenIcon data-icon="inline-start" />
          Open
        </Button>
      </div>
    </div>
  );
};
