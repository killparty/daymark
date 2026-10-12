# HTTP API (v1)

JSON over HTTP under `/api/v1`. Types are defined in [`src/shared/api.ts`](../src/shared/api.ts),
which is the source of truth; this page is an overview.

- Send `Content-Type: application/json` on every non-GET request (also without a body).
- Errors: `{ "error": { "code": "conflict", "message": "…" } }` with a fitting status code.
- Auth depends on `AUTH_MODE` ([ADR 0003](adr/0003-auth-modes.md)).

## Me

| | | |
|---|---|---|
| `GET` | `/me` | `{ id, name, authMode, settings }` |
| `PATCH` | `/me/settings` | `{ weekStart?: "auto" \| "mon" \| "sun" \| "sat" }` |
| `GET` | `/revision` | `{ revision }`: an opaque value that changes whenever the user's data or settings change. The web app polls it (every 30 s while visible, and on focus) and reloads everything when it moves, so a change made on another device shows up. |

## Activities

| | | |
|---|---|---|
| `GET` | `/activities` | All activities, including archived (`archivedAt` set) |
| `POST` | `/activities` | `{ label, color, icon }` → `201` activity. Max 30 active. |
| `PATCH` | `/activities/:id` | Any of `{ label, color, icon }` |
| `POST` | `/activities/:id/archive` | Hide the button; history stays |
| `POST` | `/activities/:id/unarchive` | Bring it back (added at the end) |
| `PUT` | `/activities/order` | `{ ids }`: every active id, in the new order |

`color` is a palette key (`red orange amber green teal blue indigo purple pink slate`), `icon` an icon
key from [`src/shared/icons.ts`](../src/shared/icons.ts).

## Entries

| | | |
|---|---|---|
| `POST` | `/entries` | **The button press.** `{ activityId, timeZone }` → `201 { created: true, entry }`, or `200 { created: false, entry }` if already marked today. |
| `GET` | `/entries?from=YYYY-MM-DD&to=YYYY-MM-DD[&activityId=]` | Live entries in the range (max ~2 years) |
| `DELETE` | `/entries/:id` | Remove (soft delete) → `204` |

There is intentionally no way to pass a date: the server decides "today" from its clock and
`timeZone` ([ADR 0004](adr/0004-days-and-timezones.md)).

## Changes

| | | |
|---|---|---|
| `GET` | `/changes?limit=50[&before=<id>]` | Newest first; page back with the last id |
| `POST` | `/changes/:id/revert` | → the new change that reverts it; `409` if not possible |

## Data

| | | |
|---|---|---|
| `GET` | `/export` | JSON export (`format: "daymark-export", version: 1`) |
| `GET` | `/export.csv` | Entries as CSV |
| `POST` | `/import` | A JSON export → `{ activitiesAdded, entriesAdded, entriesSkipped }`. Merges; never changes or removes existing data. |

## Health

`GET /healthz` (outside `/api`, no auth) → `{ ok: true }`.
