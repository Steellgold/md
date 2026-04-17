# MD

[![Open this file](./public/open-this-file.svg)](https://better-md.vercel.app/open/https://raw.githubusercontent.com/Steellgold/md/stable/README.md)

Focused Markdown editor built with Next.js.

MD lets you write, preview, reopen, and import Markdown files quickly from local storage or remote URLs such as GitHub and Gist.

## Features

- Local Markdown file opening through the File System Access API
- Drag and drop support, including multi-file imports
- Import selection dialog when multiple files are opened at once
- Live Markdown preview with syntax highlighting
- Split, editor-only, and preview-only views
- Persistent user settings with Zustand
- Recent files history with clear confirmation
- Remote opening from:
  - GitHub file URLs
  - Gist URLs, including multi-file gist selection
  - direct text or markdown URLs
- Read-only handling for remote files

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui
- Zustand
- react-markdown
- react-syntax-highlighter

## Getting Started

Install dependencies with Bun or pnpm:

```bash
bun install
```

or

```bash
pnpm install
```

Start the development server:

```bash
bun dev
```

Open `http://localhost:3000`.

## Scripts

```bash
bun dev
bun build
bun start
bun lint
bun typecheck
```

## Environment

Optional:

```bash
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Use this if you want absolute metadata URLs for Open Graph and Twitter cards in production.

## Notes

- Local file reopening depends on browser support for the File System Access API.
- Remote URLs are validated server-side and local or private network addresses are blocked.
- Remote documents can be opened and reloaded, but they are intentionally read-only.
- UI preferences such as split view and sync scroll are persisted in local storage.

## Project Structure

```text
app/
  api/open-from-url/    Remote markdown resolution and download
components/
  markdown-*.tsx        Editor, preview, toolbar, dialogs, recents
lib/
  markdown-*.ts         File access, state helpers, editor helpers
types/
  *.ts / *.d.ts         App and integration types
public/
  banner and favicons
```

## Deployment

Vercel works out of the box for the app itself.

If metadata previews should be fully correct in production, set `NEXT_PUBLIC_APP_URL` in the Vercel project environment variables.
