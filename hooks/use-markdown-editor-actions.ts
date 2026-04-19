"use client";

import {
  insertBlockAction,
  insertMarkdownLinkAction,
  insertMarkdownTableAction,
  prefixLinesAction,
  wrapSelectionAction,
} from "@/lib/markdown-editor";
import {
  buildMarkdownExportFileName,
  buildMarkdownExportHtml,
  downloadTextFile,
} from "@/lib/markdown-export";
import {
  buildRelativeWorkspaceLink,
  resolveWorkspaceRelativePath,
} from "@/lib/parsing/workspace-links";
import { useCallback, type RefObject } from "react";
import { toast } from "sonner";

type UseMarkdownEditorActionsParams = {
  activeFile: {
    name: string;
    relativePath?: string | null;
  } | null;
  editorRef: RefObject<HTMLTextAreaElement | null>;
  flushPendingEditorContentAction: () => string;
  onErrorAction: (message: string) => void;
  openWorkspacePageByPathAction: (relativePath: string) => Promise<boolean>;
  workspacePresent: boolean;
};

export const useMarkdownEditorActions = ({
  activeFile,
  editorRef,
  flushPendingEditorContentAction,
  onErrorAction,
  openWorkspacePageByPathAction,
  workspacePresent,
}: UseMarkdownEditorActionsParams) => {
  const boldAction = useCallback(() => {
    wrapSelectionAction(editorRef.current, "**", "**", "bold text");
  }, [editorRef]);

  const italicAction = useCallback(() => {
    wrapSelectionAction(editorRef.current, "_", "_", "italic text");
  }, [editorRef]);

  const headingAction = useCallback(
    (level: 1 | 2 | 3 | 4 | 5 | 6) => {
      insertBlockAction(
        editorRef.current,
        `${"#".repeat(level)} `,
        "",
        "Heading"
      );
    },
    [editorRef]
  );

  const inlineCodeAction = useCallback(() => {
    wrapSelectionAction(editorRef.current, "`", "`", "inline code");
  }, [editorRef]);

  const codeBlockAction = useCallback(() => {
    insertBlockAction(editorRef.current, "```md\n", "\n```", "code block");
  }, [editorRef]);

  const bulletListAction = useCallback(() => {
    prefixLinesAction(editorRef.current, "- ", "List item");
  }, [editorRef]);

  const orderedListAction = useCallback(() => {
    prefixLinesAction(
      editorRef.current,
      (index) => `${index + 1}. `,
      "List item"
    );
  }, [editorRef]);

  const alphaListAction = useCallback(() => {
    prefixLinesAction(
      editorRef.current,
      (index) => {
        let value = index;
        let label = "";

        do {
          label = String.fromCharCode(97 + (value % 26)) + label;
          value = Math.floor(value / 26) - 1;
        } while (value >= 0);

        return `${label}. `;
      },
      "List item"
    );
  }, [editorRef]);

  const taskListAction = useCallback(() => {
    prefixLinesAction(editorRef.current, "- [ ] ", "Task item");
  }, [editorRef]);

  const insertTableAction = useCallback(
    (columns: number, rows: number) => {
      insertMarkdownTableAction(editorRef.current, columns, rows);
    },
    [editorRef]
  );

  const insertInternalLinkToPathAction = useCallback(
    (targetPath: string) => {
      if (!activeFile?.relativePath) {
        return;
      }

      const relativeLink = buildRelativeWorkspaceLink(
        activeFile.relativePath,
        targetPath
      );

      if (!relativeLink) {
        onErrorAction("Unable to build a relative link for this page.");
        return;
      }

      const encodedRelativeLink = encodeURI(relativeLink);
      const defaultLabel = targetPath
        .split("/")
        .at(-1)
        ?.replace(/\.md$/iu, "")
        ?.trim();

      insertMarkdownLinkAction(
        editorRef.current,
        encodedRelativeLink,
        defaultLabel && defaultLabel.length > 0 ? defaultLabel : "page"
      );
    },
    [activeFile, editorRef, onErrorAction]
  );

  const insertExternalLinkAction = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const inputValue = window.prompt(
      "Enter the external URL to insert:",
      "https://"
    );

    if (inputValue === null) {
      return;
    }

    const trimmedValue = inputValue.trim();

    if (!trimmedValue) {
      return;
    }

    const href = /^[a-z][a-z\\d+.-]*:/iu.test(trimmedValue)
      ? trimmedValue
      : `https://${trimmedValue.replace(/^\/+/u, "")}`;

    insertMarkdownLinkAction(editorRef.current, href, "link");
  }, [editorRef]);

  const openInternalPreviewLinkAction = useCallback(
    (href: string) => {
      if (!workspacePresent || !activeFile?.relativePath) {
        return;
      }

      flushPendingEditorContentAction();

      const targetPath = resolveWorkspaceRelativePath(
        activeFile.relativePath,
        href
      );

      if (!targetPath) {
        onErrorAction("This internal link could not be resolved.");
        return;
      }

      void openWorkspacePageByPathAction(targetPath).then((opened) => {
        if (!opened) {
          toast.error(`No page found for "${targetPath}".`);
        }
      });
    },
    [
      activeFile,
      flushPendingEditorContentAction,
      onErrorAction,
      openWorkspacePageByPathAction,
      workspacePresent,
    ]
  );

  const exportMarkdownFile = useCallback(() => {
    if (!activeFile) {
      return;
    }

    const nextContent = flushPendingEditorContentAction();

    downloadTextFile(
      buildMarkdownExportFileName(activeFile.name, "md"),
      nextContent,
      "text/markdown;charset=utf-8"
    );
  }, [activeFile, flushPendingEditorContentAction]);

  const exportHtmlFile = useCallback(() => {
    if (!activeFile) {
      return;
    }

    const nextContent = flushPendingEditorContentAction();

    downloadTextFile(
      buildMarkdownExportFileName(activeFile.name, "html"),
      buildMarkdownExportHtml(activeFile.name, nextContent),
      "text/html;charset=utf-8"
    );
  }, [activeFile, flushPendingEditorContentAction]);

  return {
    alphaListAction,
    boldAction,
    bulletListAction,
    codeBlockAction,
    exportHtmlFile,
    exportMarkdownFile,
    headingAction,
    inlineCodeAction,
    insertExternalLinkAction,
    insertInternalLinkToPathAction,
    insertTableAction,
    italicAction,
    openInternalPreviewLinkAction,
    orderedListAction,
    taskListAction,
  };
};
