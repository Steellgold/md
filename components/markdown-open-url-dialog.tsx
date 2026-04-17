"use client";

import { LinkIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type MarkdownOpenFromUrlActionResult } from "@/types/markdown";

type MarkdownOpenUrlDialogProps = {
  isBusy: boolean;
  openUrlAction: (
    url: string,
    fileName?: string
  ) => Promise<MarkdownOpenFromUrlActionResult>;
  children?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
};

export const MarkdownOpenUrlDialog = ({
  isBusy,
  openUrlAction,
  children,
  onOpenChange,
  open: controlledOpen,
}: MarkdownOpenUrlDialogProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const [url, setUrl] = React.useState("");
  const [fileOptions, setFileOptions] = React.useState<string[]>([]);
  const [selectedFileName, setSelectedFileName] = React.useState("");
  const open = controlledOpen ?? uncontrolledOpen;

  const resetState = () => {
    setUrl("");
    setFileOptions([]);
    setSelectedFileName("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(nextOpen);
    }

    onOpenChange?.(nextOpen);

    if (!nextOpen) {
      resetState();
    }
  };

  const handleSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) => {
    event.preventDefault();

    const result = await openUrlAction(url, selectedFileName || undefined);

    if (result.status === "selection-required") {
      setFileOptions(result.files);
      setSelectedFileName((current) =>
        result.files.includes(current) ? current : (result.files[0] ?? "")
      );
      return;
    }

    if (result.status === "error") {
      return;
    }

    resetState();
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children ? (
        <DialogTrigger asChild>{children}</DialogTrigger>
      ) : controlledOpen === undefined ? (
        <DialogTrigger asChild>
          <Button variant="outline" disabled={isBusy}>
            <LinkIcon data-icon="inline-start" />
            Open URL
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Open from URL</DialogTitle>
            <DialogDescription>
              Paste a GitHub blob URL, a Gist link, or any direct Markdown/text
              file URL.
            </DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor="markdown-open-url">Document URL</FieldLabel>
            <FieldContent>
              <Input
                id="markdown-open-url"
                type="url"
                autoFocus
                autoComplete="off"
                placeholder="https://github.com/owner/repo/blob/main/README.md"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                  setFileOptions([]);
                  setSelectedFileName("");
                }}
                disabled={isBusy}
              />
            </FieldContent>
          </Field>

          {fileOptions.length > 0 ? (
            <Field>
              <FieldLabel htmlFor="markdown-open-url-file">File to open</FieldLabel>
              <FieldContent>
                <Select value={selectedFileName} onValueChange={setSelectedFileName}>
                  <SelectTrigger id="markdown-open-url-file" className="w-full">
                    <SelectValue placeholder="Select a file" />
                  </SelectTrigger>
                  <SelectContent>
                    {fileOptions.map((fileName) => (
                      <SelectItem key={fileName} value={fileName}>
                        {fileName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  This Gist contains multiple files. Choose which one should be
                  opened in the editor.
                </FieldDescription>
              </FieldContent>
            </Field>
          ) : null}

          <DialogFooter>
            <Button
              type="submit"
              disabled={
                isBusy ||
                url.trim() === "" ||
                (fileOptions.length > 0 && selectedFileName === "")
              }
            >
              {fileOptions.length > 0 ? "Open selected file" : "Open URL"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
