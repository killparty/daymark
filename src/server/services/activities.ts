import { and, asc, eq, isNull, max } from "drizzle-orm";
import {
  type Activity,
  type ActivitySnapshot,
  type CreateActivityBody,
  MAX_ACTIVE_ACTIVITIES,
  type UpdateActivityBody,
} from "../../shared/api.ts";
import type { DbLike } from "../db/client.ts";
import { activities } from "../db/schema.ts";
import { badRequest, conflict, HttpError, notFound } from "../lib/errors.ts";
import { newId, nowIso } from "../lib/ids.ts";
import { type ChangeContext, recordChange, snapshot } from "./audit.ts";

type Row = typeof activities.$inferSelect;

export function toActivity(row: Row): Activity {
  return {
    id: row.id,
    label: row.label,
    color: row.color,
    icon: row.icon,
    position: row.position,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
  };
}

/** All activities including archived ones (the calendar still shows their history). */
export function listActivities(db: DbLike, userId: string): Activity[] {
  return db
    .select()
    .from(activities)
    .where(eq(activities.userId, userId))
    .orderBy(asc(activities.position), asc(activities.createdAt))
    .all()
    .map(toActivity);
}

export function getActivityRow(db: DbLike, userId: string, id: string): Row {
  const row = db
    .select()
    .from(activities)
    .where(and(eq(activities.userId, userId), eq(activities.id, id)))
    .get();
  if (!row) throw notFound("Activity");
  return row;
}

function activeRows(db: DbLike, userId: string): Row[] {
  return db
    .select()
    .from(activities)
    .where(and(eq(activities.userId, userId), isNull(activities.archivedAt)))
    .orderBy(asc(activities.position), asc(activities.createdAt))
    .all();
}

function nextPosition(db: DbLike, userId: string): number {
  const row = db
    .select({ max: max(activities.position) })
    .from(activities)
    .where(eq(activities.userId, userId))
    .get();
  return (row?.max ?? -1) + 1;
}

function assertRoomForActive(db: DbLike, userId: string) {
  if (activeRows(db, userId).length >= MAX_ACTIVE_ACTIVITIES) {
    throw new HttpError(
      422,
      "limit_reached",
      `You can have at most ${MAX_ACTIVE_ACTIVITIES} active activities. Archive one first.`,
    );
  }
}

export function createActivity(db: DbLike, ctx: ChangeContext, body: CreateActivityBody): Activity {
  return db.transaction((tx) => {
    assertRoomForActive(tx, ctx.userId);
    const now = nowIso();
    const row: Row = {
      id: newId(),
      userId: ctx.userId,
      label: body.label,
      color: body.color,
      icon: body.icon,
      position: nextPosition(tx, ctx.userId),
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    tx.insert(activities).values(row).run();
    recordChange(tx, ctx, "activity.created", { activityId: row.id }, { activity: snapshot(row) });
    return toActivity(row);
  });
}

export function updateActivity(
  db: DbLike,
  ctx: ChangeContext,
  id: string,
  body: UpdateActivityBody,
): { activity: Activity; changeId: string | null } {
  return db.transaction((tx) => {
    const row = getActivityRow(tx, ctx.userId, id);
    const before: Partial<ActivitySnapshot> = {};
    const after: Partial<ActivitySnapshot> = {};
    for (const key of ["label", "color", "icon"] as const) {
      const next = body[key];
      if (next !== undefined && next !== row[key]) {
        (before as Record<string, string>)[key] = row[key];
        (after as Record<string, string>)[key] = next;
      }
    }
    if (Object.keys(after).length === 0) return { activity: toActivity(row), changeId: null };

    const updated: Row = { ...row, ...after, updatedAt: nowIso() };
    tx.update(activities).set(updated).where(eq(activities.id, id)).run();
    const changeId = recordChange(
      tx,
      ctx,
      "activity.updated",
      { activityId: id },
      { activity: snapshot(updated), before, after },
    );
    return { activity: toActivity(updated), changeId };
  });
}

export function archiveActivity(
  db: DbLike,
  ctx: ChangeContext,
  id: string,
): { activity: Activity; changeId: string } {
  return db.transaction((tx) => {
    const row = getActivityRow(tx, ctx.userId, id);
    if (row.archivedAt) throw conflict("Activity is already archived");
    const now = nowIso();
    tx.update(activities)
      .set({ archivedAt: now, updatedAt: now })
      .where(eq(activities.id, id))
      .run();
    const changeId = recordChange(
      tx,
      ctx,
      "activity.archived",
      { activityId: id },
      { activity: snapshot(row) },
    );
    return { activity: toActivity({ ...row, archivedAt: now }), changeId };
  });
}

export function unarchiveActivity(
  db: DbLike,
  ctx: ChangeContext,
  id: string,
): { activity: Activity; changeId: string } {
  return db.transaction((tx) => {
    const row = getActivityRow(tx, ctx.userId, id);
    if (!row.archivedAt) throw conflict("Activity is not archived");
    assertRoomForActive(tx, ctx.userId);
    const position = nextPosition(tx, ctx.userId);
    tx.update(activities)
      .set({ archivedAt: null, position, updatedAt: nowIso() })
      .where(eq(activities.id, id))
      .run();
    const changeId = recordChange(
      tx,
      ctx,
      "activity.unarchived",
      { activityId: id },
      { activity: snapshot(row) },
    );
    return { activity: toActivity({ ...row, archivedAt: null, position }), changeId };
  });
}

/**
 * Sets the order of the active activities. `ids` must contain every active
 * activity exactly once. This order is also the physical-button mapping.
 */
export function reorderActivities(
  db: DbLike,
  ctx: ChangeContext,
  ids: string[],
): { activities: Activity[]; changeId: string | null } {
  return db.transaction((tx) => {
    const active = activeRows(tx, ctx.userId);
    const current = active.map((a) => a.id);
    const sameSet =
      ids.length === current.length &&
      new Set(ids).size === ids.length &&
      ids.every((id) => current.includes(id));
    if (!sameSet) throw badRequest("ids must list every active activity exactly once");

    if (ids.every((id, i) => current[i] === id)) {
      return { activities: listActivities(tx, ctx.userId), changeId: null };
    }
    const now = nowIso();
    ids.forEach((id, position) => {
      tx.update(activities).set({ position, updatedAt: now }).where(eq(activities.id, id)).run();
    });
    const changeId = recordChange(
      tx,
      ctx,
      "activities.reordered",
      {},
      { before: current, after: ids },
    );
    return { activities: listActivities(tx, ctx.userId), changeId };
  });
}
