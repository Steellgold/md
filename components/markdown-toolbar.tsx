"use client";

import { Button } from "@/components/ui/button";
import { MarkdownCollaboratorAvatars } from "@/components/markdown-collaborator-avatars";
import { MarkdownToolbarOpenMenu } from "@/components/markdown-toolbar-open-menu";
import { MarkdownToolbarProfileDialog } from "@/components/markdown-toolbar-profile-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import {
  type CollaborationParticipant,
  type RecentMarkdownFile,
} from "@/types/markdown";
import {
  ChevronDownIcon, EllipsisIcon,
  FileCode2Icon,
  HouseIcon,
  LinkIcon,
  MonitorUpIcon,
  PanelLeftIcon,
  PanelRightIcon,
  PrinterIcon,
  RefreshCcwIcon,
  SaveIcon,
  TypeIcon,
  UserRoundIcon,
  UsersIcon,
  XIcon
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type MarkdownToolbarProps = {
  activeFile: RecentMarkdownFile | null;
  openDocumentsCount: number;
  dirtyOpenDocumentNames: string[];
  recentFiles: RecentMarkdownFile[];
  isBusy: boolean;
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
  openRecentAction: (id: string) => void;
  clearRecentAction: () => void;
  viewMode: "split" | "editor" | "preview";
  setViewModeAction: (value: "split" | "editor" | "preview") => void;
  syncScrollEnabled: boolean;
  toggleSyncScrollAction: () => void;
};

const viewOptions = [
  { value: "editor" as const, label: "Editor", icon: TypeIcon },
  { value: "split" as const, label: "Split", icon: PanelLeftIcon },
  { value: "preview" as const, label: "Preview", icon: PanelRightIcon },
];

export const MarkdownToolbar = ({
  activeFile,
  openDocumentsCount,
  dirtyOpenDocumentNames,
  recentFiles,
  isBusy,
  openFileAction,
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
  openRecentAction,
  clearRecentAction,
  viewMode,
  setViewModeAction,
  syncScrollEnabled,
  toggleSyncScrollAction,
}: MarkdownToolbarProps) => {
  const [isClearHistoryConfirmOpen, setIsClearHistoryConfirmOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [homeConfirmIndex, setHomeConfirmIndex] = useState<number | null>(null);
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());
  const homeConfirmAdvancingRef = useRef(false);

  const secondaryLabel = activeFile?.url
    ? "Remote document"
    : activeFile?.path
      ? activeFile.path
      : activeFile?.lastOpenedAt
        ? `Opened ${new Date(activeFile.lastOpenedAt).toLocaleString()}`
        : "Local document";
  const canSaveFile =
    activeFile?.source === "picker" ||
    activeFile?.source === "drop" ||
    activeFile?.source === "folder";
  const refreshLabel = activeFile?.source === "url" ? "Reload URL" : "Reopen file";
  const closeLabel = openDocumentsCount > 1 ? "Close tab" : "Close document";
  const collaborationStartDate = useMemo(
    () => (collaborationStartedAt ? new Date(collaborationStartedAt) : null),
    [collaborationStartedAt]
  );
  useEffect(() => {
    if (!collaborationActive || !collaborationStartDate) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [collaborationActive, collaborationStartDate]);

  const collaborationElapsedLabel = useMemo(() => {
    if (!collaborationActive || !collaborationStartDate) {
      return "00";
    }

    const elapsedMs = Math.max(0, nowTimestamp - collaborationStartDate.getTime());
    const totalSeconds = Math.floor(elapsedMs / 1_000);

    if (totalSeconds < 60) {
      return String(totalSeconds).padStart(2, "0");
    }

    if (totalSeconds < 3_600) {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
        2,
        "0"
      )}`;
    }

    const hours = Math.floor(totalSeconds / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  }, [collaborationActive, collaborationStartDate, nowTimestamp]);

  const currentHomeConfirmFileName =
    homeConfirmIndex === null ? null : dirtyOpenDocumentNames[homeConfirmIndex] ?? null;

  const triggerGoHomeAction = () => {
    if (dirtyOpenDocumentNames.length === 0) {
      goHomeAction();
      return;
    }

    setHomeConfirmIndex(0);
  };

  const cancelGoHomeAction = () => {
    setHomeConfirmIndex(null);
  };

  const confirmGoHomeAction = () => {
    if (homeConfirmIndex === null) {
      goHomeAction();
      return;
    }

    homeConfirmAdvancingRef.current = true;

    if (homeConfirmIndex >= dirtyOpenDocumentNames.length - 1) {
      setHomeConfirmIndex(null);
      goHomeAction();
      window.setTimeout(() => {
        homeConfirmAdvancingRef.current = false;
      }, 0);
      return;
    }

    setHomeConfirmIndex(homeConfirmIndex + 1);
    window.setTimeout(() => {
      homeConfirmAdvancingRef.current = false;
    }, 0);
  };

  return (
    <div className="border-b bg-background/80 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={triggerGoHomeAction}
            title="Back to home"
          >
            <HouseIcon />
          </Button>

          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {activeFile?.name ?? "Untitled document"}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {secondaryLabel}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ConfirmDialog
            open={homeConfirmIndex !== null && currentHomeConfirmFileName !== null}
            onOpenChange={(open) => {
              if (open || homeConfirmAdvancingRef.current) {
                return;
              }

              cancelGoHomeAction();
            }}
            title="Modifications non enregistrées"
            content={
              currentHomeConfirmFileName
                ? `Le fichier "${currentHomeConfirmFileName}" contient des modifications non enregistrées.`
                : ""
            }
            cancelButton="Annuler"
            confirmButton="Fermer quand même"
            onConfirm={confirmGoHomeAction}
          />

          <ConfirmDialog
            open={isClearHistoryConfirmOpen}
            onOpenChange={setIsClearHistoryConfirmOpen}
            title="Clear recent history?"
            content="This removes every recent file entry from the history menu."
            confirmButton="Clear history"
            onConfirm={clearRecentAction}
          />

          <MarkdownToolbarProfileDialog
            displayName={displayName}
            onDisplayNameChangeAction={onDisplayNameChangeAction}
            onGenerateDisplayNameAction={onGenerateDisplayNameAction}
            onOpenChangeAction={setIsProfileDialogOpen}
            open={isProfileDialogOpen}
          />

          <MarkdownToolbarOpenMenu
            isBusy={isBusy}
            onClearHistoryAction={() => setIsClearHistoryConfirmOpen(true)}
            onOpenFileAction={openFileAction}
            onOpenRecentAction={openRecentAction}
            onOpenUrlAction={showOpenUrlDialogAction}
            recentFiles={recentFiles}
          />

          {canSaveFile || !collaborationActive ? (
            <Button
              onClick={saveFileAction}
              disabled={!activeFile || !canSaveFile || isBusy || saveFileBusy}
            >
              {saveFileBusy ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <SaveIcon data-icon="inline-start" />
              )}
              Save
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={!activeFile || isBusy}
                className="relative"
              >
                <LinkIcon data-icon="inline-start" />
                Share
                <ChevronDownIcon data-icon="inline-end" />
                {collaborationActive ? (
                  <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-1 ring-border" />
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Sharing</DropdownMenuLabel>
              {collaborationActive ? (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    <div className="font-medium text-foreground">
                      Session {collaborationConnected ? "active" : "connecting"}
                    </div>
                    <div>
                      Since{" "}
                      {collaborationStartDate
                        ? collaborationStartDate.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}{" "}
                      ({collaborationElapsedLabel})
                    </div>
                    <div>
                      {collaborators.length} participant
                      {collaborators.length > 1 ? "s" : ""}
                    </div>
                  </div>
                </>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={shareFileAction}>
                <LinkIcon />
                {shareActionLabel}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={collaborateFileAction}>
                <UsersIcon />
                {collaborateActionLabel}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setIsProfileDialogOpen(true)}>
                <UserRoundIcon />
                Edit profile
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <MarkdownCollaboratorAvatars collaborators={collaborators} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" title="More actions">
                <EllipsisIcon />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Preferences</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <PanelLeftIcon />
                  View mode
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  {viewOptions.map((option) => {
                    const Icon = option.icon;

                    return (
                      <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={viewMode === option.value}
                        onSelect={() => setViewModeAction(option.value)}
                      >
                        <Icon />
                        {option.label}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setIsProfileDialogOpen(true)}>
                <UserRoundIcon />
                Profile
              </DropdownMenuItem>
              <DropdownMenuCheckboxItem
                checked={syncScrollEnabled}
                onCheckedChange={toggleSyncScrollAction}
              >
                <MonitorUpIcon />
                Sync scrolling
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Export</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={exportHtmlAction}
                disabled={!activeFile || isBusy}
              >
                <FileCode2Icon />
                Export as HTML
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={exportPdfAction}
                disabled={!activeFile || isBusy}
              >
                <PrinterIcon />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Document actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={refreshFileAction}
                disabled={!activeFile || isBusy}
              >
                <RefreshCcwIcon />
                {refreshLabel}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={clearDocumentAction}
                disabled={!activeFile}
                variant="destructive"
              >
                <XIcon />
                {closeLabel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
