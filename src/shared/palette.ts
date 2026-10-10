/**
 * Activity colors are stored as palette keys, not hex values. That lets each
 * renderer pick the right shade: light theme, dark theme, and later a
 * black-and-white or 6-color e-paper display.
 */
export const COLORS = [
  "red",
  "orange",
  "amber",
  "green",
  "teal",
  "blue",
  "indigo",
  "purple",
  "pink",
  "slate",
] as const;

export type ColorKey = (typeof COLORS)[number];

export const COLOR_LABELS: Record<ColorKey, string> = {
  red: "Red",
  orange: "Orange",
  amber: "Amber",
  green: "Green",
  teal: "Teal",
  blue: "Blue",
  indigo: "Indigo",
  purple: "Purple",
  pink: "Pink",
  slate: "Slate",
};
