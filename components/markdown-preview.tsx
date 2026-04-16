"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type MarkdownPreviewProps = {
  content: string;
  className?: string;
};

const codeBlockThemes: Record<string, string> = {
  js: "border-amber-300/60 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-950/20",
  javascript:
    "border-amber-300/60 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-950/20",
  ts: "border-sky-300/60 bg-sky-50/80 dark:border-sky-500/30 dark:bg-sky-950/20",
  typescript:
    "border-sky-300/60 bg-sky-50/80 dark:border-sky-500/30 dark:bg-sky-950/20",
  jsx: "border-cyan-300/60 bg-cyan-50/80 dark:border-cyan-500/30 dark:bg-cyan-950/20",
  tsx: "border-blue-300/60 bg-blue-50/80 dark:border-blue-500/30 dark:bg-blue-950/20",
  json: "border-emerald-300/60 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-950/20",
  bash: "border-lime-300/60 bg-lime-50/80 dark:border-lime-500/30 dark:bg-lime-950/20",
  sh: "border-lime-300/60 bg-lime-50/80 dark:border-lime-500/30 dark:bg-lime-950/20",
  css: "border-fuchsia-300/60 bg-fuchsia-50/80 dark:border-fuchsia-500/30 dark:bg-fuchsia-950/20",
  html: "border-orange-300/60 bg-orange-50/80 dark:border-orange-500/30 dark:bg-orange-950/20",
  md: "border-zinc-300/60 bg-zinc-50/80 dark:border-zinc-500/30 dark:bg-zinc-900/40",
};

const getCodeLanguage = (className?: string) => {
  const match = /language-([\w-]+)/u.exec(className ?? "");
  return match?.[1]?.toLowerCase() ?? null;
};

const getCodeThemeClassName = (language: string | null) =>
  (language && codeBlockThemes[language]) ||
  "border-border bg-muted/50 dark:bg-muted/20";

export const MarkdownPreview = ({
  content,
  className,
}: MarkdownPreviewProps) => {
  return (
    <div
      className={cn(
        "min-h-full px-6 py-5 text-sm leading-7 wrap-break-word [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold [&_hr]:my-6 [&_hr]:border-border [&_img]:rounded-lg [&_img]:border [&_img]:border-border [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p]:mb-4 [&_table]:mb-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left [&_ul]:list-disc [&_ul]:space-y-1",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const language = getCodeLanguage(className);
            const code = String(children).replace(/\n$/u, "");
            const isCodeBlock = Boolean(language) || code.includes("\n");

            if (!isCodeBlock) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }

            return (
              <div
                className={cn(
                  "mb-4 overflow-hidden rounded-xl border",
                  getCodeThemeClassName(language)
                )}
              >
                <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
                  <Badge variant="outline" className="bg-background/70 uppercase">
                    {language ?? "code"}
                  </Badge>
                </div>
                <pre className="overflow-x-auto p-4">
                  <code className={cn(className, "bg-transparent p-0")} {...props}>
                    {code}
                  </code>
                </pre>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
