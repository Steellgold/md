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
import { RefreshCcwIcon } from "lucide-react";

type MarkdownToolbarProfileDialogProps = {
  displayName: string;
  onDisplayNameChangeAction: (value: string) => void;
  onGenerateDisplayNameAction: () => void;
  onOpenChangeAction: (open: boolean) => void;
  open: boolean;
};

export const MarkdownToolbarProfileDialog = ({
  displayName,
  onDisplayNameChangeAction,
  onGenerateDisplayNameAction,
  onOpenChangeAction,
  open,
}: MarkdownToolbarProfileDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
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
                onChange={(event) => onDisplayNameChangeAction(event.target.value)}
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
            <FieldDescription>This name is saved locally.</FieldDescription>
          </FieldContent>
        </Field>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChangeAction(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
