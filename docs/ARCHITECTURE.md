# Architecture

Daymark is deliberately small. This page explains how it fits together and where it is meant to grow.
Individual decisions and their trade-offs are recorded in [adr/](adr).

## Product rules

These rules shape the code more than any technology choice:

1. **A press always means today.** The API has no way to log a past or future date.
2. **Once per activity per day.** A second press is accepted and changes nothing.
3. **A press is never undone by another press.** Removing an entry is a separate, deliberate action
   in the web UI (tap or right-click a day, confirm).
4. **Nothing is lost.** Every change is recorded in the Changes log and can be reverted. Entries are
   soft-deleted; activities are archived, never deleted.
5. **No streaks, no goals.** The app shows what you did; it doesn't judge what you didn't.
6. **One button = one activity.** The order of activities is also the order of physical buttons on a
   future device.

## Shape

```
 Browser (Svelte SPA, PWA)        Daymark device (later)
          │  JSON /api/v1                │  JSON /api/v1/device/* + device token
          ▼                              ▼
 ┌──────────────────────── Bun process ─────────────────────────┐
 │ Hono: security headers → CSRF → auth (none | proxy) → routes │
 │ services: activities · entries · changes · data · users      │
 │ Drizzle ORM ── SQLite (WAL) in /data/daymark.db              │
 │ static files: the built web app                              │
 └──────────────────────────────────────────────────────────────┘
```

One container, one process, one database file ([ADR 0002](adr/0002-single-container-sqlite.md)).
The web app and the API ship together, so they can never be out of sync.

### Layers

| Layer | Location | Responsibility |
|---|---|---|
| Shared | `src/shared` | API types, request schemas (valibot), date logic, palette and icon keys. Imported by both server and web, so a contract change is a compile error on both sides. |
| Routes | `src/server/routes` | HTTP only: validate input, call a service, shape the response. |
| Services | `src/server/services` | All rules (once per day, archive instead of delete, revert). Synchronous functions taking a database or transaction handle, which keeps them easy to test and to compose inside one transaction (a revert calls the same service functions as the UI). |
| Data | `src/server/db` | Drizzle schema and migrations. |
| Web | `src/web` | Svelte 5 SPA with a small hash router. State lives in `lib/store.svelte.ts`. |

## Data model

```
users       id, external_id (from auth), name, settings (json)
activities  id, user_id, label, color (palette key), icon (icon key), position, archived_at
entries     id, user_id, activity_id, date (YYYY-MM-DD), logged_at (UTC), time_zone, source, deleted_at
            UNIQUE (user_id, activity_id, date) WHERE deleted_at IS NULL
changes     id, user_id, at, action, activity_id, entry_id, source, data (json), reverted_at, reverted_by
```

- Ids are UUIDv7 (sortable by creation time, safe to merge across instances on import).
- `entries.date` is decided once, at press time, from the presser's current timezone
  ([ADR 0004](adr/0004-days-and-timezones.md)).
- `source` records where an entry came from: `web`, `import`, later `device:<id>`.
- `changes` is the audit log behind the Changes page
  ([ADR 0005](adr/0005-changes-log-and-revert.md)).
- Colors and icons are stored as keys, not hex values or SVG, so each renderer (light theme, dark
  theme, e-paper) can draw them appropriately ([ADR 0006](adr/0006-color-and-icon-keys.md)).

## Auth

`AUTH_MODE=none` (single local user, for private networks) or `AUTH_MODE=proxy` (a reverse proxy
authenticates and passes the username in a header). Daymark itself never handles passwords.
See [ADR 0003](adr/0003-auth-modes.md) and [deployment.md](deployment.md).

## Extension points

Planned or anticipated, and how the current design leaves room for them:

| Future | Where it plugs in |
|---|---|
| Physical device | Device tokens per user (new `devices` table), `/api/v1/device/*` routes that skip proxy auth, `source = device:<id>`, button mapping = activity `position`. Server renders the e-paper image. See [device.md](device.md). |
| More detail per entry (duration, note) | Nullable columns or a `metadata` json column on `entries`; the once-per-day rule stays. |
| Read-only calendar feed (ICS/CalDAV) | A route that renders entries as all-day events, authenticated by a per-user secret URL. |
| Webhooks / Home Assistant | Emit after `recordChange`; every user-visible change already flows through it. |
| Offline presses (PWA, device) | The API is idempotent per day, so a queued press can be replayed safely. Needs an optional client timestamp, validated to be "today or very recently" in that timezone. |
| Year view | Same `/entries` endpoint (up to two years per request). |
| Native OIDC login | A third `AUTH_MODE`, resolving to the same `users.external_id`. |
| Postgres | Drizzle schema is portable; services only use the query builder. |
