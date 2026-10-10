<script lang="ts">
  import Archive from "@lucide/svelte/icons/archive";
  import ArchiveRestore from "@lucide/svelte/icons/archive-restore";
  import ArrowDown from "@lucide/svelte/icons/arrow-down";
  import ArrowUp from "@lucide/svelte/icons/arrow-up";
  import Pencil from "@lucide/svelte/icons/pencil";
  import Plus from "@lucide/svelte/icons/plus";
  import type { Activity } from "../../shared/api.ts";
  import ActivityEditor from "../components/ActivityEditor.svelte";
  import ActivityIcon from "../components/ActivityIcon.svelte";
  import PageHeader from "../components/PageHeader.svelte";
  import { api } from "../lib/api.ts";
  import { app } from "../lib/store.svelte.ts";

  let editorOpen = $state(false);
  let editing = $state<Activity | null>(null);
  let busy = $state(false);

  const archived = $derived(app.activities.filter((a) => a.archivedAt));

  function edit(activity: Activity | null) {
    editing = activity;
    editorOpen = true;
  }

  async function run(action: () => Promise<unknown>, message?: string) {
    busy = true;
    try {
      await action();
      await app.refreshActivities();
      app.revision++;
      if (message) app.notify(message);
    } catch (e) {
      app.notify(e instanceof Error ? e.message : String(e));
    } finally {
      busy = false;
    }
  }

  function move(index: number, delta: number) {
    const ids = app.active.map((a) => a.id);
    const [id] = ids.splice(index, 1);
    if (!id) return;
    ids.splice(index + delta, 0, id);
    void run(() => api.reorderActivities(ids));
  }
</script>

<PageHeader title="Activities" />

<section>
  <h2 class="section-title">Buttons</h2>
  <div class="card">
    {#if app.active.length === 0}
      <p class="muted none">No activities yet.</p>
    {:else}
      <ul class="list">
        {#each app.active as a, i (a.id)}
          <li>
            <span class="badge" style="--c: var(--c-{a.color})"><ActivityIcon icon={a.icon} size={18} /></span>
            <span class="name">{a.label}</span>
            <span class="tools">
              <button class="icon-btn" aria-label="Move {a.label} up" disabled={busy || i === 0} onclick={() => move(i, -1)}>
                <ArrowUp size={18} />
              </button>
              <button
                class="icon-btn"
                aria-label="Move {a.label} down"
                disabled={busy || i === app.active.length - 1}
                onclick={() => move(i, 1)}
              >
                <ArrowDown size={18} />
              </button>
              <button class="icon-btn" aria-label="Edit {a.label}" onclick={() => edit(a)}>
                <Pencil size={18} />
              </button>
              <button
                class="icon-btn"
                aria-label="Archive {a.label}"
                disabled={busy}
                onclick={() => run(() => api.archiveActivity(a.id), `${a.label} archived. Its history stays in the calendar.`)}
              >
                <Archive size={18} />
              </button>
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
  <p class="hint muted small">
    The order here is the order of the buttons. On a Daymark device, the first activities get the
    physical buttons.
  </p>
  <button class="btn btn-primary add" onclick={() => edit(null)}>
    <Plus size={18} /> Add activity
  </button>
</section>

{#if archived.length}
  <section>
    <h2 class="section-title">Archived</h2>
    <div class="card">
      <ul class="list">
        {#each archived as a (a.id)}
          <li class="archived">
            <span class="badge" style="--c: var(--c-{a.color})"><ActivityIcon icon={a.icon} size={18} /></span>
            <span class="name">{a.label}</span>
            <button
              class="btn btn-sm"
              disabled={busy}
              onclick={() => run(() => api.unarchiveActivity(a.id), `${a.label} is back.`)}
            >
              <ArchiveRestore size={16} /> Restore
            </button>
          </li>
        {/each}
      </ul>
    </div>
  </section>
{/if}

<ActivityEditor bind:open={editorOpen} activity={editing} />

<style>
  section {
    margin-bottom: 28px;
  }
  .none {
    padding: 16px;
    margin: 0;
  }
  .badge {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 11px;
    background: var(--c);
    color: var(--card-raised);
    flex: none;
  }
  .name {
    flex: 1;
    min-width: 0;
    font-weight: 560;
    overflow-wrap: anywhere;
  }
  .tools {
    display: flex;
    margin-right: -10px;
  }
  .tools .icon-btn {
    width: 40px;
  }
  .archived .badge {
    opacity: 0.6;
  }
  .hint {
    margin: 10px 4px 16px;
  }
  .add {
    width: 100%;
  }
</style>
