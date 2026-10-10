# 0006 — Colors and icons are stored as keys

**Status:** accepted

## Context

Activities have a color. The same color must look right on a light page, a dark page, and later on an
e-paper display that may be black-and-white or limited to six colors. Color alone also fails
color-blind users.

## Decision

- Colors are a fixed palette of keys (`green`, `blue`, …) defined in `src/shared/palette.ts`. Each
  renderer maps a key to its own shade (CSS variables per theme; later a dither pattern or panel color
  on the device).
- Every activity also has an **icon key** from a curated set (`src/shared/icons.ts`), rendered with
  Lucide on the web and as bitmaps on the device.

## Consequences

- No arbitrary hex colors. The palette can grow by adding keys.
- Dots in the calendar are color only (they're tiny); everywhere else, color is paired with an icon
  and a label.
