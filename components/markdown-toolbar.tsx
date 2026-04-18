"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  buildRecentFileMeta,
} from "@/lib/markdown-helpers";
import {
  type CollaborationParticipant,
  type RecentMarkdownFile,
} from "@/types/markdown";
import {
  ChevronDownIcon, EllipsisIcon,
  FolderOpenIcon,
  HistoryIcon,
  HouseIcon,
  LinkIcon,
  MonitorUpIcon,
  PanelLeftIcon,
  PanelRightIcon,
  RefreshCcwIcon,
  SaveIcon,
  Trash2Icon,
  TypeIcon,
  UserRoundIcon,
  UsersIcon,
  XIcon
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type MarkdownToolbarProps = {
  activeFile: RecentMarkdownFile | null;
  openDocumentsCount: number;
  recentFiles: RecentMarkdownFile[];
  isBusy: boolean;
  openFileAction: () => void;
  showCommandPaletteAction: () => void;
  showOpenUrlDialogAction: () => void;
  goHomeAction: () => void;
  saveFileAction: () => void;
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
  recentFiles,
  isBusy,
  openFileAction,
  showOpenUrlDialogAction,
  goHomeAction,
  saveFileAction,
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
  openRecentAction,
  clearRecentAction,
  viewMode,
  setViewModeAction,
  syncScrollEnabled,
  toggleSyncScrollAction,
}: MarkdownToolbarProps) => {
  const [isClearHistoryConfirmOpen, setIsClearHistoryConfirmOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());

  const secondaryLabel = activeFile?.url
    ? "Remote document"
    : activeFile?.path
      ? activeFile.path
      : activeFile?.lastOpenedAt
        ? `Opened ${new Date(activeFile.lastOpenedAt).toLocaleString()}`
        : "Local document";
  const canSaveFile = activeFile?.source === "picker" || activeFile?.source === "drop";
  const refreshLabel = activeFile?.source === "url" ? "Reload URL" : "Reopen file";
  const closeLabel = openDocumentsCount > 1 ? "Close tab" : "Close document";
  const visibleRecentFiles = recentFiles.slice(0, 6);
  const overflowRecentFiles = recentFiles.slice(6);
  const visibleCollaborators = collaborators.slice(0, 4);
  const remainingCollaborators = collaborators.length - visibleCollaborators.length;
  const overflowCollaborators = collaborators.slice(4);
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

  const getInitials = (value: string) =>
    value
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");

  return (
    <div className="border-b bg-background/80 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-lg ring-1 ring-border rounded-l-xl px-2 pr-2 py-1 flex min-w-0 items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={goHomeAction}
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
            open={isClearHistoryConfirmOpen}
            onOpenChange={setIsClearHistoryConfirmOpen}
            title="Clear recent history?"
            content="This removes every recent file entry from the history menu."
            confirmButton="Clear history"
            onConfirm={clearRecentAction}
          />

          <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Profile</DialogTitle>
                <DialogDescription>
                  Set your name for collaborative sessions.
                </DialogDescription>
              </DialogHeader>

              <Field>
                <FieldLabel htmlFor="collab-display-name">Display name</FieldLabel>
                <FieldContent>
                  <div className="flex items-center gap-2">
                    <Input
                      id="collab-display-name"
                      value={displayName}
                      onChange={(event) =>
                        onDisplayNameChangeAction(event.target.value)
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={onGenerateDisplayNameAction}
                      aria-label="Generate random display name"
                      title="Generate random display name"
                    >
                      <RefreshCcwIcon />
                    </Button>
                  </div>
                  <FieldDescription>
                    This name is saved locally.
                  </FieldDescription>
                </FieldContent>
              </Field>
              <DialogFooter>
                <Button
                  type="button"
                  onClick={() => setIsProfileDialogOpen(false)}
                >
                  Done
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <ButtonGroup>
            <Button
              variant="outline"
              onClick={openFileAction}
              disabled={isBusy}
            >
              <FolderOpenIcon data-icon="inline-start" />
              Open file
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={isBusy}
                  aria-label="Open options"
                >
                  <ChevronDownIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuItem onSelect={openFileAction}>
                  <FolderOpenIcon />
                  Open file
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={showOpenUrlDialogAction}>
                  <LinkIcon />
                  Open URL
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuLabel>Recent</DropdownMenuLabel>

                {visibleRecentFiles.length > 0 ? (
                  <DropdownMenuGroup>
                    {visibleRecentFiles.map((file) => {
                      const itemLabel = buildRecentFileMeta(file);

                      return (
                        <DropdownMenuItem
                          key={file.id}
                          className="justify-between gap-3"
                          onSelect={() => openRecentAction(file.id)}
                        >
                          <div className="flex min-w-0 items-start gap-2">
                            <HistoryIcon />
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate">{file.name}</span>
                              <span className="truncate text-xs text-muted-foreground">
                                {itemLabel}
                              </span>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuGroup>
                ) : (
                  <DropdownMenuItem disabled>No recent files</DropdownMenuItem>
                )}

                {overflowRecentFiles.length > 0 ? (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <HistoryIcon />
                      See more
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-72">
                      {overflowRecentFiles.map((file) => {
                        const itemLabel = buildRecentFileMeta(file);

                        return (
                          <DropdownMenuItem
                            key={file.id}
                            className="justify-between gap-3"
                            onSelect={() => openRecentAction(file.id)}
                          >
                            <div className="flex min-w-0 items-start gap-2">
                              <HistoryIcon />
                              <div className="flex min-w-0 flex-col">
                                <span className="truncate">{file.name}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                  {itemLabel}
                                </span>
                              </div>
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ) : null}

                {recentFiles.length > 0 ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => setIsClearHistoryConfirmOpen(true)}
                      variant="destructive"
                    >
                      <Trash2Icon />
                      Clear history
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>

          <Button
            onClick={saveFileAction}
            disabled={!activeFile || !canSaveFile || isBusy}
          >
            <SaveIcon data-icon="inline-start" />
            Save
          </Button>

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

          {collaborators.length > 0 ? (
            <TooltipProvider delayDuration={150}>
              <AvatarGroup className="bg-card rounded-full ring-1 ring-border px-0.5 py-0.5">
                {visibleCollaborators.map((participant) => (
                  <Tooltip key={participant.id}>
                    <TooltipTrigger asChild>
                      <Avatar
                        size="sm"
                        style={{
                          outline: `2px solid ${participant.color}`,
                          outlineOffset: "-1px",
                        }}
                      >
                        <AvatarImage
                          src={participant.avatarUrl}
                          alt={participant.name}
                        />
                        <AvatarFallback>
                          {getInitials(participant.name)}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>
                      {participant.isLocal
                        ? `${participant.name} (You)`
                        : participant.name}
                    </TooltipContent>
                  </Tooltip>
                ))}
                {remainingCollaborators > 0 ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AvatarGroupCount>+{remainingCollaborators}</AvatarGroupCount>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>
                      {overflowCollaborators
                        .map((participant) =>
                          participant.isLocal
                            ? `${participant.name} (You)`
                            : participant.name
                        )
                        .join(", ")}
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </AvatarGroup>
            </TooltipProvider>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" title="More actions">
                <EllipsisIcon />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>View</DropdownMenuLabel>
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
              <DropdownMenuLabel>Document actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setIsProfileDialogOpen(true)}>
                <UserRoundIcon />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={refreshFileAction}
                disabled={!activeFile || isBusy}
              >
                <RefreshCcwIcon />
                {refreshLabel}
              </DropdownMenuItem>

              <DropdownMenuCheckboxItem
                checked={syncScrollEnabled}
                onCheckedChange={toggleSyncScrollAction}
              >
                <MonitorUpIcon />
                Sync scrolling
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
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
