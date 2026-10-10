import { eq } from "drizzle-orm";
import type { UpdateSettingsBody, UserSettings } from "../../shared/api.ts";
import type { DbLike } from "../db/client.ts";
import { users } from "../db/schema.ts";
import { newId, nowIso } from "../lib/ids.ts";

export type User = typeof users.$inferSelect;

export const DEFAULT_SETTINGS: UserSettings = { weekStart: "auto" };

/** Finds the user for an identity from the auth layer, creating it on first sight. */
export function findOrCreateUser(db: DbLike, externalId: string, name: string): User {
  const existing = db.select().from(users).where(eq(users.externalId, externalId)).get();
  if (existing) {
    if (existing.name !== name) {
      db.update(users).set({ name }).where(eq(users.id, existing.id)).run();
      return { ...existing, name };
    }
    return existing;
  }
  const user: User = {
    id: newId(),
    externalId,
    name,
    settings: DEFAULT_SETTINGS,
    createdAt: nowIso(),
  };
  db.insert(users).values(user).onConflictDoNothing().run();
  // Another request may have created it first.
  return db.select().from(users).where(eq(users.externalId, externalId)).get() ?? user;
}

export function updateSettings(db: DbLike, user: User, patch: UpdateSettingsBody): UserSettings {
  const settings = { ...DEFAULT_SETTINGS, ...user.settings, ...patch };
  db.update(users).set({ settings }).where(eq(users.id, user.id)).run();
  return settings;
}
