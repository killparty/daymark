import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";
import type { Entry, EntrySource, LogResult } from "../../shared/api.ts";
import { type IsoDate, localDateIn } from "../../shared/dates.ts";
import type { DbLike } from "../db/client.ts";
import { entries } from "../db/schema.ts";
import { conflict, notFound } from "../lib/errors.ts";
import { newId, nowIso } from "../lib/ids.ts";
import { getActivityRow } from "./activities.ts";
import { type ChangeContext, recordChange, snapshot } from "./audit.ts";

type Row = typeof entries.$inferSelect;

export function toEntry(row: Row): Entry {
  return {
    id: row.id,
    activityId: row.activityId,
    date: row.date,
    loggedAt: row.loggedAt,
    timeZone: row.timeZone,
    source: row.source as EntrySource,
  };
}

function liveEntryFor(db: DbLike, userId: string, activityId: string, date: IsoDate) {
  return db
    .select()
    .from(entries)
    .where(
      and(
        eq(entries.userId, userId),
        eq(entries.activityId, activityId),
        eq(entries.date, date),
        isNull(entries.deletedAt),
      ),
    )
    .get();
}

function getEntryRow(db: DbLike, userId: string, id: string): Row {
  const row = db
    .select()
    .from(entries)
    .where(and(eq(entries.userId, userId), eq(entries.id, id)))
    .get();
  if (!row) throw notFound("Entry");
  return row;
}

/**
 * The button press. Logs `activityId` for *today* in `timeZone`. Pressing
 * again on the same day changes nothing and returns the existing entry.
 */
export function logToday(
  db: DbLike,
  ctx: ChangeContext,
  input: { activityId: string; timeZone: string; now?: Date },
): LogResult {
  return db.transaction((tx) => {
    const activity = getActivityRow(tx, ctx.userId, input.activityId);
    if (activity.archivedAt) throw conflict("This activity is archived");

    const now = input.now ?? new Date();
    const date = localDateIn(input.timeZone, now);
    const existing = liveEntryFor(tx, ctx.userId, activity.id, date);
    if (existing) return { created: false, entry: toEntry(existing) };

    const row: Row = {
      id: newId(),
      userId: ctx.userId,
      activityId: activity.id,
      date,
      loggedAt: nowIso(now),
      timeZone: input.timeZone,
      source: ctx.source,
      deletedAt: null,
    };
    tx.insert(entries).values(row).run();
    recordChange(
      tx,
      ctx,
      "entry.logged",
      { activityId: activity.id, entryId: row.id },
      { date, activity: snapshot(activity) },
    );
    return { created: true, entry: toEntry(row) };
  });
}

export function listEntries(
  db: DbLike,
  userId: string,
  q: { from: IsoDate; to: IsoDate; activityId?: string },
): Entry[] {
  return db
    .select()
    .from(entries)
    .where(
      and(
        eq(entries.userId, userId),
        isNull(entries.deletedAt),
        gte(entries.date, q.from),
        lte(entries.date, q.to),
        q.activityId ? eq(entries.activityId, q.activityId) : undefined,
      ),
    )
    .orderBy(asc(entries.date), asc(entries.loggedAt))
    .all()
    .map(toEntry);
}

/** Soft-deletes an entry. It can be brought back from the Changes log. */
export function removeEntry(db: DbLike, ctx: ChangeContext, id: string): { changeId: string } {
  return db.transaction((tx) => {
    const row = getEntryRow(tx, ctx.userId, id);
    if (row.deletedAt) throw conflict("This entry was already removed");
    tx.update(entries).set({ deletedAt: nowIso() }).where(eq(entries.id, id)).run();
    const activity = getActivityRow(tx, ctx.userId, row.activityId);
    const changeId = recordChange(
      tx,
      ctx,
      "entry.removed",
      { activityId: row.activityId, entryId: id },
      { date: row.date, activity: snapshot(activity) },
    );
    return { changeId };
  });
}

export function restoreEntry(db: DbLike, ctx: ChangeContext, id: string): { changeId: string } {
  return db.transaction((tx) => {
    const row = getEntryRow(tx, ctx.userId, id);
    if (!row.deletedAt) throw conflict("This entry is not removed");
    if (liveEntryFor(tx, ctx.userId, row.activityId, row.date)) {
      throw conflict("This activity is already logged for that day");
    }
    tx.update(entries).set({ deletedAt: null }).where(eq(entries.id, id)).run();
    const activity = getActivityRow(tx, ctx.userId, row.activityId);
    const changeId = recordChange(
      tx,
      ctx,
      "entry.restored",
      { activityId: row.activityId, entryId: id },
      { date: row.date, activity: snapshot(activity) },
    );
    return { changeId };
  });
}
