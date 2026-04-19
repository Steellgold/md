"use client";

import { MarkdownCollaborationDialog } from "@/components/markdown-collaboration-dialog";
import { MarkdownCommandPalette } from "@/components/markdown-command-palette";
import { MarkdownOpenUrlDialog } from "@/components/markdown-open-url-dialog";
import { MarkdownRemotePasswordDialog } from "@/components/markdown-remote-password-dialog";
import { MarkdownRemoteSelectionDialog } from "@/components/markdown-remote-selection-dialog";
import { MarkdownShareDialog } from "@/components/markdown-share-dialog";
import {
  type MarkdownOpenFromUrlActionResult,
  type OpenMarkdownDocument,
  type RecentMarkdownFile,
} from "@/types/markdown";

type MarkdownAppDialogsProps = {
  activeDocumentId: string | null;
  activeFileName: string | null;
  canSaveActiveFile: boolean;
  clearPendingRemoteOpenAction: () => void;
  clearDocumentAction: () => void;
  collabAccessMode: "open" | "invite" | "password";
  collabAutosaveEnabled: boolean;
  collabInviteToken: string;
  collabJoinUrl: string | null;
  collabPassword: string;
  collabRoomId: string;
  collaborationConnected: boolean;
  collaborationParticipantsCount: number;
  createNewAction: () => void;
  exportHtmlAction: () => void;
  exportMarkdownAction: () => void;
  goHomeAction: () => void;
  hasActiveFile: boolean;
  hasProtectedShare: boolean;
  insertInternalLinkAction: (relativePath: string) => void;
  internalLinkTargets: string[];
  isBusy: boolean;
  isCollabBusy: boolean;
  isCollabDialogOpen: boolean;
  isCommandPaletteOpen: boolean;
  isOpenUrlDialogOpen: boolean;
  isShareBusy: boolean;
  isShareDialogOpen: boolean;
  onAccessModeChangeAction: (value: "open" | "invite" | "password") => void;
  onAutosaveEnabledChangeAction: (value: boolean) => void;
  onCollabDialogOpenChangeAction: (open: boolean) => void;
  onCollabInviteTokenChangeAction: (value: string) => void;
  onCollabPasswordChangeAction: (value: string) => void;
  onCopyCollaborationLinkAction: () => void;
  onCopyShareAction: () => void;
  onOpenRecentAction: (id: string) => void;
  onOpenUrlDialogChangeAction: (open: boolean) => void;
  onRemoveSharePasswordAction: () => void;
  onShareDialogOpenChangeAction: (open: boolean) => void;
  onSharePasswordChangeAction: (value: string) => void;
  onShareSubmitAction: () => void;
  onStartCollaborationAction: () => void;
  onStopCollaborationAction: () => void;
  openDocuments: OpenMarkdownDocument[];
  openFileAction: () => void;
  openFolderAction: () => void;
  openPendingRemoteFileAction: (fileName?: string, password?: string) => void;
  openUrlAction: (
    url: string,
    fileName?: string,
    password?: string
  ) => Promise<MarkdownOpenFromUrlActionResult>;
  pendingRemoteFiles: string[];
  pendingRemotePasswordRequired: boolean;
  recentFiles: RecentMarkdownFile[];
  refreshFileAction: () => void;
  saveFileAction: () => void;
  setActiveDocumentAction: (id: string) => void;
  setCommandPaletteOpenAction: (open: boolean) => void;
  setViewModeAction: (value: "split" | "editor" | "preview") => void;
  shareActionLabel: string;
  shareDialogSubmitLabel: string;
  shareFileAction: () => void;
  sharePassword: string;
  shareUrl: string | null;
  showOpenUrlDialogAction: () => void;
  viewMode: "split" | "editor" | "preview";
};

export const MarkdownAppDialogs = ({
  activeDocumentId,
  activeFileName,
  canSaveActiveFile,
  clearPendingRemoteOpenAction,
  clearDocumentAction,
  collabAccessMode,
  collabAutosaveEnabled,
  collabInviteToken,
  collabJoinUrl,
  collabPassword,
  collabRoomId,
  collaborationConnected,
  collaborationParticipantsCount,
  createNewAction,
  exportHtmlAction,
  exportMarkdownAction,
  goHomeAction,
  hasActiveFile,
  hasProtectedShare,
  insertInternalLinkAction,
  internalLinkTargets,
  isBusy,
  isCollabBusy,
  isCollabDialogOpen,
  isCommandPaletteOpen,
  isOpenUrlDialogOpen,
  isShareBusy,
  isShareDialogOpen,
  onAccessModeChangeAction,
  onAutosaveEnabledChangeAction,
  onCollabDialogOpenChangeAction,
  onCollabInviteTokenChangeAction,
  onCollabPasswordChangeAction,
  onCopyCollaborationLinkAction,
  onCopyShareAction,
  onOpenRecentAction,
  onOpenUrlDialogChangeAction,
  onRemoveSharePasswordAction,
  onShareDialogOpenChangeAction,
  onSharePasswordChangeAction,
  onShareSubmitAction,
  onStartCollaborationAction,
  onStopCollaborationAction,
  openDocuments,
  openFileAction,
  openFolderAction,
  openPendingRemoteFileAction,
  openUrlAction,
  pendingRemoteFiles,
  pendingRemotePasswordRequired,
  recentFiles,
  refreshFileAction,
  saveFileAction,
  setActiveDocumentAction,
  setCommandPaletteOpenAction,
  setViewModeAction,
  shareActionLabel,
  shareDialogSubmitLabel,
  shareFileAction,
  sharePassword,
  shareUrl,
  showOpenUrlDialogAction,
  viewMode,
}: MarkdownAppDialogsProps) => {
  return (
    <>
      <MarkdownRemoteSelectionDialog
        isBusy={isBusy}
        files={pendingRemoteFiles}
        openFileAction={(fileName) => {
          openPendingRemoteFileAction(fileName);
        }}
        clearRemoteSelectionAction={clearPendingRemoteOpenAction}
      />

      <MarkdownRemotePasswordDialog
        isBusy={isBusy}
        isOpen={pendingRemotePasswordRequired}
        onOpenChangeAction={(open) => {
          if (!open) {
            clearPendingRemoteOpenAction();
          }
        }}
        openProtectedFileAction={(password) => {
          openPendingRemoteFileAction(undefined, password);
        }}
      />

      <MarkdownOpenUrlDialog
        isBusy={isBusy}
        openUrlAction={openUrlAction}
        open={isOpenUrlDialogOpen}
        onOpenChangeAction={onOpenUrlDialogChangeAction}
      />

      <MarkdownShareDialog
        isBusy={isShareBusy}
        open={isShareDialogOpen}
        onOpenChangeAction={onShareDialogOpenChangeAction}
        onCopyAction={onCopyShareAction}
        onPasswordChangeAction={onSharePasswordChangeAction}
        onRemovePasswordAction={onRemoveSharePasswordAction}
        onSubmitAction={onShareSubmitAction}
        password={sharePassword}
        shareUrl={shareUrl}
        hasProtectedShare={hasProtectedShare}
        submitLabel={shareDialogSubmitLabel}
      />

      <MarkdownCollaborationDialog
        open={isCollabDialogOpen}
        isBusy={isCollabBusy}
        roomId={collabRoomId}
        accessMode={collabAccessMode}
        inviteToken={collabInviteToken}
        password={collabPassword}
        joinUrl={collabJoinUrl}
        connected={collaborationConnected}
        participantsCount={collaborationParticipantsCount}
        canEnableAutosave={canSaveActiveFile}
        autosaveEnabled={collabAutosaveEnabled}
        onOpenChangeAction={onCollabDialogOpenChangeAction}
        onAutosaveEnabledChangeAction={onAutosaveEnabledChangeAction}
        onAccessModeChangeAction={onAccessModeChangeAction}
        onInviteTokenChangeAction={onCollabInviteTokenChangeAction}
        onPasswordChangeAction={onCollabPasswordChangeAction}
        onSubmitAction={onStartCollaborationAction}
        onStopAction={onStopCollaborationAction}
        onCopyLinkAction={onCopyCollaborationLinkAction}
      />

      <MarkdownCommandPalette
        open={isCommandPaletteOpen}
        onOpenChangeAction={setCommandPaletteOpenAction}
        activeDocumentId={activeDocumentId}
        activeFileName={activeFileName}
        openDocuments={openDocuments}
        recentFiles={recentFiles}
        viewMode={viewMode}
        canSaveActiveFile={canSaveActiveFile}
        hasActiveFile={hasActiveFile}
        isBusy={isBusy || isShareBusy}
        openFileAction={openFileAction}
        openFolderAction={openFolderAction}
        openUrlDialogAction={showOpenUrlDialogAction}
        createNewAction={createNewAction}
        saveFileAction={saveFileAction}
        shareActionLabel={shareActionLabel}
        shareFileAction={shareFileAction}
        refreshFileAction={refreshFileAction}
        exportMarkdownAction={exportMarkdownAction}
        exportHtmlAction={exportHtmlAction}
        goHomeAction={goHomeAction}
        closeDocumentAction={clearDocumentAction}
        internalLinkTargets={internalLinkTargets}
        insertInternalLinkAction={insertInternalLinkAction}
        openRecentAction={onOpenRecentAction}
        setActiveDocumentAction={setActiveDocumentAction}
        setViewModeAction={setViewModeAction}
      />
    </>
  );
};
