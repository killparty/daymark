<script lang="ts">
  import type { Activity, Entry } from "../../shared/api.ts";
  import type { IsoDate } from "../../shared/dates.ts";
  import { formatDate, WEEKDAY_NAMES } from "../lib/format.ts";

  let {
    dates,
    weekStartsOn,
    today,
    entriesByDate,
    activities,
    month = null,
    onopen,
  }: {
    /** Whole weeks, in order. */
    dates: IsoDate[];
    weekStartsOn: number;
    today: IsoDate;
    entriesByDate: Map<IsoDate, Entry[]>;
    activities: Map<string, Activity>;
    /** In month view, days outside this month (YYYY-MM) are dimmed. */
    month?: string | null;
    onopen: (date: IsoDate) => void;
  } = $props();

  const MAX_DOTS = 6;

  const weekdays = $derived.by(() => {
    const narrow = WEEKDAY_NAMES("narrow");
    const long = WEEKDAY_NAMES("long");
    return Array.from({ length: 7 }, (_, i) => {
      const d = (weekStartsOn + i) % 7;
      return { narrow: narrow[d], long: long[d] };
    });
  });

  function dotsFor(date: IsoDate) {
    const list = (entriesByDate.get(date) ?? [])
      .map((e) => activities.get(e.activityId))
      .filter((a): a is Activity => !!a)
      .sort((a, b) => (a.archivedAt ? 1 : 0) - (b.archivedAt ? 1 : 0) || a.position - b.position);
    return list;
  }

  function label(date: IsoDate, list: Activity[]) {
    const day = formatDate(date, { weekday: "long", month: "long", day: "numeric" });
    return list.length ? `${day}: ${list.map((a) => a.label).join(", ")}` : `${day}: nothing logged`;
  }
</script>

<div class="grid" role="grid" aria-label="Calendar">
  <div class="row head" role="row">
    {#each weekdays as w}
      <div class="weekday" role="columnheader">
        <abbr title={w.long}>{w.narrow}</abbr>
      </div>
    {/each}
  </div>
  {#each Array.from({ length: dates.length / 7 }, (_, i) => dates.slice(i * 7, i * 7 + 7)) as week}
    <div class="row" role="row">
      {#each week as date (date)}
        {@const list = dotsFor(date)}
        {@const future = date > today}
        {@const outside = month !== null && !date.startsWith(month)}
        {@const first = date.endsWith("-01")}
        <div role="gridcell" class="cell-wrap">
          <button
            class="cell"
            class:today={date === today}
            class:outside
            class:has={list.length > 0}
            disabled={future}
            aria-label={label(date, list)}
            aria-current={date === today ? "date" : undefined}
            onclick={() => onopen(date)}
            oncontextmenu={(e) => {
              e.preventDefault();
              if (!future) onopen(date);
            }}
          >
            <span class="num">
              {#if first && month === null}
                <span class="month">{formatDate(date, { month: "short" })}</span>
              {/if}
              {Number(date.slice(8))}
            </span>
            <span class="dots" aria-hidden="true">
              {#each list.slice(0, list.length > MAX_DOTS ? MAX_DOTS - 1 : MAX_DOTS) as a (a.id)}
                <span class="dot" style="--c: var(--c-{a.color})"></span>
              {/each}
              {#if list.length > MAX_DOTS}
                <span class="more">+{list.length - (MAX_DOTS - 1)}</span>
              {/if}
            </span>
          </button>
        </div>
      {/each}
    </div>
  {/each}
</div>

<style>
  .grid {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .row {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 4px;
  }
  .weekday {
    text-align: center;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-3);
    padding: 2px 0 4px;
  }
  .weekday abbr {
    text-decoration: none;
  }
  .cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    width: 100%;
    aspect-ratio: 1 / 1.05;
    min-height: 44px;
    padding: 6px 2px 4px;
    border: none;
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--ink) 3.5%, transparent);
    transition: background 0.15s ease;
  }
  .cell:hover:not(:disabled) {
    background: color-mix(in srgb, var(--ink) 8%, transparent);
  }
  .cell.has {
    background: color-mix(in srgb, var(--ink) 6%, transparent);
  }
  .cell:disabled {
    background: transparent;
    cursor: default;
  }
  .cell:disabled .num {
    color: var(--ink-3);
    opacity: 0.6;
  }
  .outside {
    opacity: 0.4;
  }
  .num {
    display: inline-flex;
    align-items: baseline;
    gap: 3px;
    font-size: 13px;
    font-weight: 560;
    font-variant-numeric: tabular-nums;
    color: var(--ink-2);
    line-height: 22px;
    min-width: 22px;
    justify-content: center;
    border-radius: 999px;
    padding: 0 4px;
  }
  .month {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--ink);
  }
  .today .num {
    background: var(--accent);
    color: var(--accent-ink);
    font-weight: 700;
  }
  .today .num .month {
    color: inherit;
  }
  .dots {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-content: flex-start;
    gap: 3px;
    max-width: 34px;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--c);
  }
  .more {
    font-size: 9px;
    font-weight: 700;
    line-height: 8px;
    color: var(--ink-2);
  }
  /* Wide screens: fill the card's height instead of keeping cells square (see CalendarCard). */
  @media (min-width: 1000px) {
    .grid {
      flex: 1;
    }
    .row:not(.head) {
      flex: 1 1 0;
      min-height: 56px;
    }
    .cell-wrap {
      display: grid;
    }
    .cell {
      aspect-ratio: auto;
      padding-top: 8px;
      gap: 6px;
    }
  }
  @media (min-width: 520px) {
    .dot {
      width: 9px;
      height: 9px;
    }
    .dots {
      max-width: 40px;
    }
  }
</style>
