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

## Conventions

- Rules live in `src/server/services`; routes only validate and translate HTTP.
- Anything the server and the web app both need goes in `src/shared`.
- Every user-visible change goes through `recordChange` so it shows up in the Changes log.
- Schema changes: edit `src/server/db/schema.ts`, then `bun run db:generate` and commit the new
  migration in `drizzle/`.
- Larger decisions get a short record in `docs/adr`.
- UI: accessible first (labels, focus, contrast, `prefers-reduced-motion`), mobile first, and no
  streaks or goals.
