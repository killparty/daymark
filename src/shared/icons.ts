/**
 * Every activity has an icon as well as a color, so it stays recognisable
 * without color: for color-blind users and on black-and-white e-paper.
 * Keys are stable identifiers; renderers map them to their own glyphs.
 */
export const ICONS = [
  "dumbbell",
  "biceps",
  "flower",
  "person",
  "footprints",
  "bike",
  "waves",
  "sailboat",
  "mountain",
  "snowflake",
  "volleyball",
  "fist",
  "swords",
  "heart",
  "timer",
  "zap",
  "flame",
  "wind",
  "leaf",
  "tree",
  "sun",
  "moon",
  "droplet",
  "apple",
  "brain",
  "book",
  "music",
  "sparkles",
  "star",
  "circle",
] as const;

export type IconKey = (typeof ICONS)[number];
