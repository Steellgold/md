"use client";


import { rehypeMarkdownViewerSelection } from "@/lib/markdown-viewer-selection";
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

export const MarkdownPreview = ({
  content,
  editorSelection,
  className,
}: MarkdownPreviewProps) => {
  const { resolvedTheme } = useTheme();
  const syntaxTheme = resolvedTheme === "dark" ? oneDark : oneLight;
  const rehypePlugins = useMemo<PluggableList>(
    () =>
      editorSelection ? [[rehypeMarkdownViewerSelection, editorSelection]] : [],
    [editorSelection]
  );

  return (
    <div
      className={cn(
        "markdown-preview min-h-full px-6 py-5 text-sm leading-7 wrap-break-word [&_.md-viewer-caret]:mx-px [&_.md-viewer-caret]:inline-block [&_.md-viewer-caret]:h-[1em] [&_.md-viewer-caret]:w-[2px] [&_.md-viewer-caret]:rounded-full [&_.md-viewer-caret]:bg-primary [&_.md-viewer-caret]:align-[-0.1em] [&_.md-viewer-selection]:rounded-md [&_.md-viewer-selection]:bg-primary/10 [&_.md-viewer-selection]:underline [&_.md-viewer-selection]:decoration-primary/70 [&_.md-viewer-selection]:decoration-[3px] [&_.md-viewer-selection]:underline-offset-[0.22em] [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold [&_hr]:my-6 [&_hr]:border-border [&_img]:rounded-lg [&_img]:border [&_img]:border-border [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p]:mb-4 [&_table]:mb-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left [&_ul]:list-disc [&_ul]:space-y-1",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={rehypePlugins}
        components={{
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
                  margin: "0 0 1rem 0",
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
