# 0007 — The calendar is built in-house

**Status:** accepted

## Context

The calendar is the main view. Libraries like FullCalendar are built for time-slotted events,
resizing and dragging — none of which Daymark needs — and would be hard to style into a calm,
paper-like grid of dots.

## Decision

Build the grid as a small Svelte component (`CalendarGrid.svelte`) on top of plain `YYYY-MM-DD` date
helpers in `src/shared/dates.ts`. No date library; `Intl` handles localisation and timezones.

## Consequences

- Full control over layout, accessibility (`role="grid"`, labelled cells) and the dot design.
- Date math lives in one tested module. If it grows hairy, `Temporal` (now widely available) is the
  natural replacement.
