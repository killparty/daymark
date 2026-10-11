<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import type { Entry } from "../../shared/api.ts";
  import {
    addDays,
    addMonths,
    daysInMonth,
    type IsoDate,
    startOfMonth,
    startOfWeek,
  } from "../../shared/dates.ts";
  import { api } from "../lib/api.ts";
  import { formatDate } from "../lib/format.ts";
  import { loadLocal, saveLocal } from "../lib/prefs.svelte.ts";
  import { app } from "../lib/store.svelte.ts";
  import ActivityIcon from "./ActivityIcon.svelte";
  import CalendarGrid from "./CalendarGrid.svelte";
  import DaySheet from "./DaySheet.svelte";

  type View = "recent" | "month";
  const RECENT_WEEKS = 6;

  let view = $state<View>(loadLocal<View>("calendar.view", "recent"));
  let monthCursor = $state<IsoDate>(startOfMonth(app.today));
  /** Activity ids to show. Empty means all. */
  let filter = $state<string[]>(loadLocal<string[]>("calendar.filter", []));

  let entries = $state<Entry[]>([]);
  let loadError = $state<string | null>(null);
  let openDate = $state<IsoDate | null>(null);
  let sheetOpen = $state(false);

  $effect(() => saveLocal("calendar.view", view));
  $effect(() => saveLocal("calendar.filter", filter));

  const range = $derived.by(() => {
    const ws = app.weekStartsOn;
    if (view === "recent") {
      const end = addDays(startOfWeek(app.today, ws), 6);
      const start = addDays(end, -(RECENT_WEEKS * 7) + 1);
      return { start, end, month: null };
    }
    const first = monthCursor;
    const last = addDays(first, daysInMonth(first) - 1);
    const start = startOfWeek(first, ws);
    const end = addDays(startOfWeek(last, ws), 6);
    return { start, end, month: first.slice(0, 7) };
  });

  const dates = $derived.by(() => {
    const out: IsoDate[] = [];
    for (let d = range.start; d <= range.end; d = addDays(d, 1)) out.push(d);
    return out;
  });

  // Reload whenever the range changes or data changed anywhere (app.revision).
  $effect(() => {
    const { start, end } = range;
    void app.revision;
    let cancelled = false;
    api
      .entries(start, end)
      .then((list) => {
        if (!cancelled) {
          entries = list;
          loadError = null;
        }
      })
      .catch((e) => {
        if (!cancelled) loadError = e.message;
      });
    return () => {
      cancelled = true;
    };
  });

  const visible = $derived(filter.length ? entries.filter((e) => filter.includes(e.activityId)) : entries);

  const entriesByDate = $derived.by(() => {
    const map = new Map<IsoDate, Entry[]>();
    for (const e of visible) {
      const list = map.get(e.date);
      if (list) list.push(e);
      else map.set(e.date, [e]);
    }
    return map;
  });

  /** Chips: active activities plus archived ones that appear in this range. */
  const chips = $derived.by(() => {
    const inRange = new Set(entries.map((e) => e.activityId));
    return app.activities
      .filter((a) => !a.archivedAt || inRange.has(a.id) || filter.includes(a.id))
      .sort((a, b) => (a.archivedAt ? 1 : 0) - (b.archivedAt ? 1 : 0) || a.position - b.position);
  });

  /** Days per activity in the shown month (month view only). */
  const counts = $derived.by(() => {
    const map = new Map<string, number>();
    if (!range.month) return map;
    for (const e of entries) {
      if (e.date.startsWith(range.month)) map.set(e.activityId, (map.get(e.activityId) ?? 0) + 1);
    }
    return map;
  });

  const title = $derived(
    view === "recent"
      ? "Recent weeks"
      : formatDate(monthCursor, { month: "long", year: "numeric" }),
  );

  function toggle(id: string) {
    filter = filter.includes(id) ? filter.filter((f) => f !== id) : [...filter, id];
  }

  function open(date: IsoDate) {
    openDate = date;
    sheetOpen = true;
  }
</script>

<section class="card calendar" aria-labelledby="calendar-title">
  <header>
    <h2 id="calendar-title">{title}</h2>
    <div class="segmented" role="group" aria-label="Calendar view">
      <button aria-pressed={view === "recent"} onclick={() => (view = "recent")}>Recent</button>
      <button
        aria-pressed={view === "month"}
        onclick={() => {
          view = "month";
          monthCursor = startOfMonth(app.today);
        }}>Month</button
      >
    </div>
  </header>

  {#if view === "month"}
    <div class="nav">
      <button class="icon-btn" aria-label="Previous month" onclick={() => (monthCursor = addMonths(monthCursor, -1))}>
        <ChevronLeft size={22} />
      </button>
      <button
        class="btn btn-sm btn-plain"
        disabled={monthCursor === startOfMonth(app.today)}
        onclick={() => (monthCursor = startOfMonth(app.today))}>This month</button
      >
      <button
        class="icon-btn"
        aria-label="Next month"
        disabled={monthCursor >= startOfMonth(app.today)}
        onclick={() => (monthCursor = addMonths(monthCursor, 1))}
      >
        <ChevronRight size={22} />
      </button>
    </div>
  {/if}

  <CalendarGrid
    {dates}
    weekStartsOn={app.weekStartsOn}
    today={app.today}
    {entriesByDate}
    activities={app.byId}
    month={range.month}
    onopen={open}
  />

  {#if loadError}
    <p class="error" role="alert">{loadError}</p>
  {/if}

  {#if chips.length > 1}
    <div class="chips" role="group" aria-label="Show activities">
      <button class="chip" aria-pressed={filter.length === 0} onclick={() => (filter = [])}>All</button>
      {#each chips as a (a.id)}
        <button
          class="chip"
          class:archived={!!a.archivedAt}
          style="--c: var(--c-{a.color})"
          aria-pressed={filter.includes(a.id)}
          onclick={() => toggle(a.id)}
        >
          <ActivityIcon icon={a.icon} size={15} />
          {a.label}
          {#if range.month}
            <span class="count" aria-label="{counts.get(a.id) ?? 0} days this month">{counts.get(a.id) ?? 0}</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</section>

<DaySheet bind:open={sheetOpen} date={openDate} />

<style>
  .calendar {
    padding: 16px 12px 14px;
  }
  /* Wide screens: as tall as the window (up to a point), so every week is visible at once. The
     grid's rows share the height; if they would get too small, the card grows and the page scrolls. */
  @media (min-width: 1000px) {
    .calendar {
      display: flex;
      flex-direction: column;
      min-height: min(calc(100dvh - 48px - env(safe-area-inset-top) - env(safe-area-inset-bottom)), 1000px);
    }
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 0 4px 12px;
  }
  h2 {
    font-family: var(--font-rounded);
    font-size: 19px;
    font-weight: 680;
  }
  .nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: -4px 0 8px;
  }
  .error {
    color: var(--danger);
    font-size: 14px;
    margin: 12px 4px 0;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 14px;
    padding: 0 2px;
  }
  .chip {
    --c: var(--ink-2);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 34px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: transparent;
    font-size: 14px;
    font-weight: 560;
    color: var(--ink-2);
  }
  .chip :global(svg) {
    color: var(--c);
  }
  .chip[aria-pressed="true"] {
    border-color: color-mix(in srgb, var(--c) 55%, var(--border));
    background: color-mix(in srgb, var(--c) 13%, transparent);
    color: var(--ink);
  }
  .chip.archived {
    font-style: italic;
  }
  .count {
    font-variant-numeric: tabular-nums;
    font-size: 12px;
    color: var(--ink-3);
  }
</style>
