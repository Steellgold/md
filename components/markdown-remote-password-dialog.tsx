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
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormEvent, useState } from "react";

type MarkdownRemotePasswordDialogProps = {
  isBusy: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  openProtectedFileAction: (password: string) => void;
};

export const MarkdownRemotePasswordDialog = ({
  isBusy,
  isOpen,
  onOpenChange,
  openProtectedFileAction,
}: MarkdownRemotePasswordDialogProps) => {
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    openProtectedFileAction(password);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setPassword("");
    }

    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Password required</DialogTitle>
            <DialogDescription>
              This shared Markdown link is protected. Enter the password to open
              it in read-only mode.
            </DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor="markdown-remote-password">Password</FieldLabel>
            <FieldContent>
              <Input
                id="markdown-remote-password"
                type="password"
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isBusy}
              />
            </FieldContent>
          </Field>

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={isBusy || password.trim() === ""}>
              Open protected link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
