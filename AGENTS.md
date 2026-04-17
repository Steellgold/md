# Repository Guidelines

## Project Structure & Module Organization
This repository is a Next.js 16 App Router app for editing and previewing Markdown. Keep route files in `app/`, including the remote-open API in `app/api/open-from-url/`. Put feature components in `components/`, shared shadcn primitives in `components/ui/`, reusable hooks in `hooks/`, and Markdown/file-state helpers in `lib/`. Shared TypeScript types live in `types/`, and static assets such as icons and social images live in `public/`.

## Build, Test, and Development Commands
Use Bun first in this repo because `bun.lock` is committed. `pnpm` is acceptable if Bun is unavailable.

- `bun dev`: start the local dev server with Turbopack.
- `bun build`: create the production build.
- `bun start`: run the production build locally.
- `bun lint`: run ESLint across the project.
- `bun typecheck`: run `tsc --noEmit`.
- `bun run format`: format `*.ts` and `*.tsx` with Prettier.

## Coding Style & Naming Conventions
The codebase uses TypeScript, React 19, Tailwind CSS 4, ESLint, and Prettier. Follow the existing formatter rules: 2-space indentation, 80-character line width, semicolons, double quotes, and trailing commas where valid. Keep component and hook logic functional and typed. Use kebab-case for filenames like `markdown-preview-panel.tsx`, PascalCase for exported components and types, and `use...` prefixes for hooks.

## Testing Guidelines
There is no dedicated automated test suite yet. Before opening a PR, run `bun lint` and `bun typecheck`, then manually verify the main flows: local file open/save, drag-and-drop import, remote URL open, and editor/preview layout switching. If you add tests, prefer `*.test.ts` or `*.test.tsx` near the feature they cover.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commit style, often with scopes, for example `feat(preview): add detach preview button` or `refactor: reorganize imports`. Keep commit subjects imperative and focused on one change. Pull requests should include a short summary, validation steps, linked issues when relevant, and screenshots or short recordings for UI changes. Do not add `Co-authored-by` trailers.

## Agent-Specific Instructions
Always check the nearest `AGENTS.md` or `CLAUDE.md` before editing. Prefer `bun` commands over `npm`. Keep remote URL handling defensive and preserve the current read-only behavior for remotely opened documents unless the task explicitly changes that behavior.
