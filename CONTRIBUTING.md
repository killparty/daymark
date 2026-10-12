# Contributing

Thanks for your interest! Daymark aims to stay small and calm, so please open an issue to discuss
larger features before writing code.

## Setup

```sh
bun install
bun run dev      # http://localhost:5173 (API on :8080)
```

## Before you push

```sh
bun run format   # Biome
bun run check    # lint, typecheck, tests, build
```

## Screenshots and icons

After a visible UI change, regenerate the README screenshots; after editing
`src/web/public/icon.svg`, regenerate the PNG icon for iOS. Both use Playwright's Chromium
(once: `bunx playwright install chromium`).

```sh
bun run screenshots   # docs/screenshots, from a throwaway server with sample data
bun run icons         # src/web/public/apple-touch-icon.png
```

## Conventions

- Rules live in `src/server/services`; routes only validate and translate HTTP.
- Anything the server and the web app both need goes in `src/shared`.
- Every user-visible change goes through `recordChange` so it shows up in the Changes log.
- Schema changes: edit `src/server/db/schema.ts`, then `bun run db:generate` and commit the new
  migration in `drizzle/`.
- Larger decisions get a short record in `docs/adr`.
- UI: accessible first (labels, focus, contrast, `prefers-reduced-motion`), mobile first, and no
  streaks or goals.
