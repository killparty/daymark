import { and, desc, eq, lt } from "drizzle-orm";
import type { ActivitySnapshot, Change } from "../../shared/api.ts";
import type { DbLike } from "../db/client.ts";
import { changes } from "../db/schema.ts";
import { badRequest, conflict, notFound } from "../lib/errors.ts";
import { nowIso } from "../lib/ids.ts";
import {
  archiveActivity,
  listActivities,
  reorderActivities,
  unarchiveActivity,
  updateActivity,
} from "./activities.ts";
import type { ChangeContext } from "./audit.ts";
import { removeEntry, restoreEntry } from "./entries.ts";

type Row = typeof changes.$inferSelect;

const NOT_REVERTIBLE = new Set<Row["action"]>(["data.imported"]);

function toChange(row: Row): Change {
  return {
    id: row.id,
    at: row.at,
    action: row.action,
    activityId: row.activityId,
    entryId: row.entryId,
    source: row.source,
    data: row.data,
    revertedAt: row.revertedAt,
    revertible: !row.revertedAt && !NOT_REVERTIBLE.has(row.action),
  };
}

/** Newest first. Pass the last `id` you received as `before` to page back. */
export function listChanges(
  db: DbLike,
  userId: string,
  opts: { limit: number; before?: string },
): Change[] {
  return db
    .select()
    .from(changes)
    .where(and(eq(changes.userId, userId), opts.before ? lt(changes.id, opts.before) : undefined))
    .orderBy(desc(changes.id))
    .limit(opts.limit)
    .all()
    .map(toChange);
}

/**
 * Undoes a change by applying its opposite. The revert is itself a new
 * change, so it can be reverted too: nothing is ever lost.
 */
export function revertChange(db: DbLike, ctx: ChangeContext, id: string): Change {
  return db.transaction((tx) => {
    const row = tx
      .select()
      .from(changes)
      .where(and(eq(changes.userId, ctx.userId), eq(changes.id, id)))
      .get();
    if (!row) throw notFound("Change");
    if (row.revertedAt) throw conflict("This change was already reverted");
    if (NOT_REVERTIBLE.has(row.action)) throw badRequest("This change cannot be reverted");

    const revertCtx: ChangeContext = { ...ctx, reverts: row.id };
    const need = <T>(value: T | null | undefined): T => {
      if (value === null || value === undefined) throw badRequest("Change is missing data");
      return value;
    };

    let newChangeId: string | null;
    switch (row.action) {
      case "entry.logged":
      case "entry.restored":
        newChangeId = removeEntry(tx, revertCtx, need(row.entryId)).changeId;
        break;
      case "entry.removed":
        newChangeId = restoreEntry(tx, revertCtx, need(row.entryId)).changeId;
        break;
      case "activity.created":
      case "activity.unarchived":
        newChangeId = archiveActivity(tx, revertCtx, need(row.activityId)).changeId;
        break;
      case "activity.archived":
        newChangeId = unarchiveActivity(tx, revertCtx, need(row.activityId)).changeId;
        break;
      case "activity.updated":
        newChangeId = updateActivity(
          tx,
          revertCtx,
          need(row.activityId),
          need(row.data.before) as Partial<ActivitySnapshot>,
        ).changeId;
        break;
      case "activities.reordered": {
        // Activities may have been added or archived since; keep those where they are now.
        const active = listActivities(tx, ctx.userId)
          .filter((a) => !a.archivedAt)
          .map((a) => a.id);
        const before = (need(row.data.before) as string[]).filter((a) => active.includes(a));
        const order = [...before, ...active.filter((a) => !before.includes(a))];
        newChangeId = reorderActivities(tx, revertCtx, order).changeId;
        break;
      }
      default:
        throw badRequest("This change cannot be reverted");
    }
    if (!newChangeId) throw conflict("Nothing to revert: it already looks like that");

    tx.update(changes)
      .set({ revertedAt: nowIso(), revertedBy: newChangeId })
      .where(eq(changes.id, row.id))
      .run();
    return toChange(need(tx.select().from(changes).where(eq(changes.id, newChangeId)).get()));
  });
}
