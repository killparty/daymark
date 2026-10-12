import * as v from "valibot";
import type { IsoDate } from "./dates.ts";
import { isIsoDate, isValidTimeZone } from "./dates.ts";
import { ICONS, type IconKey } from "./icons.ts";
import { COLORS, type ColorKey } from "./palette.ts";

/* ------------------------------------------------------------------------ *
 * Resources returned by the API (/api/v1)                                   *
 * ------------------------------------------------------------------------ */

export interface Activity {
  id: string;
  label: string;
  color: ColorKey;
  icon: IconKey;
  /** Order on screen. The first N activities map to the device's N physical buttons. */
  position: number;
  archivedAt: string | null;
  createdAt: string;
}

export type EntrySource = "web" | "import" | `device:${string}`;

export interface Entry {
  id: string;
  activityId: string;
  /** The calendar day this entry belongs to, fixed at press time. */
  date: IsoDate;
  /** UTC instant of the press. */
  loggedAt: string;
  /** IANA timezone the press happened in. */
  timeZone: string;
  source: EntrySource;
}

export const CHANGE_ACTIONS = [
  "entry.logged",
  "entry.removed",
  "entry.restored",
  "activity.created",
  "activity.updated",
  "activity.archived",
  "activity.unarchived",
  "activities.reordered",
  "data.imported",
] as const;
export type ChangeAction = (typeof CHANGE_ACTIONS)[number];

export interface ActivitySnapshot {
  label: string;
  color: ColorKey;
  icon: IconKey;
}

export interface ChangeData {
  date?: IsoDate;
  /** Activity as it looked when the change happened. */
  activity?: ActivitySnapshot;
  before?: Partial<ActivitySnapshot> | string[];
  after?: Partial<ActivitySnapshot> | string[];
  activities?: number;
  entries?: number;
  /** Set when this change is itself the revert of another change. */
  reverts?: string;
}

/** One line in the "Changes" log. Every change the user makes is recorded. */
export interface Change {
  id: string;
  at: string;
  action: ChangeAction;
  activityId: string | null;
  entryId: string | null;
  source: string;
  data: ChangeData;
  /** When this change was reverted, or null. */
  revertedAt: string | null;
  revertible: boolean;
}

export const WEEK_STARTS = ["auto", "mon", "sun", "sat"] as const;
export type WeekStart = (typeof WEEK_STARTS)[number];

export interface UserSettings {
  /** "auto" follows the browser locale. */
  weekStart: WeekStart;
}

export type AuthMode = "none" | "proxy";

export interface Me {
  id: string;
  name: string;
  authMode: AuthMode;
  settings: UserSettings;
}

/**
 * Changes whenever anything the user can see changes (any recorded change or a settings
 * update). Clients poll it to notice changes made on another device.
 */
export interface Revision {
  revision: string;
}

export interface LogResult {
  /** false when this activity was already logged for that day. A press is never counted twice. */
  created: boolean;
  entry: Entry;
}

export interface ApiError {
  error: { code: string; message: string };
}

/* ------------------------------------------------------------------------ *
 * Request bodies, validated on the server and typed on the client          *
 * ------------------------------------------------------------------------ */

export const LABEL_MAX = 32;
export const MAX_ACTIVE_ACTIVITIES = 30;

const label = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1, "Label is required"),
  v.maxLength(LABEL_MAX, `Label must be at most ${LABEL_MAX} characters`),
);
const color = v.picklist(COLORS);
const icon = v.picklist(ICONS);
const id = v.pipe(v.string(), v.minLength(1), v.maxLength(64));
const timeZone = v.pipe(v.string(), v.check(isValidTimeZone, "Unknown timezone"));
const isoDate = v.pipe(v.string(), v.check(isIsoDate, "Expected YYYY-MM-DD"));

export const CreateActivityBody = v.object({ label, color, icon });
export type CreateActivityBody = v.InferOutput<typeof CreateActivityBody>;

export const UpdateActivityBody = v.partial(v.object({ label, color, icon }));
export type UpdateActivityBody = v.InferOutput<typeof UpdateActivityBody>;

export const ReorderActivitiesBody = v.object({
  ids: v.pipe(v.array(id), v.maxLength(200)),
});
export type ReorderActivitiesBody = v.InferOutput<typeof ReorderActivitiesBody>;

/**
 * Logging always means "today": the server uses its own clock and the
 * client's current timezone. There is deliberately no way to pass a date.
 */
export const LogEntryBody = v.object({ activityId: id, timeZone });
export type LogEntryBody = v.InferOutput<typeof LogEntryBody>;

export const EntriesQuery = v.object({
  from: isoDate,
  to: isoDate,
  activityId: v.optional(id),
});

export const UpdateSettingsBody = v.partial(v.object({ weekStart: v.picklist(WEEK_STARTS) }));
export type UpdateSettingsBody = v.InferOutput<typeof UpdateSettingsBody>;

/* ------------------------------------------------------------------------ *
 * Export / import file                                                     *
 * ------------------------------------------------------------------------ */

export const EXPORT_FORMAT = "daymark-export";
export const EXPORT_VERSION = 1;

export const ExportFile = v.object({
  format: v.literal(EXPORT_FORMAT),
  version: v.literal(EXPORT_VERSION),
  exportedAt: v.string(),
  activities: v.pipe(
    v.array(
      v.object({
        id,
        label,
        color,
        icon,
        position: v.pipe(v.number(), v.integer()),
        archivedAt: v.nullable(v.string()),
        createdAt: v.string(),
      }),
    ),
    v.maxLength(1000),
  ),
  entries: v.pipe(
    v.array(
      v.object({
        id,
        activityId: id,
        date: isoDate,
        loggedAt: v.string(),
        timeZone,
        source: v.string(),
      }),
    ),
    v.maxLength(500_000),
  ),
});
export type ExportFile = v.InferOutput<typeof ExportFile>;

export interface ImportResult {
  activitiesAdded: number;
  entriesAdded: number;
  entriesSkipped: number;
}
