import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type * as v from "valibot";
import {
  CreateActivityBody,
  EntriesQuery,
  ExportFile,
  LogEntryBody,
  type Me,
  ReorderActivitiesBody,
  UpdateActivityBody,
  UpdateSettingsBody,
} from "../../shared/api.ts";
import type { AppEnv } from "../auth.ts";
import type { Config } from "../config.ts";
import type { DbLike } from "../db/client.ts";
import { badRequest } from "../lib/errors.ts";
import {
  archiveActivity,
  createActivity,
  listActivities,
  reorderActivities,
  unarchiveActivity,
  updateActivity,
} from "../services/activities.ts";
import type { ChangeContext } from "../services/audit.ts";
import { listChanges, revertChange } from "../services/changes.ts";
import { exportCsv, exportData, importData } from "../services/data.ts";
import { listEntries, logToday, removeEntry } from "../services/entries.ts";
import { DEFAULT_SETTINGS, updateSettings } from "../services/users.ts";

type Target = "json" | "query";

/** Validates with a valibot schema and returns errors in the API's error shape. */
function validate<T extends v.GenericSchema>(target: Target, schema: T) {
  return sValidator(target, schema, (result, c) => {
    if (!result.success) {
      const message = result.error.map((i) => i.message).join("; ");
      return c.json({ error: { code: "invalid_request", message } }, 400);
    }
  });
}

const MAX_RANGE_DAYS = 731;

export function apiRoutes(db: DbLike, config: Config) {
  const ctx = (c: { get(key: "user"): { id: string } }, source = "web"): ChangeContext => ({
    userId: c.get("user").id,
    source,
  });

  return (
    new Hono<AppEnv>()
      /* ---- Me & settings ------------------------------------------------ */
      .get("/me", (c) => {
        const user = c.get("user");
        const me: Me = {
          id: user.id,
          name: user.name,
          authMode: config.auth.mode,
          settings: { ...DEFAULT_SETTINGS, ...user.settings },
        };
        return c.json(me);
      })
      .patch("/me/settings", validate("json", UpdateSettingsBody), (c) => {
        const settings = updateSettings(db, c.get("user"), c.req.valid("json"));
        return c.json(settings);
      })

      /* ---- Activities --------------------------------------------------- */
      .get("/activities", (c) => c.json(listActivities(db, c.get("user").id)))
      .post("/activities", validate("json", CreateActivityBody), (c) => {
        return c.json(createActivity(db, ctx(c), c.req.valid("json")), 201);
      })
      .patch("/activities/:id", validate("json", UpdateActivityBody), (c) => {
        return c.json(updateActivity(db, ctx(c), c.req.param("id"), c.req.valid("json")).activity);
      })
      .post("/activities/:id/archive", (c) => {
        return c.json(archiveActivity(db, ctx(c), c.req.param("id")).activity);
      })
      .post("/activities/:id/unarchive", (c) => {
        return c.json(unarchiveActivity(db, ctx(c), c.req.param("id")).activity);
      })
      .put("/activities/order", validate("json", ReorderActivitiesBody), (c) => {
        return c.json(reorderActivities(db, ctx(c), c.req.valid("json").ids).activities);
      })

      /* ---- Entries: the button press ------------------------------------ */
      .post("/entries", validate("json", LogEntryBody), (c) => {
        const result = logToday(db, ctx(c), c.req.valid("json"));
        return c.json(result, result.created ? 201 : 200);
      })
      .get("/entries", validate("query", EntriesQuery), (c) => {
        const q = c.req.valid("query");
        if (q.from > q.to) throw badRequest("from must not be after to");
        const days = (Date.parse(q.to) - Date.parse(q.from)) / 86_400_000;
        if (days > MAX_RANGE_DAYS) throw badRequest(`Range is limited to ${MAX_RANGE_DAYS} days`);
        return c.json(listEntries(db, c.get("user").id, q));
      })
      .delete("/entries/:id", (c) => {
        removeEntry(db, ctx(c), c.req.param("id"));
        return c.body(null, 204);
      })

      /* ---- Changes log -------------------------------------------------- */
      .get("/changes", (c) => {
        const limit = Math.min(Math.max(Number(c.req.query("limit")) || 50, 1), 200);
        const before = c.req.query("before") || undefined;
        return c.json(listChanges(db, c.get("user").id, { limit, before }));
      })
      .post("/changes/:id/revert", (c) => {
        return c.json(revertChange(db, ctx(c), c.req.param("id")));
      })

      /* ---- Data export / import ----------------------------------------- */
      .get("/export", (c) => {
        const day = new Date().toISOString().slice(0, 10);
        c.header("Content-Disposition", `attachment; filename="daymark-${day}.json"`);
        return c.json(exportData(db, c.get("user").id));
      })
      .get("/export.csv", (c) => {
        const day = new Date().toISOString().slice(0, 10);
        c.header("Content-Type", "text/csv; charset=utf-8");
        c.header("Content-Disposition", `attachment; filename="daymark-${day}.csv"`);
        return c.body(exportCsv(db, c.get("user").id));
      })
      .post(
        "/import",
        bodyLimit({ maxSize: 50 * 1024 * 1024 }),
        validate("json", ExportFile),
        (c) => c.json(importData(db, ctx(c, "import"), c.req.valid("json"))),
      )
  );
}
