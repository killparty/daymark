<script lang="ts">
  import Undo2 from "@lucide/svelte/icons/undo-2";
  import type { ActivitySnapshot, Change } from "../../shared/api.ts";
  import { COLOR_LABELS } from "../../shared/palette.ts";
  import ActivityIcon from "../components/ActivityIcon.svelte";
  import PageHeader from "../components/PageHeader.svelte";
  import { api } from "../lib/api.ts";
  import { formatDate, formatDateTime } from "../lib/format.ts";
  import { app } from "../lib/store.svelte.ts";

  let changes = $state<Change[]>([]);
  let loading = $state(true);
  let more = $state(true);
  let error = $state<string | null>(null);
  let confirming = $state<string | null>(null);
  let busy = $state(false);

  async function load(reset = false) {
    loading = true;
    try {
      const before = reset ? undefined : changes.at(-1)?.id;
      const page = await api.changes(before);
      changes = reset ? page : [...changes, ...page];
      more = page.length === 50;
      error = null;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  void load(true);

  function day(date?: string) {
    return date ? formatDate(date, { weekday: "short", day: "numeric", month: "short" }) : "";
  }

  function describe(c: Change): string {
    const name = c.data.activity?.label ?? "an activity";
    switch (c.action) {
      case "entry.logged":
        return `Marked ${name} on ${day(c.data.date)}`;
      case "entry.removed":
        return `Removed ${name} from ${day(c.data.date)}`;
      case "entry.restored":
        return `Brought back ${name} on ${day(c.data.date)}`;
      case "activity.created":
        return `Added activity ${name}`;
      case "activity.archived":
        return `Archived ${name}`;
      case "activity.unarchived":
        return `Restored ${name}`;
      case "activity.updated": {
        const b = c.data.before as Partial<ActivitySnapshot>;
        const a = c.data.after as Partial<ActivitySnapshot>;
        const parts: string[] = [];
        if (a.label) parts.push(`renamed ${b.label} to ${a.label}`);
        if (a.color && b.color) parts.push(`color ${COLOR_LABELS[b.color]} → ${COLOR_LABELS[a.color]}`);
        if (a.icon) parts.push("changed icon");
        const text = parts.join(", ");
        return a.label ? text.charAt(0).toUpperCase() + text.slice(1) : `${name}: ${text}`;
      }
      case "activities.reordered":
        return "Reordered activities";
      case "data.imported":
        return `Imported ${c.data.activities ?? 0} activities and ${c.data.entries ?? 0} entries`;
    }
  }

  async function revert(c: Change) {
    busy = true;
    try {
      await api.revertChange(c.id);
      await app.reloadAll();
      await load(true);
      app.notify("Reverted.");
    } catch (e) {
      app.notify(e instanceof Error ? e.message : String(e));
    } finally {
      busy = false;
      confirming = null;
    }
  }
</script>

<PageHeader title="Changes" />

<p class="intro muted">
  Everything you do is recorded here. Removed something by accident? Revert it. Reverting is a
  change too, so it can be reverted as well.
</p>

{#if error}<p class="error" role="alert">{error}</p>{/if}

<div class="card">
  {#if !loading && changes.length === 0}
    <p class="muted none">Nothing yet.</p>
  {:else}
    <ul class="list">
      {#each changes as c (c.id)}
        <li class:reverted={!!c.revertedAt}>
          <span class="badge" style="--c: var(--c-{c.data.activity?.color ?? 'slate'})">
            {#if c.data.activity}
              <ActivityIcon icon={c.data.activity.icon} size={16} />
            {/if}
          </span>
          <span class="what">
            <span>{describe(c)}</span>
            <span class="muted small">
              {formatDateTime(c.at)}
              {#if c.source !== "web"}· {c.source}{/if}
              {#if c.data.reverts}· revert{/if}
              {#if c.revertedAt}· reverted{/if}
            </span>
            {#if confirming === c.id}
              <span class="confirm">
                <button class="btn btn-sm" onclick={() => (confirming = null)} disabled={busy}>Cancel</button>
                <button class="btn btn-sm btn-primary" onclick={() => revert(c)} disabled={busy}>Revert</button>
              </span>
            {/if}
          </span>
          {#if c.revertible && confirming !== c.id}
            <button class="icon-btn" aria-label="Revert: {describe(c)}" onclick={() => (confirming = c.id)}>
              <Undo2 size={18} />
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

{#if more && changes.length > 0}
  <button class="btn more" disabled={loading} onclick={() => load()}>Show older</button>
{/if}

<style>
  .intro {
    margin: -8px 4px 16px;
  }
  .none {
    padding: 16px;
    margin: 0;
  }
  .badge {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 9px;
    background: color-mix(in srgb, var(--c) 16%, transparent);
    color: var(--c);
    flex: none;
    align-self: flex-start;
    margin-top: 2px;
  }
  .what {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .reverted .what > span:first-child {
    text-decoration: line-through;
    color: var(--ink-3);
  }
  .confirm {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }
  .more {
    width: 100%;
    margin-top: 12px;
  }
  .error {
    color: var(--danger);
  }
</style>
