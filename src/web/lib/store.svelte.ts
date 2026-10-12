import type { Activity, Entry, Me, UserSettings } from "../../shared/api.ts";
import { currentTimeZone, type IsoDate, localDateIn } from "../../shared/dates.ts";
import { api } from "./api.ts";
import { celebrate } from "./ceremony.ts";
import { resolveWeekStart } from "./format.ts";

class AppState {
  me = $state<Me | null>(null);
  activities = $state<Activity[]>([]);
  loadError = $state<string | null>(null);

  /** Where the viewer is right now. "Today" always follows the current timezone. */
  timeZone = $state(currentTimeZone());
  today = $state<IsoDate>(localDateIn(currentTimeZone()));
  todayEntries = $state<Entry[]>([]);
  /** Ids of activities being pressed right now (optimistically shown as done). */
  pending = $state<string[]>([]);

  /** Bumped after every data change, so views that cache entries reload. */
  revision = $state(0);
  /** The server's revision at the last sync; when it moves, another device changed something. */
  serverRevision: string | null = null;
  #syncing: Promise<void> | null = null;

  toast = $state<{ id: number; message: string } | null>(null);

  active = $derived(
    this.activities.filter((a) => !a.archivedAt).sort((a, b) => a.position - b.position),
  );
  byId = $derived(new Map(this.activities.map((a) => [a.id, a])));
  weekStartsOn = $derived(resolveWeekStart(this.me?.settings.weekStart ?? "auto"));

  async init() {
    try {
      await this.sync();
      this.loadError = null;
    } catch (e) {
      this.loadError = e instanceof Error ? e.message : String(e);
    }
  }

  /** Re-checks timezone and date, e.g. after midnight or after landing somewhere new. */
  tick() {
    const tz = currentTimeZone();
    const today = localDateIn(tz);
    if (tz !== this.timeZone || today !== this.today) {
      this.timeZone = tz;
      this.today = today;
      void this.sync().catch(() => {});
    }
  }

  /**
   * Reloads everything the screens show at once, so they never disagree with each other.
   * Existing data stays on screen until the new data has arrived.
   */
  sync(): Promise<void> {
    this.#syncing ??= this.#load().finally(() => {
      this.#syncing = null;
    });
    return this.#syncing;
  }

  async #load() {
    // Read the revision first: a change that lands while loading moves it again, so the next
    // check syncs once more instead of missing it.
    const { revision } = await api.revision();
    const [me, activities, todayEntries] = await Promise.all([
      api.me(),
      api.activities(),
      api.entries(this.today, this.today),
    ]);
    this.me = me;
    this.activities = activities;
    this.todayEntries = todayEntries;
    this.serverRevision = revision;
    this.revision++;
  }

  /** Cheap check for changes made elsewhere (another device or tab); syncs only if there are any. */
  async checkForChanges() {
    if (!this.me || document.visibilityState !== "visible") return;
    try {
      const { revision } = await api.revision();
      if (revision !== this.serverRevision) await this.sync();
    } catch {
      // Offline or server restarting: stay quiet and try again on the next check.
    }
  }

  async refreshActivities() {
    this.activities = await api.activities();
  }

  isDoneToday(activityId: string): boolean {
    return (
      this.pending.includes(activityId) ||
      this.todayEntries.some((e) => e.activityId === activityId)
    );
  }

  /** The button press. Instant feedback first, then the server. */
  async press(activity: Activity) {
    this.tick();
    if (this.isDoneToday(activity.id)) return;
    celebrate();
    this.pending = [...this.pending, activity.id];
    try {
      const result = await api.log(activity.id, this.timeZone);
      if (
        result.entry.date === this.today &&
        !this.todayEntries.some((e) => e.id === result.entry.id)
      ) {
        this.todayEntries = [...this.todayEntries, result.entry];
      }
      this.revision++;
    } catch (e) {
      this.notify(`Couldn't log ${activity.label}: ${e instanceof Error ? e.message : e}`);
    } finally {
      this.pending = this.pending.filter((id) => id !== activity.id);
    }
  }

  async removeEntry(entry: Entry) {
    await api.removeEntry(entry.id);
    this.todayEntries = this.todayEntries.filter((e) => e.id !== entry.id);
    this.revision++;
  }

  async updateSettings(patch: Partial<UserSettings>) {
    const settings = await api.updateSettings(patch);
    if (this.me) this.me = { ...this.me, settings };
  }

  /** Call after changes that may affect anything (revert, import). */
  reloadAll() {
    return this.sync();
  }

  notify(message: string) {
    const id = Date.now();
    this.toast = { id, message };
    setTimeout(() => {
      if (this.toast?.id === id) this.toast = null;
    }, 4000);
  }
}

export const app = new AppState();
