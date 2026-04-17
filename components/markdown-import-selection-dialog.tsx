"use client";


import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type PendingMarkdownImport } from "@/types/markdown";
import { FileStackIcon } from "lucide-react";

type MarkdownImportSelectionDialogProps = {
  pendingImports: PendingMarkdownImport[];
  openImportAction: (id: string) => void;
  clearPendingImportsAction: () => void;
};

export const MarkdownImportSelectionDialog = ({
  pendingImports,
  openImportAction,
  clearPendingImportsAction,
}: MarkdownImportSelectionDialogProps) => {
  const isOpen = pendingImports.length > 1;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      clearPendingImportsAction();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose a Markdown file to open</DialogTitle>
          <DialogDescription>
            {pendingImports.length} files were imported. Pick the one that should
            open in the editor now.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {pendingImports.map((pendingImport) => (
            <Button
              key={pendingImport.entry.id}
              variant="outline"
              className="h-auto justify-start px-3 py-3 text-left"
              onClick={() => openImportAction(pendingImport.entry.id)}
            >
              <FileStackIcon data-icon="inline-start" />
              <span className="truncate">{pendingImport.entry.name}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
