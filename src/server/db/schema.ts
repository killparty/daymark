import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { ChangeAction, ChangeData, UserSettings } from "../../shared/api.ts";
import type { IconKey } from "../../shared/icons.ts";
import type { ColorKey } from "../../shared/palette.ts";

// All ids are UUIDv7 (time-sortable) and all timestamps are ISO-8601 UTC strings.

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  /** Identity from the auth layer, e.g. the `Remote-User` header. "local" in AUTH_MODE=none. */
  externalId: text("external_id").notNull().unique(),
  name: text("name").notNull(),
  settings: text("settings", { mode: "json" }).$type<UserSettings>().notNull(),
  createdAt: text("created_at").notNull(),
});

export const activities = sqliteTable(
  "activities",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    color: text("color").$type<ColorKey>().notNull(),
    icon: text("icon").$type<IconKey>().notNull(),
    position: integer("position").notNull(),
    archivedAt: text("archived_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("activities_user_idx").on(t.userId, t.position)],
);

export const entries = sqliteTable(
  "entries",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activityId: text("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    /** Calendar day (YYYY-MM-DD) in `timeZone` at the moment of the press. */
    date: text("date").notNull(),
    loggedAt: text("logged_at").notNull(),
    timeZone: text("time_zone").notNull(),
    source: text("source").notNull(),
    /** Soft delete, so a removal can be reverted from the Changes log. */
    deletedAt: text("deleted_at"),
  },
  (t) => [
    // An activity can be logged at most once per day.
    uniqueIndex("entries_once_per_day")
      .on(t.userId, t.activityId, t.date)
      .where(sql`deleted_at IS NULL`),
    index("entries_user_date_idx").on(t.userId, t.date),
  ],
);

export const changes = sqliteTable(
  "changes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    at: text("at").notNull(),
    action: text("action").$type<ChangeAction>().notNull(),
    activityId: text("activity_id"),
    entryId: text("entry_id"),
    source: text("source").notNull(),
    data: text("data", { mode: "json" }).$type<ChangeData>().notNull(),
    revertedAt: text("reverted_at"),
    revertedBy: text("reverted_by"),
  },
  (t) => [index("changes_user_idx").on(t.userId, t.id)],
);
