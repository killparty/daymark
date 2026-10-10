# 0004 — A day is fixed at press time, in the presser's timezone

**Status:** accepted

## Context

"I did yoga today" depends on where you are. People travel across timezones. A naive design (store a
UTC timestamp, compute the day when displaying) makes past dots jump to other days when the viewer's
timezone changes.

## Decision

- Each entry stores the **calendar date** (`YYYY-MM-DD`) it belongs to, the **UTC instant** of the
  press and the **IANA timezone** it happened in.
- The date is computed **once, by the server**, from its own clock and the timezone the client is in
  at that moment. Clients cannot send a date (no backdating).
- The day changes at **local midnight**. No custom cutoff.
- The calendar shows stored dates as they are, in any timezone. "Today" (which buttons are already
  pressed, which cell is highlighted) follows the viewer's current timezone.
- A device without a location will use the user's configured home timezone.

## Consequences

- History never shifts. A Tokyo workout stays on the Tokyo date.
- Edge case: flying west across the date line can make "today" a date you already had. Each date
  still allows one press per activity; that is acceptable.
- Clients must send a valid IANA timezone; the server rejects unknown ones.
