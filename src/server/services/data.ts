import { and, eq, isNull } from "drizzle-orm";
import {
  EXPORT_FORMAT,
  EXPORT_VERSION,
  type ExportFile,
  type ImportResult,
} from "../../shared/api.ts";
import type { DbLike } from "../db/client.ts";
import { activities, entries } from "../db/schema.ts";
import { newId, nowIso } from "../lib/ids.ts";
import { listActivities } from "./activities.ts";
import { type ChangeContext, recordChange } from "./audit.ts";
import { toEntry } from "./entries.ts";

function liveEntries(db: DbLike, userId: string) {
  return db
    .select()
    .from(entries)
    .where(and(eq(entries.userId, userId), isNull(entries.deletedAt)))
    .orderBy(entries.date, entries.loggedAt)
    .all()
    .map(toEntry);
}

export function exportData(db: DbLike, userId: string): ExportFile {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: nowIso(),
    activities: listActivities(db, userId),
    entries: liveEntries(db, userId),
  };
}

function csvField(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function exportCsv(db: DbLike, userId: string): string {
  const byId = new Map(listActivities(db, userId).map((a) => [a.id, a]));
  const lines = ["date,activity,color,logged_at,time_zone,source"];
  for (const e of liveEntries(db, userId)) {
    const a = byId.get(e.activityId);
    lines.push(
      [e.date, a?.label ?? "", a?.color ?? "", e.loggedAt, e.timeZone, e.source]
        .map(csvField)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

/**
 * Merges an export file into the user's data. Nothing existing is changed or
 * removed: known activities and entries are skipped, so importing the same
 * file twice is harmless.
 */
export function importData(db: DbLike, ctx: ChangeContext, file: ExportFile): ImportResult {
  return db.transaction((tx) => {
    const result: ImportResult = { activitiesAdded: 0, entriesAdded: 0, entriesSkipped: 0 };
    const idMap = new Map<string, string>();
    const now = nowIso();

    for (const a of file.activities) {
      const existing = tx.select().from(activities).where(eq(activities.id, a.id)).get();
      if (existing?.userId === ctx.userId) {
        idMap.set(a.id, a.id);
        continue;
      }
      // Ids belonging to another user are re-keyed.
      const id = existing ? newId() : a.id;
      idMap.set(a.id, id);
      tx.insert(activities)
        .values({ ...a, id, userId: ctx.userId, updatedAt: now })
        .run();
      result.activitiesAdded++;
    }

    for (const e of file.entries) {
      const activityId = idMap.get(e.activityId);
      const sameId = tx
        .select({ userId: entries.userId })
        .from(entries)
        .where(eq(entries.id, e.id))
        .get();
      const duplicate =
        !activityId ||
        sameId?.userId === ctx.userId ||
        tx
          .select({ id: entries.id })
          .from(entries)
          .where(
            and(
              eq(entries.userId, ctx.userId),
              eq(entries.activityId, activityId),
              eq(entries.date, e.date),
              isNull(entries.deletedAt),
            ),
          )
          .get();
      if (duplicate) {
        result.entriesSkipped++;
        continue;
      }
      tx.insert(entries)
        .values({
          ...e,
          id: sameId ? newId() : e.id,
          activityId,
          userId: ctx.userId,
          deletedAt: null,
        })
        .run();
      result.entriesAdded++;
    }

    recordChange(
      tx,
      ctx,
      "data.imported",
      {},
      { activities: result.activitiesAdded, entries: result.entriesAdded },
    );
    return result;
  });
}
