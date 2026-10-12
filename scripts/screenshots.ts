/**
 * Regenerates the README screenshots in docs/screenshots: builds the web app, starts a throwaway
 * server on a temporary database, fills it with sample data and photographs it.
 *
 *   bun run screenshots
 *
 * Needs a Chromium for Playwright (once: bunx playwright install chromium).
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import type { Activity, CreateActivityBody, ExportFile } from "../src/shared/api.ts";
import { addDays, dateRange, type IsoDate, weekday } from "../src/shared/dates.ts";

const PORT = 18_765;
const BASE = `http://127.0.0.1:${PORT}`;
const TIME_ZONE = "Europe/Madrid";
/** The pictured "now": a Thursday morning, so the week is half done. */
const TODAY: IsoDate = "2026-10-15";
const NOW = new Date("2026-10-15T09:30:00+02:00");
const OUT = new URL("../docs/screenshots/", import.meta.url).pathname;

const ACTIVITIES: CreateActivityBody[] = [
  { label: "Yoga", color: "green", icon: "flower" },
  { label: "Gym", color: "blue", icon: "dumbbell" },
  { label: "Meditation", color: "orange", icon: "person" },
  { label: "Study", color: "purple", icon: "book" },
];

/** Deterministic randomness, so every run draws the same calendar. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** How likely each activity is on a given weekday (0 = Sunday): a believable routine. */
function chance(label: string, day: number): number {
  const weekend = day === 0 || day === 6;
  switch (label) {
    case "Yoga":
      return 0.65;
    case "Gym":
      return day === 1 || day === 3 || day === 5 ? 0.85 : day === 6 ? 0.3 : 0.05;
    case "Meditation":
      return 0.55;
    default:
      return weekend ? 0.15 : 0.7;
  }
}

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${BASE}/healthz`)).ok) return;
    } catch {}
    await Bun.sleep(100);
  }
  throw new Error("Server did not start");
}

async function seed() {
  const activities: Activity[] = [];
  for (const a of ACTIVITIES) activities.push(await api<Activity>("POST", "/activities", a));

  const rand = random(7);
  const entries: ExportFile["entries"] = [];
  for (const date of dateRange(addDays(TODAY, -60), addDays(TODAY, -1))) {
    for (const a of activities) {
      if (rand() < chance(a.label, weekday(date))) {
        entries.push({
          id: crypto.randomUUID(),
          activityId: a.id,
          date,
          loggedAt: `${date}T07:00:00.000Z`,
          timeZone: TIME_ZONE,
          source: "web",
        });
      }
    }
  }
  // Today so far: a morning of yoga and meditation.
  for (const a of activities.filter((a) => a.label === "Yoga" || a.label === "Meditation")) {
    entries.push({
      id: crypto.randomUUID(),
      activityId: a.id,
      date: TODAY,
      loggedAt: NOW.toISOString(),
      timeZone: TIME_ZONE,
      source: "web",
    });
  }

  const file = await api<ExportFile>("GET", "/export");
  await api("POST", "/import", { ...file, entries });
}

async function shoot() {
  const browser = await chromium.launch();
  try {
    const shots = [
      { file: "home-light.png", width: 390, height: 844, colorScheme: "light" as const },
      { file: "desktop-dark.png", width: 1440, height: 860, colorScheme: "dark" as const },
    ];
    for (const s of shots) {
      const page = await browser.newPage({
        viewport: { width: s.width, height: s.height },
        deviceScaleFactor: 2,
        colorScheme: s.colorScheme,
        locale: "en-US",
        timezoneId: TIME_ZONE,
      });
      await page.clock.setFixedTime(NOW);
      await page.goto(BASE);
      await page.waitForSelector('[aria-current="date"] .dot');
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(OUT, s.file) });
      console.log(`Wrote docs/screenshots/${s.file}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

const build = Bun.spawnSync(["bun", "run", "build"], { stdout: "ignore", stderr: "inherit" });
if (build.exitCode !== 0) process.exit(build.exitCode ?? 1);

const dataDir = mkdtempSync(join(tmpdir(), "daymark-screenshots-"));
const server = Bun.spawn(["bun", "src/server/index.ts"], {
  env: {
    ...process.env,
    PORT: String(PORT),
    HOST: "127.0.0.1",
    DATA_DIR: dataDir,
    AUTH_MODE: "none",
  },
  stdout: "ignore",
  stderr: "inherit",
});
try {
  await waitForServer();
  await seed();
  await shoot();
} finally {
  server.kill();
  await server.exited;
  rmSync(dataDir, { recursive: true, force: true });
}
