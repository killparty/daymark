<script lang="ts">
  import type { CreateActivityBody } from "../../shared/api.ts";
  import ActivityButton from "../components/ActivityButton.svelte";
  import ActivityIcon from "../components/ActivityIcon.svelte";
  import CalendarCard from "../components/CalendarCard.svelte";
  import PageHeader from "../components/PageHeader.svelte";
  import { api } from "../lib/api.ts";
  import { formatDate } from "../lib/format.ts";
  import { href } from "../lib/router.svelte.ts";
  import { app } from "../lib/store.svelte.ts";

  const suggestions: CreateActivityBody[] = [
    { label: "Yoga", color: "green", icon: "flower" },
    { label: "Gym", color: "blue", icon: "dumbbell" },
    { label: "Run", color: "orange", icon: "footprints" },
    { label: "Swim", color: "teal", icon: "waves" },
  ];

  let adding = $state(false);

  async function add(s: CreateActivityBody) {
    adding = true;
    try {
      await api.createActivity(s);
      await app.refreshActivities();
    } catch (e) {
      app.notify(e instanceof Error ? e.message : String(e));
    } finally {
      adding = false;
    }
  }

  const subtitle = $derived(formatDate(app.today, { weekday: "long", day: "numeric", month: "long" }));
  const doneCount = $derived(app.active.filter((a) => app.isDoneToday(a.id)).length);
</script>

<div class="home">
  <div class="side">
    <PageHeader title="Daymark" {subtitle} />

    {#if app.active.length === 0}
      <section class="card empty">
        <h2>What do you want to mark?</h2>
        <p class="muted">
          Each activity becomes a button. Press it on a day you did it, and the day gets a dot.
        </p>
        <div class="suggestions">
          {#each suggestions as s}
            <button class="btn" style="--c: var(--c-{s.color})" disabled={adding} onclick={() => add(s)}>
              <span class="sicon"><ActivityIcon icon={s.icon} size={18} /></span>
              {s.label}
            </button>
          {/each}
        </div>
        <a class="btn btn-primary" href={href("activities")}>Create your own</a>
      </section>
    {:else}
      <section aria-label="Today's activities">
        <p class="visually-hidden" aria-live="polite">
          {doneCount} of {app.active.length} marked today
        </p>
        <div class="buttons">
          {#each app.active as activity (activity.id)}
            <ActivityButton {activity} />
          {/each}
        </div>
      </section>
    {/if}
  </div>

  <div class="main">
    <CalendarCard />
  </div>
</div>

<style>
  .buttons {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 20px;
  }
  @media (min-width: 560px) {
    .buttons {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }
  }
  @media (max-width: 340px) {
    .buttons {
      grid-template-columns: 1fr;
    }
  }
  /* Wide screens (iPad landscape, laptops): buttons in a sidebar, the calendar fills the rest. */
  @media (min-width: 1000px) {
    .home {
      display: grid;
      grid-template-columns: 300px minmax(0, 1fr);
      gap: 32px;
      align-items: start;
    }
    /* Stays in view while a short window scrolls the calendar. When the sidebar is taller than
       the calendar, there is no room to stick and it scrolls with the page. */
    .side {
      position: sticky;
      top: calc(24px + env(safe-area-inset-top));
    }
    .buttons {
      grid-template-columns: 1fr;
    }
  }
  .empty {
    padding: 24px 20px;
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  .empty h2 {
    font-family: var(--font-rounded);
    font-size: 21px;
  }
  .empty p {
    margin: 0;
  }
  .suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .sicon {
    color: var(--c);
    display: inline-grid;
  }
</style>
