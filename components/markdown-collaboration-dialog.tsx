"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { type CollaborativeAccessMode } from "@/types/markdown";
import { CopyIcon, UsersIcon } from "lucide-react";
import { type FormEventHandler } from "react";

type MarkdownCollaborationDialogProps = {
  open: boolean;
  isBusy: boolean;
  roomId: string;
  accessMode: CollaborativeAccessMode;
  inviteToken: string;
  password: string;
  joinUrl: string | null;
  connected: boolean;
  participantsCount: number;
  onOpenChangeAction: (open: boolean) => void;
  onAccessModeChangeAction: (value: CollaborativeAccessMode) => void;
  onInviteTokenChangeAction: (value: string) => void;
  onPasswordChangeAction: (value: string) => void;
  onSubmitAction: () => void;
  onStopAction: () => void;
  onCopyLinkAction: () => void;
};

export const MarkdownCollaborationDialog = ({
  open,
  isBusy,
  roomId,
  accessMode,
  inviteToken,
  password,
  joinUrl,
  connected,
  participantsCount,
  onOpenChangeAction,
  onAccessModeChangeAction,
  onInviteTokenChangeAction,
  onPasswordChangeAction,
  onSubmitAction,
  onStopAction,
  onCopyLinkAction,
}: MarkdownCollaborationDialogProps) => {
  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    onSubmitAction();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Collaborative editing</DialogTitle>
            <DialogDescription>
              Edit the same document in real time with multiple people.
            </DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor="collab-access-mode">Access mode</FieldLabel>
            <FieldContent>
              <NativeSelect
                id="collab-access-mode"
                value={accessMode}
                disabled={Boolean(joinUrl)}
                onChange={(event) =>
                  onAccessModeChangeAction(
                    event.target.value as CollaborativeAccessMode
                  )
                }
              >
                <option value="open">Open link</option>
                <option value="invite">Invite-only link</option>
                <option value="password">Password protected</option>
              </NativeSelect>
              <FieldDescription>
                {accessMode === "open"
                  ? "Anyone with the URL can join."
                  : accessMode === "invite"
                    ? "Only users with the invite token can join."
                    : "Users must provide the room password to join."}
              </FieldDescription>
            </FieldContent>
          </Field>

          {accessMode === "invite" ? (
            <Field>
              <FieldLabel htmlFor="collab-invite-token">Invite token</FieldLabel>
              <FieldContent>
                <Input
                  id="collab-invite-token"
                  value={inviteToken}
                  disabled={Boolean(joinUrl)}
                  onChange={(event) =>
                    onInviteTokenChangeAction(event.target.value)
                  }
                />
              </FieldContent>
            </Field>
          ) : null}

          {accessMode === "password" ? (
            <Field>
              <FieldLabel htmlFor="collab-password">Room password</FieldLabel>
              <FieldContent>
                <Input
                  id="collab-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => onPasswordChangeAction(event.target.value)}
                />
                <FieldDescription>
                  Share this password out-of-band with invited users.
                </FieldDescription>
              </FieldContent>
            </Field>
          ) : null}

          {joinUrl ? (
            <Field>
              <FieldLabel htmlFor="collab-room-link">Join URL</FieldLabel>
              <FieldContent>
                <Input id="collab-room-link" readOnly value={joinUrl} />
              </FieldContent>
            </Field>
          ) : null}

          {joinUrl ? (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <div className="flex items-center gap-2 text-foreground">
                <UsersIcon className="size-4" />
                {connected ? "Connected" : "Connecting..."} •{" "}
                {participantsCount} participant(s)
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Room: <span className="font-mono">{roomId}</span>
              </div>
            </div>
          ) : null}

          <DialogFooter className="sm:flex-wrap">
            {joinUrl ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  onClick={onCopyLinkAction}
                >
                  <CopyIcon data-icon="inline-start" />
                  Copy link
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isBusy}
                  onClick={onStopAction}
                >
                  Stop collaboration
                </Button>
              </>
            ) : (
              <Button type="submit" disabled={isBusy}>
                Start collaboration
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
