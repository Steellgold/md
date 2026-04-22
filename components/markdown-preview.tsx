"use client";

import { rehypeMarkdownViewerSelection } from "@/lib/markdown-viewer-selection";
import { remarkAlphaOrderedLists } from "@/lib/remark-alpha-ordered-lists";
import { isInternalMarkdownLink } from "@/lib/parsing/workspace-links";
import { cn } from "@/lib/utils";
import { type MarkdownViewerSelection } from "@/types/markdown-viewer-selection";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { type PluggableList } from "unified";

type MarkdownPreviewProps = {
  content: string;
  editorSelection: MarkdownViewerSelection | null;
  onOpenInternalLinkAction?: (href: string) => void;
  className?: string;
};

const languageAliases: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  md: "markdown",
  yml: "yaml",
};

const getCodeLanguage = (className?: string) => {
  const match = /language-([\w-]+)/u.exec(className ?? "");
  const language = match?.[1]?.toLowerCase();

  if (!language) {
    return null;
  }

  return languageAliases[language] ?? language;
};

const MAX_SELECTION_HIGHLIGHT_CONTENT_LENGTH = 20_000;

export const MarkdownPreview = ({
  content,
  editorSelection,
  onOpenInternalLinkAction,
  className,
}: MarkdownPreviewProps) => {
  const { resolvedTheme } = useTheme();
  const syntaxTheme = resolvedTheme === "dark" ? oneDark : oneLight;
  const shouldHighlightSelection =
    content.length <= MAX_SELECTION_HIGHLIGHT_CONTENT_LENGTH;
  const remarkPlugins = useMemo<PluggableList>(
    () => [remarkAlphaOrderedLists, remarkGfm],
    []
  );

  const rehypePlugins = useMemo<PluggableList>(
    () =>
      shouldHighlightSelection && editorSelection
        ? [[rehypeMarkdownViewerSelection, editorSelection]]
        : [],
    [editorSelection, shouldHighlightSelection]
  );

  return (
    <div
      className={cn(
        // Root: layout and body text (flex + gap so lists, hr, etc. don’t stack flush)
        "markdown-preview flex min-h-full flex-col gap-4 px-6 py-5 text-sm leading-7 wrap-break-word",

        // Synced selection from the editor (caret + range)
        "[&_.md-viewer-caret]:mx-px [&_.md-viewer-caret]:inline-block [&_.md-viewer-caret]:h-[1em] [&_.md-viewer-caret]:w-[2px] [&_.md-viewer-caret]:rounded-full [&_.md-viewer-caret]:bg-primary [&_.md-viewer-caret]:align-[-0.1em]",
        "[&_.md-viewer-selection]:rounded-md [&_.md-viewer-selection]:bg-primary/10 [&_.md-viewer-selection]:underline [&_.md-viewer-selection]:decoration-primary/70 [&_.md-viewer-selection]:decoration-[3px] [&_.md-viewer-selection]:underline-offset-[0.22em]",

        // Inline elements
        "[&_a]:text-primary [&_a]:underline",
        "[&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5",

        // Block content
        "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
        "[&_hr]:shrink-0 [&_hr]:border-border",

        // Headings
        "[&_h1]:text-3xl [&_h1]:font-semibold",
        "[&_h2]:text-2xl [&_h2]:font-semibold",
        "[&_h3]:text-xl [&_h3]:font-semibold",

        // Media
        "[&_img]:rounded-lg [&_img]:border [&_img]:border-border",

        // Lists (only task li lose markers; mixed ul+task stays one list in mdast)
        "[&_ol]:list-decimal [&_ol[type='a']]:list-[lower-alpha] [&_ol[type='A']]:list-[upper-alpha] [&_ol]:space-y-1 [&_ol]:pl-5",
        "[&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5",
        "[&_.task-list-item]:list-none",
        "[&_.task-list-item_input]:mr-2 [&_.task-list-item_input]:shrink-0",

        // Tables (GFM)
        "[&_table]:w-full [&_table]:border-collapse",
        "[&_td]:border [&_td]:border-border [&_td]:p-2",
        "[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left",

        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
          a({ href, children, node, ...props }) {
            void node;
            const resolvedHref = href ?? "";
            const canOpenInternally =
              Boolean(onOpenInternalLinkAction) &&
              isInternalMarkdownLink(resolvedHref);

            if (!canOpenInternally) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  {...props}
                >
                  {children}
                </a>
              );
            }

            return (
              <a
                href={href}
                onClick={(event) => {
                  event.preventDefault();
                  onOpenInternalLinkAction?.(resolvedHref);
                }}
                {...props}
              >
                {children}
              </a>
            );
          },
          pre({ children }) {
            return <>{children}</>;
          },
          code({ className, children, ...props }) {
            const language = getCodeLanguage(className);
            const code = String(children).replace(/\n$/u, "");
            const isBlock = Boolean(language) || code.includes("\n");

            if (!isBlock) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }

            return (
              <SyntaxHighlighter
                language={language ?? "text"}
                style={syntaxTheme}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--border)",
                  background: "color-mix(in oklab, var(--muted) 35%, transparent)",
                  overflowX: "auto",
                }}
                codeTagProps={{
                  style: {
                    background: "transparent",
                    padding: "0",
                    borderRadius: "0",
                    fontSize: "0.875rem",
                    fontFamily: "var(--font-mono, monospace)",
                  },
                }}
              >
                {code}
              </SyntaxHighlighter>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
