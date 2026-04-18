import ReactMarkdown from "react-markdown";
import { renderToStaticMarkup } from "react-dom/server";
import { remarkAlphaOrderedLists } from "@/lib/remark-alpha-ordered-lists";
import remarkGfm from "remark-gfm";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const buildHtmlDocument = (title: string, body: string) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: light dark;
      }

      body {
        margin: 0;
        font-family:
          Geist, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
          "Segoe UI", sans-serif;
        background: #ffffff;
        color: #111827;
      }

      main {
        max-width: 860px;
        margin: 0 auto;
        padding: 48px 24px 80px;
      }

      article {
        line-height: 1.7;
        font-size: 15px;
      }

      h1,
      h2,
      h3,
      h4,
      h5,
      h6 {
        line-height: 1.2;
        margin-top: 1.8em;
        margin-bottom: 0.6em;
      }

      h1 {
        font-size: 2.3rem;
      }

      h2 {
        font-size: 1.8rem;
      }

      h3 {
        font-size: 1.35rem;
      }

      p,
      ul,
      ol,
      blockquote,
      table,
      pre {
        margin: 0 0 1rem;
      }

      a {
        color: #2563eb;
      }

      code {
        font-family:
          Geist Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        background: rgba(148, 163, 184, 0.16);
        border-radius: 6px;
        padding: 0.15rem 0.35rem;
      }

      pre {
        overflow: auto;
        padding: 1rem;
        border: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 14px;
        background: rgba(148, 163, 184, 0.1);
      }

      pre code {
        background: transparent;
        padding: 0;
      }

      blockquote {
        border-left: 3px solid rgba(148, 163, 184, 0.5);
        padding-left: 1rem;
        color: #475569;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        border: 1px solid rgba(148, 163, 184, 0.35);
        padding: 0.6rem 0.75rem;
        text-align: left;
      }

      img {
        max-width: 100%;
        height: auto;
        border-radius: 12px;
      }

      @media (prefers-color-scheme: dark) {
        body {
          background: #09090b;
          color: #f4f4f5;
        }

        a {
          color: #60a5fa;
        }

        code {
          background: rgba(63, 63, 70, 0.8);
        }

        pre {
          border-color: rgba(82, 82, 91, 0.9);
          background: rgba(39, 39, 42, 0.9);
        }

        blockquote {
          color: #d4d4d8;
        }

        th,
        td {
          border-color: rgba(82, 82, 91, 0.9);
        }
      }
    </style>
  </head>
  <body>
    <main>
      <article>${body}</article>
    </main>
  </body>
</html>
`;

export const buildMarkdownExportFileName = (
  fileName: string | undefined,
  extension: "md" | "html"
) => {
  const safeName = (fileName?.trim() || "untitled").replace(/\.[^.]+$/u, "");
  return `${safeName}.${extension}`;
};

export const buildMarkdownExportHtml = (title: string, content: string) => {
  const body = renderToStaticMarkup(
    <ReactMarkdown remarkPlugins={[remarkAlphaOrderedLists, remarkGfm]}>
      {content}
    </ReactMarkdown>
  );

  return buildHtmlDocument(title, body);
};

export const downloadTextFile = (
  fileName: string,
  content: string,
  mimeType: string
) => {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 0);
};
