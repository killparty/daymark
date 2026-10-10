import type { WeekStart } from "../../shared/api.ts";
import type { IsoDate } from "../../shared/dates.ts";

let cachedLocale: string | undefined;

/** The browser's locale, or the runtime default if the browser reports an invalid tag. */
function locale(): string {
  if (cachedLocale) return cachedLocale;
  for (const tag of typeof navigator !== "undefined" ? navigator.languages : []) {
    try {
      cachedLocale = Intl.getCanonicalLocales(tag)[0];
      if (cachedLocale) return cachedLocale;
    } catch {
      // e.g. "en-US@posix": try the next one
    }
  }
  cachedLocale = new Intl.DateTimeFormat().resolvedOptions().locale;
  return cachedLocale;
}

/** Formats a calendar date without letting the viewer's timezone shift it. */
export function formatDate(date: IsoDate, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale(), { ...options, timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

export function formatTime(instant: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale(), { hour: "numeric", minute: "2-digit", timeZone }).format(
    new Date(instant),
  );
}

export function formatDateTime(instant: string): string {
  return new Intl.DateTimeFormat(locale(), {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(instant));
}

/** 0 = Sunday … 6 = Saturday, from the browser's locale. */
export function localeWeekStart(): number {
  try {
    const loc = new Intl.Locale(locale()) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const first = loc.getWeekInfo?.().firstDay ?? loc.weekInfo?.firstDay;
    if (first) return first % 7;
  } catch {
    // fall through
  }
  return /^en-(US|CA)|^(ja|ko|zh-TW|he|pt-BR)/.test(locale()) ? 0 : 1;
}

export function resolveWeekStart(setting: WeekStart): number {
  switch (setting) {
    case "mon":
      return 1;
    case "sun":
      return 0;
    case "sat":
      return 6;
    default:
      return localeWeekStart();
  }
}

export const WEEKDAY_NAMES = (style: "long" | "narrow" | "short") =>
  // 2023-01-01 was a Sunday.
  Array.from({ length: 7 }, (_, i) => formatDate(`2023-01-0${i + 1}`, { weekday: style }));
