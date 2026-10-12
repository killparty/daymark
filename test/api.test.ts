import { describe, expect, test } from "bun:test";
import { localDateIn } from "../src/shared/dates.ts";
import { testApp } from "./helpers.ts";

async function withActivities(labels = ["Yoga", "Gym"]) {
  const t = testApp();
  const ids: string[] = [];
  for (const label of labels) {
    const res = await t.call("POST", "/activities", { label, color: "green", icon: "flower" });
    expect(res.status).toBe(201);
    ids.push(res.body.id);
  }
  return { ...t, ids };
}

describe("activities", () => {
  test("creates, lists and validates", async () => {
    const { call, ids } = await withActivities();
    const list = await call("GET", "/activities");
    expect(list.body.map((a: { label: string }) => a.label)).toEqual(["Yoga", "Gym"]);
    expect(list.body[0].id).toBe(ids[0]);

    const bad = await call("POST", "/activities", { label: "  ", color: "green", icon: "flower" });
    expect(bad.status).toBe(400);
    const badColor = await call("POST", "/activities", {
      label: "X",
      color: "#fff",
      icon: "flower",
    });
    expect(badColor.status).toBe(400);
  });

  test("reorders and rejects incomplete orders", async () => {
    const { call, ids } = await withActivities(["A", "B", "C"]);
    const res = await call("PUT", "/activities/order", { ids: [ids[2], ids[0], ids[1]] });
    expect(res.body.map((a: { label: string }) => a.label)).toEqual(["C", "A", "B"]);
    const bad = await call("PUT", "/activities/order", { ids: [ids[0]] });
    expect(bad.status).toBe(400);
  });

  test("archived activities cannot be logged but keep their history", async () => {
    const { call, ids } = await withActivities(["Yoga"]);
    await call("POST", "/entries", { activityId: ids[0], timeZone: "UTC" });
    await call("POST", `/activities/${ids[0]}/archive`);
    const press = await call("POST", "/entries", { activityId: ids[0], timeZone: "UTC" });
    expect(press.status).toBe(409);
    const today = localDateIn("UTC");
    const entries = await call("GET", `/entries?from=${today}&to=${today}`);
    expect(entries.body).toHaveLength(1);
  });
});

describe("pressing a button", () => {
  test("logs today once; a second press changes nothing", async () => {
    const { call, ids } = await withActivities(["Yoga"]);
    const first = await call("POST", "/entries", { activityId: ids[0], timeZone: "Europe/Zurich" });
    expect(first.status).toBe(201);
    expect(first.body.created).toBe(true);
    expect(first.body.entry.date).toBe(localDateIn("Europe/Zurich"));

    const second = await call("POST", "/entries", {
      activityId: ids[0],
      timeZone: "Europe/Zurich",
    });
    expect(second.status).toBe(200);
    expect(second.body.created).toBe(false);
    expect(second.body.entry.id).toBe(first.body.entry.id);
  });

  test("rejects unknown timezones and activities", async () => {
    const { call, ids } = await withActivities(["Yoga"]);
    expect(
      (await call("POST", "/entries", { activityId: ids[0], timeZone: "Mars/Base" })).status,
    ).toBe(400);
    expect((await call("POST", "/entries", { activityId: "nope", timeZone: "UTC" })).status).toBe(
      404,
    );
  });

  test("does not accept a date: no backdating", async () => {
    const { call, ids } = await withActivities(["Yoga"]);
    const res = await call("POST", "/entries", {
      activityId: ids[0],
      timeZone: "UTC",
      date: "2020-01-01",
    });
    expect(res.body.entry.date).toBe(localDateIn("UTC"));
  });
});

describe("changes log", () => {
  test("remove, revert the removal, revert again", async () => {
    const { call, ids } = await withActivities(["Yoga"]);
    const today = localDateIn("UTC");
    const { body } = await call("POST", "/entries", { activityId: ids[0], timeZone: "UTC" });

    expect((await call("DELETE", `/entries/${body.entry.id}`)).status).toBe(204);
    expect((await call("GET", `/entries?from=${today}&to=${today}`)).body).toHaveLength(0);

    const log = await call("GET", "/changes");
    expect(log.body.map((c: { action: string }) => c.action)).toEqual([
      "entry.removed",
      "entry.logged",
      "activity.created",
    ]);

    const revert = await call("POST", `/changes/${log.body[0].id}/revert`);
    expect(revert.status).toBe(200);
    expect(revert.body.action).toBe("entry.restored");
    expect(revert.body.data.reverts).toBe(log.body[0].id);
    expect((await call("GET", `/entries?from=${today}&to=${today}`)).body).toHaveLength(1);

    // A change can only be reverted once.
    expect((await call("POST", `/changes/${log.body[0].id}/revert`)).status).toBe(409);
    // The revert itself is revertible.
    expect((await call("POST", `/changes/${revert.body.id}/revert`)).status).toBe(200);
    expect((await call("GET", `/entries?from=${today}&to=${today}`)).body).toHaveLength(0);
  });

  test("restoring conflicts with a newer press on the same day", async () => {
    const { call, ids } = await withActivities(["Yoga"]);
    const { body } = await call("POST", "/entries", { activityId: ids[0], timeZone: "UTC" });
    await call("DELETE", `/entries/${body.entry.id}`);
    await call("POST", "/entries", { activityId: ids[0], timeZone: "UTC" });
    const log = await call("GET", "/changes");
    const removal = log.body.find((c: { action: string }) => c.action === "entry.removed");
    expect((await call("POST", `/changes/${removal.id}/revert`)).status).toBe(409);
  });

  test("reverting an edit restores the old label and color", async () => {
    const { call, ids } = await withActivities(["Yoga"]);
    await call("PATCH", `/activities/${ids[0]}`, { label: "Hot yoga", color: "red" });
    const [edit] = (await call("GET", "/changes")).body;
    expect(edit.data.before).toEqual({ label: "Yoga", color: "green" });
    await call("POST", `/changes/${edit.id}/revert`);
    const [activity] = (await call("GET", "/activities")).body;
    expect(activity.label).toBe("Yoga");
    expect(activity.color).toBe("green");
  });
});

describe("export and import", () => {
  test("round-trips into another instance and is idempotent", async () => {
    const source = await withActivities(["Yoga", "Gym"]);
    await source.call("POST", "/entries", { activityId: source.ids[0], timeZone: "UTC" });
    await source.call("POST", `/activities/${source.ids[1]}/archive`);
    const file = (await source.call("GET", "/export")).body;
    expect(file.format).toBe("daymark-export");
    expect(file.entries).toHaveLength(1);

    const target = testApp();
    const first = await target.call("POST", "/import", file);
    expect(first.body).toEqual({ activitiesAdded: 2, entriesAdded: 1, entriesSkipped: 0 });
    const again = await target.call("POST", "/import", file);
    expect(again.body).toEqual({ activitiesAdded: 0, entriesAdded: 0, entriesSkipped: 1 });

    const activities = (await target.call("GET", "/activities")).body;
    expect(activities.find((a: { label: string }) => a.label === "Gym").archivedAt).not.toBeNull();
  });

  test("rejects files that are not Daymark exports", async () => {
    const { call } = testApp();
    expect((await call("POST", "/import", { hello: "world" })).status).toBe(400);
  });
});

describe("revision", () => {
  test("moves on every change and settings update, and only then", async () => {
    const { call, ids } = await withActivities();
    const rev = async () => (await call("GET", "/revision")).body.revision as string;

    const first = await rev();
    expect(await rev()).toBe(first);

    const press = await call("POST", "/entries", { activityId: ids[0], timeZone: "UTC" });
    const afterPress = await rev();
    // A second press changes nothing, so neither does the revision.
    await call("POST", "/entries", { activityId: ids[0], timeZone: "UTC" });
    expect(await rev()).toBe(afterPress);
    const seen = [first, afterPress];

    await call("DELETE", `/entries/${press.body.entry.id}`);
    seen.push(await rev());
    await call("PATCH", "/me/settings", { weekStart: "sun" });
    seen.push(await rev());

    expect(new Set(seen).size).toBe(seen.length);
  });
});

describe("auth", () => {
  test("proxy mode rejects requests that did not come through the proxy", async () => {
    const { call } = testApp({ AUTH_MODE: "proxy" });
    const res = await call("GET", "/me", undefined, { "Remote-User": "alex" });
    // app.request() has no socket, so the source address is unknown and untrusted.
    expect(res.status).toBe(403);
  });

  test("none mode uses a single local user", async () => {
    const { call } = testApp();
    const me = await call("GET", "/me");
    expect(me.body.authMode).toBe("none");
    expect(me.body.settings.weekStart).toBe("auto");
  });
});
