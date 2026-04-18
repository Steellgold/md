# MD [![Open this file](./public/open-this.svg)](https://better-md.vercel.app/open/https:%2F%2Fraw.githubusercontent.com%2FSteellgold%2Fmd%2Fstable%2FREADME.md)

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
- Read-only sharing via a dedicated Cloudflare Worker
- Optional password protection for shared links
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
- Cloudflare Worker + R2 + KV for sharing

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
bun run share:dev
bun run share:deploy
```

## Environment

Vercel / Next.js app:

```bash
NEXT_PUBLIC_APP_URL=https://your-domain.com
SHARE_API_BASE_URL=https://share.example.com
SHARE_API_TOKEN=replace-me-if-you-protect-the-worker-write-api
```

Use `NEXT_PUBLIC_APP_URL` for absolute links and `SHARE_API_BASE_URL` for the
standalone Cloudflare share service.

The Cloudflare worker has its own config under [`cloudflare-share/`](./cloudflare-share).

Copy `.env.example` to `.env.local` for local development.

## Notes

- Local file reopening depends on browser support for the File System Access API.
- Remote URLs are validated server-side and local or private network addresses are blocked.
- Remote documents can be opened and reloaded, but they are intentionally read-only.
- Shared documents open through the existing remote URL flow and remain read-only.
- Shared documents can optionally require a password before the app opens them.
- UI preferences such as split view and sync scroll are persisted in local storage.

## Project Structure

```text
app/
  api/open-from-url/    Remote markdown resolution and download
  api/share/            Proxy to the external Cloudflare share service
components/
  markdown-*.tsx        Editor, preview, toolbar, dialogs, recents
cloudflare-share/
  src/index.ts          Standalone Worker for share create/read
lib/
  markdown-*.ts         File access, state helpers, editor helpers
types/
  *.ts / *.d.ts         App and integration types
public/
  banner and favicons
```

## Deployment

Deploy the Next.js app to Vercel as usual.

```bash
bun build
```

Deploy the share service separately to Cloudflare:

```bash
bun run share:deploy
```

The worker needs:

- one Workers KV namespace
- one R2 bucket
- `SHARE_PASSWORD_PEPPER` secret
- optionally `SHARE_API_TOKEN` if you want the write API locked down
