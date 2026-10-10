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

  toast = $state<{ id: number; message: string } | null>(null);

  active = $derived(
    this.activities.filter((a) => !a.archivedAt).sort((a, b) => a.position - b.position),
  );
  byId = $derived(new Map(this.activities.map((a) => [a.id, a])));
  weekStartsOn = $derived(resolveWeekStart(this.me?.settings.weekStart ?? "auto"));

  async init() {
    try {
      const [me, activities] = await Promise.all([api.me(), api.activities()]);
      this.me = me;
      this.activities = activities;
      await this.refreshToday();
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
      void this.refreshToday();
      this.revision++;
    }
  }

  async refreshToday() {
    this.todayEntries = await api.entries(this.today, this.today);
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
  async reloadAll() {
    await Promise.all([this.refreshActivities(), this.refreshToday()]);
    this.revision++;
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
