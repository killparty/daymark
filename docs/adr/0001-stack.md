# 0001 — TypeScript end to end: Bun, Hono, Drizzle, Svelte 5

**Status:** accepted

## Context

A small app with a web UI and an HTTP API that a future e-paper device will also use. Maintained by one
person in spare time, public for others to read and run. Python was ruled out by preference.

## Decision

- **Runtime: Bun.** Runs TypeScript directly (no build step for the server), built-in SQLite driver,
  fast installs and tests, one tool for everything.
- **HTTP: Hono.** Small, standards-based (`Request`/`Response`), good middleware (CSRF, secure
  headers), runs on Bun, Node or Deno if we ever need to move.
- **Database access: Drizzle ORM + drizzle-kit migrations.** Typed queries close to SQL, plain SQL
  migration files checked into `drizzle/`, portable to Postgres.
- **Validation: valibot**, shared by server and client from `src/shared`.
- **UI: Svelte 5 + Vite**, a static single-page app served by the same process. Runes give simple,
  fine-grained state; output is small and fast on old phones.
- **Lint/format: Biome; types: TypeScript + svelte-check; tests: `bun test`.**

## Consequences

- One language and one type system across server, client and the API contract.
- Bun is younger than Node. If it ever becomes a problem, Hono and Drizzle both run on Node; the
  places that are Bun-specific are `bun:sqlite`, `Bun.serve` and `Bun.randomUUIDv7`.
- Runner-up was Go + htmx (smaller binary, very stable). We chose TypeScript for the richer
  interaction the button press needs (animation, haptics, sound, later offline queueing).
