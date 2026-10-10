# 0002 — One container with SQLite

**Status:** accepted

## Context

Personal or family use: a handful of users, a few writes per day each. Deployed with Docker Compose
on a home server. Others should be able to self-host it with minimal effort.

## Decision

Ship **one image** that serves the API and the built web app, storing data in **one SQLite file**
(`/data/daymark.db`, WAL mode). No separate frontend, API or database containers.

## Consequences

- Install is one service in a compose file; backup is copying one file (or `sqlite3 .backup`).
- Web app and API are always the same version.
- SQLite easily handles this load. Writes are serialized, which also makes "once per day" trivially
  race-free.
- If we ever need Postgres (e.g. many users), the Drizzle schema and services port over; that would
  add an optional `compose` profile, not replace the default.
