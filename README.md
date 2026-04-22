# MD [![Open this file](./public/open-this.svg)](https://better-md.vercel.app/open/https:%2F%2Fraw.githubusercontent.com%2FSteellgold%2Fmd%2Fstable%2FREADME.md)

MD is a focused Markdown editor built with Next.js. It is designed for fast writing and previewing, with support for local files, remote sources, and read-only sharing flows.

## Highlights

- Fast local Markdown editing with live preview
- Drag-and-drop import, including multiple files at once
- Remote open from GitHub, Gist, and direct markdown/text URLs
- Read-only remote documents for safer external content handling
- Persistent editor preferences and recent files history
- Optional protected sharing via a dedicated Cloudflare service
- Real-time collaborative rooms backed by Durable Objects and WebSockets

## Core Features

### Editor Experience

- Split, editor-only, and preview-only layouts
- Syntax-highlighted Markdown preview
- Multi-file import picker when several files are dropped/opened
- Stored UI preferences (view mode, sync behavior, etc.)

### File Sources

- Local files through the File System Access API
- Drag-and-drop local imports
- Remote files from:
  - GitHub file URLs
  - Gist URLs (with file selection for multi-file gists)
  - Direct `.md` / plain text links

### Sharing and Collaboration

- Read-only share links via external Cloudflare Worker API
- Optional password gate for shared documents
- Collaborative rooms with access modes (open link, invite token, password)

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui
- Zustand
- react-markdown + remark-gfm + rehype-highlight
- Cloudflare Workers + Durable Objects + R2 + KV

## Quick Start

1. Install dependencies:

```bash
pnpm install
```

2. Start the app in development mode:

```bash
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
pnpm share:dev
pnpm share:deploy
```

## Environment Variables

Create `.env.local` from `.env.example` and set:

```bash
NEXT_PUBLIC_APP_URL=https://your-domain.com
SHARE_API_BASE_URL=https://share.example.com
SHARE_API_TOKEN=replace-me-if-you-protect-the-worker-write-api
```

- `NEXT_PUBLIC_APP_URL`: absolute app URL used for generated links
- `SHARE_API_BASE_URL`: base URL of the Cloudflare share service
- `SHARE_API_TOKEN`: optional token to protect write operations on share API

Cloudflare worker config lives in [`cloudflare-share/`](./cloudflare-share).

## Project Layout

```text
app/
  api/open-from-url/    Remote markdown resolution and fetch
  api/share/            Proxy to the external Cloudflare share service
  api/collab/           Proxy to collaborative room create/join endpoints
components/
  markdown-*.tsx        Editor, preview, toolbar, dialogs, recents
cloudflare-share/
  src/index.ts          Worker for share create/read + collaborative rooms
lib/
  markdown-*.ts         File access, state helpers, editor helpers
types/
  *.ts / *.d.ts         App and integration types
public/
  Static assets (icons, social visuals, open-this badge)
```

## Deployment

### Next.js App (Vercel)

```bash
pnpm build
```

### Share Service (Cloudflare Workers)

```bash
pnpm share:deploy
```

Required Cloudflare resources:

- 1 Workers KV namespace
- 1 R2 bucket
- 1 Durable Object namespace (`COLLAB_ROOMS`)
- `SHARE_PASSWORD_PEPPER` secret
- Optional `SHARE_API_TOKEN` secret for protected write endpoints

## Operational Notes

- Local file reopen depends on browser support for File System Access API.
- Remote URLs are validated server-side; local/private network addresses are blocked.
- Remote and shared documents are intentionally opened as read-only.
- Shared links can require a password before content is resolved.
