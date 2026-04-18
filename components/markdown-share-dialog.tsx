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
import { CopyIcon, LinkIcon, LockIcon, LockOpenIcon } from "lucide-react";
import type { FormEventHandler } from "react";

type MarkdownShareDialogProps = {
  hasProtectedShare: boolean;
  isBusy: boolean;
  onCopyAction: () => void;
  onOpenChangeAction: (open: boolean) => void;
  onPasswordChangeAction: (value: string) => void;
  onRemovePasswordAction: () => void;
  onSubmitAction: () => void;
  open: boolean;
  password: string;
  shareUrl: string | null;
  submitLabel: string;
};

export const MarkdownShareDialog = ({
  hasProtectedShare,
  isBusy,
  onCopyAction,
  onOpenChangeAction,
  onPasswordChangeAction,
  onRemovePasswordAction,
  onSubmitAction,
  open,
  password,
  shareUrl,
  submitLabel,
}: MarkdownShareDialogProps) => {
  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    onSubmitAction();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent>
        <form className="grid min-w-0 gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Share read-only link</DialogTitle>
            <DialogDescription>
              Publish the current Markdown snapshot to Cloudflare and optionally
              protect it with a password.
            </DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor="markdown-share-password">
              Password protection
            </FieldLabel>
            <FieldContent>
              <Input
                id="markdown-share-password"
                type="password"
                autoComplete="new-password"
                placeholder={
                  hasProtectedShare
                    ? "Enter a new password to replace the current one"
                    : "Optional"
                }
                value={password}
                onChange={(event) => onPasswordChangeAction(event.target.value)}
                disabled={isBusy}
              />
              <FieldDescription>
                {hasProtectedShare
                  ? "Leave blank to keep the current password, or remove protection explicitly below."
                  : "Leave blank to keep the shared link accessible without a password."}
              </FieldDescription>
            </FieldContent>
          </Field>

          {shareUrl ? (
            <Field>
              <FieldLabel htmlFor="markdown-share-url">Shared link</FieldLabel>
              <FieldContent>
                <Input
                  id="markdown-share-url"
                  readOnly
                  value={shareUrl}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </FieldContent>
            </Field>
          ) : null}

          <DialogFooter className="sm:flex-wrap">
            {hasProtectedShare ? (
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                onClick={onRemovePasswordAction}
              >
                <LockOpenIcon data-icon="inline-start" />
                Remove password
              </Button>
            ) : null}

            <Button type="submit" disabled={isBusy}>
              <LockIcon data-icon="inline-start" />
              {submitLabel}
            </Button>

            {shareUrl ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  onClick={onCopyAction}
                >
                  <CopyIcon data-icon="inline-start" />
                  Copy link
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    window.open(shareUrl, "_blank", "noopener,noreferrer");
                  }}
                >
                  <LinkIcon data-icon="inline-start" />
                  Open link
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
