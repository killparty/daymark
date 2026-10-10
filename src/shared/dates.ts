/**
 * Calendar dates are plain `YYYY-MM-DD` strings. They never carry a time or a
 * timezone: an entry's date is fixed when the button is pressed, using the
 * timezone the person was in at that moment (see docs/adr/0004).
 */
export type IsoDate = string;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): value is IsoDate {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function isValidTimeZone(tz: string): boolean {
  if (!tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The calendar date of `instant` as seen on a wall clock in `timeZone`. */
export function localDateIn(timeZone: string, instant: Date = new Date()): IsoDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** The timezone this runtime (browser or server) is currently in. */
export function currentTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function toUtc(date: IsoDate): Date {
  return new Date(`${date}T00:00:00Z`);
}

function fromUtc(d: Date): IsoDate {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(date: IsoDate): number {
  return toUtc(date).getUTCDay();
}

/** The first day of the week containing `date`. */
export function startOfWeek(date: IsoDate, weekStartsOn: number): IsoDate {
  const offset = (weekday(date) - weekStartsOn + 7) % 7;
  return addDays(date, -offset);
}

export function startOfMonth(date: IsoDate): IsoDate {
  return `${date.slice(0, 7)}-01`;
}

export function addMonths(date: IsoDate, months: number): IsoDate {
  const d = toUtc(startOfMonth(date));
  d.setUTCMonth(d.getUTCMonth() + months);
  return fromUtc(d);
}

export function daysInMonth(date: IsoDate): number {
  const d = toUtc(startOfMonth(date));
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return d.getUTCDate();
}

/** Inclusive list of dates from `from` to `to`. */
export function dateRange(from: IsoDate, to: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
