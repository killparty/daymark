# Architecture decision records

Short notes on decisions that shape Daymark, why they were made, and what would make us revisit them.

| # | Decision |
|---|---|
| [0001](0001-stack.md) | TypeScript end to end: Bun, Hono, Drizzle, Svelte 5 |
| [0002](0002-single-container-sqlite.md) | One container with SQLite |
| [0003](0003-auth-modes.md) | No built-in passwords: `none` or reverse-proxy auth |
| [0004](0004-days-and-timezones.md) | A day is fixed at press time, in the presser's timezone |
| [0005](0005-changes-log-and-revert.md) | Once per day, soft deletes and a revertible Changes log |
| [0006](0006-color-and-icon-keys.md) | Colors and icons are stored as keys |
| [0007](0007-calendar-built-in-house.md) | The calendar is built in-house |

New decision? Copy the format of an existing one and add it to this table.
