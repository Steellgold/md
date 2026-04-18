# Cloudflare Share Service

Standalone Cloudflare Worker used only for Markdown sharing.

It stores:

- metadata in Workers KV
- Markdown snapshots in R2

## Configure

1. Create an R2 bucket.
2. Create a KV namespace.
3. Replace the placeholder IDs and bucket name in `wrangler.jsonc`.
4. Set these secrets:

```bash
bunx wrangler secret put SHARE_PASSWORD_PEPPER --config cloudflare-share/wrangler.jsonc
bunx wrangler secret put SHARE_API_TOKEN --config cloudflare-share/wrangler.jsonc
```

## Local Dev

Copy `.dev.vars.example` to `.dev.vars`, then run:

```bash
bun run share:dev
```

## Deploy

```bash
bun run share:deploy
```
