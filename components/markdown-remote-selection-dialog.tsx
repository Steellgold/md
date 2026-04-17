"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LinkIcon } from "lucide-react";

type MarkdownRemoteSelectionDialogProps = {
  isBusy: boolean;
  files: string[];
  openFileAction: (fileName: string) => void;
  clearRemoteSelectionAction: () => void;
};

export const MarkdownRemoteSelectionDialog = ({
  isBusy,
  files,
  openFileAction,
  clearRemoteSelectionAction,
}: MarkdownRemoteSelectionDialogProps) => {
  const isOpen = files.length > 0;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      clearRemoteSelectionAction();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose a remote file to open</DialogTitle>
          <DialogDescription>
            This Gist contains multiple files. Pick the one that should open in
            the editor now.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {files.map((fileName) => (
            <Button
              key={fileName}
              variant="outline"
              className="h-auto justify-start px-3 py-3 text-left"
              onClick={() => openFileAction(fileName)}
              disabled={isBusy}
            >
              <LinkIcon data-icon="inline-start" />
              <span className="truncate">{fileName}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
