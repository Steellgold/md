# Repository Guidelines

## Project Structure & Module Organization

This repository is a Next.js 16 App Router app for editing and previewing Markdown. Keep route code in `app/`, including the catch-all opener route in `app/[...open]/` and the remote import API in `app/api/open-from-url/route.ts`. Put feature UI in `components/`, shared shadcn primitives in `components/ui/`, reusable hooks in `hooks/`, state and helper logic in `lib/`, and shared types in `types/`. Static assets and favicons live in `public/`.

Follow the existing naming pattern: domain files use `markdown-*` (for example `components/markdown-preview.tsx`), hooks use `use-*`, and shared imports should prefer the configured aliases such as `@/components`, `@/lib`, and `@/hooks`.

## Build, Test, and Development Commands

Use Bun by default in this repo; pnpm is acceptable if needed.

- `bun dev` starts the local dev server with Turbopack.
- `bun build` creates the production build.
- `bun start` serves the production build locally.
- `bun lint` runs ESLint across the project.
- `bun typecheck` runs TypeScript with `--noEmit`.
- `bun format` formats `*.ts` and `*.tsx` files with Prettier.

## Coding Style & Naming Conventions

TypeScript and TSX use 2-space indentation, semicolons, double quotes, trailing commas (`es5`), and an 80-character print width. Prettier is configured in `.prettierrc`, and `prettier-plugin-tailwindcss` sorts Tailwind classes automatically. ESLint extends Next.js core web vitals and TypeScript rules; fix lint errors before opening a PR.

Prefer small, focused React components, keep server/client boundaries explicit, and keep reusable logic in `lib/` or `hooks/` instead of route files.

## Testing Guidelines

There is no dedicated automated test suite yet. For every change, run at least `bun lint` and `bun typecheck`. For UI or editor behavior changes, manually verify file open/import flows, split view, preview rendering, and remote read-only behavior.

If you add tests, colocate them with the feature as `*.test.ts` or `*.test.tsx`.

## Commit & Pull Request Guidelines

Git history follows Conventional Commit style with scopes, for example `feat(markdown): ...` or `fix(README.md): ...`. Keep commits focused and descriptive.

PRs should include a short summary, linked issue when applicable, and screenshots or recordings for visible UI changes. Call out any changes to remote URL handling, browser file access, or environment variables such as `NEXT_PUBLIC_APP_URL`.
