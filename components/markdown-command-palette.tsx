"use client";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  type OpenMarkdownDocument,
  type RecentMarkdownFile,
} from "@/types/markdown";
import {
  CheckIcon,
  DownloadIcon,
  FilePlusIcon,
  FileTextIcon,
  FolderOpenIcon,
  HistoryIcon,
  HomeIcon,
  LinkIcon,
  PanelLeftIcon,
  PanelRightIcon,
  RefreshCcwIcon,
  SaveIcon,
  TypeIcon,
  XIcon,
} from "lucide-react";

type MarkdownCommandPaletteProps = {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  activeDocumentId: string | null;
  activeFileName: string | null;
  openDocuments: OpenMarkdownDocument[];
  recentFiles: RecentMarkdownFile[];
  viewMode: "split" | "editor" | "preview";
  canSaveActiveFile: boolean;
  hasActiveFile: boolean;
  isBusy: boolean;
  openFileAction: () => void;
  openFolderAction: () => void;
  openUrlDialogAction: () => void;
  createNewAction: () => void;
  saveFileAction: () => void;
  shareActionLabel: string;
  shareFileAction: () => void;
  refreshFileAction: () => void;
  exportMarkdownAction: () => void;
  exportHtmlAction: () => void;
  goHomeAction: () => void;
  closeDocumentAction: () => void;
  internalLinkTargets: string[];
  insertInternalLinkAction: (relativePath: string) => void;
  openRecentAction: (id: string) => void;
  setActiveDocumentAction: (id: string) => void;
  setViewModeAction: (value: "split" | "editor" | "preview") => void;
};

const platformShortcut =
  typeof navigator !== "undefined" && /mac/i.test(navigator.platform)
    ? "\u2318"
    : "Ctrl+";

const viewOptions = [
  {
    value: "split" as const,
    label: "Split view",
    icon: PanelLeftIcon,
  },
  {
    value: "editor" as const,
    label: "Editor only",
    icon: TypeIcon,
  },
  {
    value: "preview" as const,
    label: "Preview only",
    icon: PanelRightIcon,
  },
];

export const MarkdownCommandPalette = ({
  open,
  onOpenChangeAction,
  activeDocumentId,
  activeFileName,
  openDocuments,
  recentFiles,
  viewMode,
  canSaveActiveFile,
  hasActiveFile,
  isBusy,
  openFileAction,
  openFolderAction,
  openUrlDialogAction,
  createNewAction,
  saveFileAction,
  shareActionLabel,
  shareFileAction,
  refreshFileAction,
  exportMarkdownAction,
  exportHtmlAction,
  goHomeAction,
  closeDocumentAction,
  internalLinkTargets,
  insertInternalLinkAction,
  openRecentAction,
  setActiveDocumentAction,
  setViewModeAction,
}: MarkdownCommandPaletteProps) => {
  const runAction = (action: () => void) => {
    onOpenChangeAction(false);
    action();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChangeAction}
      title="Quick switcher"
      description="Search for files, views, and editor actions."
      className="max-w-2xl"
    >
      <Command>
        <CommandInput placeholder="Search commands, files, and views..." />
        <CommandList>
          <CommandEmpty>No matching command.</CommandEmpty>

          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => runAction(openFileAction)}
              disabled={isBusy}
            >
              <FolderOpenIcon />
              Open file
            </CommandItem>
            <CommandItem
              onSelect={() => runAction(openFolderAction)}
              disabled={isBusy}
            >
              <FolderOpenIcon />
              Open folder
            </CommandItem>
            <CommandItem
              onSelect={() => runAction(openUrlDialogAction)}
              disabled={isBusy}
            >
              <LinkIcon />
              Open URL
            </CommandItem>
            <CommandItem
              onSelect={() => runAction(createNewAction)}
              disabled={isBusy}
            >
              <FilePlusIcon />
              Create new file
            </CommandItem>
            <CommandItem
              onSelect={() => runAction(saveFileAction)}
              disabled={!hasActiveFile || !canSaveActiveFile || isBusy}
            >
              <SaveIcon />
              Save current file
              <CommandShortcut>{platformShortcut}S</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => runAction(shareFileAction)}
              disabled={!hasActiveFile || isBusy}
            >
              <LinkIcon />
              {shareActionLabel}
            </CommandItem>
            <CommandItem
              onSelect={() => runAction(refreshFileAction)}
              disabled={!hasActiveFile || isBusy}
            >
              <RefreshCcwIcon />
              Refresh current file
            </CommandItem>
            <CommandItem
              onSelect={() => runAction(exportMarkdownAction)}
              disabled={!hasActiveFile || isBusy}
            >
              <DownloadIcon />
              Export as Markdown
            </CommandItem>
            <CommandItem
              onSelect={() => runAction(exportHtmlAction)}
              disabled={!hasActiveFile || isBusy}
            >
              <DownloadIcon />
              Export as HTML
            </CommandItem>
            <CommandItem
              onSelect={() => runAction(goHomeAction)}
              disabled={isBusy}
            >
              <HomeIcon />
              Back to home
            </CommandItem>
            <CommandItem
              onSelect={() => runAction(closeDocumentAction)}
              disabled={!hasActiveFile || isBusy}
            >
              <XIcon />
              Close current tab
            </CommandItem>
          </CommandGroup>

          {internalLinkTargets.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Insert internal link">
                {internalLinkTargets.slice(0, 30).map((relativePath) => (
                  <CommandItem
                    key={relativePath}
                    onSelect={() =>
                      runAction(() => {
                        insertInternalLinkAction(relativePath);
                      })
                    }
                    disabled={!hasActiveFile || isBusy}
                  >
                    <LinkIcon />
                    {relativePath}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          <CommandSeparator />

          <CommandGroup heading="View">
            {viewOptions.map((option) => {
              const Icon = option.icon;
              const isActive = option.value === viewMode;

              return (
                <CommandItem
                  key={option.value}
                  onSelect={() =>
                    runAction(() => {
                      setViewModeAction(option.value);
                    })
                  }
                >
                  <Icon />
                  {option.label}
                  {isActive ? <CheckIcon className="ml-auto" /> : null}
                </CommandItem>
              );
            })}
          </CommandGroup>

          {openDocuments.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Open tabs">
                {openDocuments.map((document) => (
                  <CommandItem
                    key={document.id}
                    onSelect={() =>
                      runAction(() => {
                        setActiveDocumentAction(document.id);
                      })
                    }
                  >
                    <FileTextIcon />
                    {document.file.name}
                    {document.id === activeDocumentId ? (
                      <CommandShortcut>Active</CommandShortcut>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          {recentFiles.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Recent files">
                {recentFiles.slice(0, 8).map((file) => (
                  <CommandItem
                    key={file.id}
                    onSelect={() =>
                      runAction(() => {
                        openRecentAction(file.id);
                      })
                    }
                  >
                    <HistoryIcon />
                    {file.name}
                    {activeFileName === file.name ? (
                      <CommandShortcut>Recent</CommandShortcut>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  );
};
