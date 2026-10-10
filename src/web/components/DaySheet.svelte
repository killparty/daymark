<script lang="ts">
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import type { Entry } from "../../shared/api.ts";
  import type { IsoDate } from "../../shared/dates.ts";
  import { api } from "../lib/api.ts";
  import { formatDate, formatTime } from "../lib/format.ts";
  import { href } from "../lib/router.svelte.ts";
  import { app } from "../lib/store.svelte.ts";
  import ActivityIcon from "./ActivityIcon.svelte";
  import Sheet from "./Sheet.svelte";

  let { open = $bindable(false), date }: { open: boolean; date: IsoDate | null } = $props();

  let entries = $state<Entry[] | null>(null);
  let confirming = $state<string | null>(null);
  let busy = $state(false);
  let error = $state<string | null>(null);

  $effect(() => {
    if (!open || !date) return;
    void app.revision;
    entries = null;
    confirming = null;
    error = null;
    api
      .entries(date, date)
      .then((list) => (entries = list))
      .catch((e) => (error = e.message));
  });

  const title = $derived(
    date ? formatDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "",
  );

  async function remove(entry: Entry) {
    busy = true;
    try {
      await app.removeEntry(entry);
      const label = app.byId.get(entry.activityId)?.label ?? "Entry";
      app.notify(`${label} removed. You can bring it back from Changes.`);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      busy = false;
      confirming = null;
    }
  }
</script>

<Sheet bind:open {title}>
  {#if error}
    <p class="error" role="alert">{error}</p>
  {/if}
  {#if entries === null}
    <p class="muted">Loading…</p>
  {:else if entries.length === 0}
    <p class="muted empty">Nothing marked on this day.</p>
  {:else}
    <ul class="list">
      {#each entries as entry (entry.id)}
        {@const a = app.byId.get(entry.activityId)}
        <li>
          {#if confirming === entry.id}
            <div class="confirm">
              <p>
                Remove <strong>{a?.label}</strong> from this day? You can undo this in
                <a href={href("changes")} onclick={() => (open = false)}>Changes</a>.
              </p>
              <div class="actions">
                <button class="btn btn-sm" onclick={() => (confirming = null)} disabled={busy}>Cancel</button>
                <button class="btn btn-sm btn-danger" onclick={() => remove(entry)} disabled={busy}>
                  Remove
                </button>
              </div>
            </div>
          {:else}
            <span class="badge" style="--c: var(--c-{a?.color ?? 'slate'})">
              <ActivityIcon icon={a?.icon ?? "circle"} size={18} />
            </span>
            <span class="what">
              <strong>{a?.label ?? "Unknown activity"}</strong>
              <span class="muted small">
                {formatTime(entry.loggedAt, entry.timeZone)}
                {#if entry.timeZone !== app.timeZone}· {entry.timeZone.replaceAll("_", " ")}{/if}
                {#if entry.source !== "web"}· {entry.source}{/if}
              </span>
            </span>
            <button
              class="icon-btn"
              aria-label="Remove {a?.label ?? 'entry'} from this day"
              onclick={() => (confirming = entry.id)}
            >
              <Trash2 size={18} />
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</Sheet>

<style>
  .empty {
    padding: 8px 0 16px;
  }
  .list > li {
    padding: 10px 0;
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
  .what {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .confirm {
    flex: 1;
  }
  .confirm p {
    margin: 0 0 10px;
  }
  .confirm a {
    color: inherit;
  }
  .actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  .error {
    color: var(--danger);
  }
</style>
