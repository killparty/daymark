import type { Activity, ActivitySnapshot, ChangeAction, ChangeData } from "../../shared/api.ts";
import type { DbLike } from "../db/client.ts";
import { changes } from "../db/schema.ts";
import { newId, nowIso } from "../lib/ids.ts";

/** Who or what caused a change, and whether it reverts an earlier one. */
export interface ChangeContext {
  userId: string;
  source: string;
  /** Id of the change being reverted, if this change is a revert. */
  reverts?: string;
}

export function snapshot(a: Pick<Activity, "label" | "color" | "icon">): ActivitySnapshot {
  return { label: a.label, color: a.color, icon: a.icon };
}

export function recordChange(
  db: DbLike,
  ctx: ChangeContext,
  action: ChangeAction,
  refs: { activityId?: string | null; entryId?: string | null },
  data: ChangeData,
): string {
  const id = newId();
  db.insert(changes)
    .values({
      id,
      userId: ctx.userId,
      at: nowIso(),
      action,
      activityId: refs.activityId ?? null,
      entryId: refs.entryId ?? null,
      source: ctx.source,
      data: ctx.reverts ? { ...data, reverts: ctx.reverts } : data,
    })
    .run();
  return id;
}
