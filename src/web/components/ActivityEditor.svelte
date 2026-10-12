<script lang="ts">
  import { untrack } from "svelte";
  import type { Activity, CreateActivityBody } from "../../shared/api.ts";
  import { LABEL_MAX } from "../../shared/api.ts";
  import { ICONS, type IconKey } from "../../shared/icons.ts";
  import { COLOR_LABELS, COLORS, type ColorKey } from "../../shared/palette.ts";
  import { api } from "../lib/api.ts";
  import { app } from "../lib/store.svelte.ts";
  import ActivityIcon from "./ActivityIcon.svelte";
  import Sheet from "./Sheet.svelte";

  let {
    open = $bindable(false),
    activity = null,
  }: { open: boolean; activity?: Activity | null } = $props();

  let label = $state("");
  let color = $state<ColorKey>("green");
  let icon = $state<IconKey>("dumbbell");
  let busy = $state(false);
  let error = $state<string | null>(null);

  // Reset the form each time the sheet opens, and only then: a background sync replacing the
  // activity list must not wipe what is being typed.
  $effect(() => {
    if (!open) return;
    untrack(() => {
      label = activity?.label ?? "";
      color = activity?.color ?? COLORS[app.active.length % COLORS.length] ?? "green";
      icon = activity?.icon ?? "dumbbell";
      error = null;
    });
  });

  async function save(e: SubmitEvent) {
    e.preventDefault();
    const body: CreateActivityBody = { label: label.trim(), color, icon };
    if (!body.label) {
      error = "Give it a name.";
      return;
    }
    busy = true;
    try {
      if (activity) await api.updateActivity(activity.id, body);
      else await api.createActivity(body);
      await app.refreshActivities();
      app.revision++;
      open = false;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      busy = false;
    }
  }
</script>

<Sheet bind:open title={activity ? "Edit activity" : "New activity"}>
  <form id="activity-form" onsubmit={save}>
    <div class="preview" style="--c: var(--c-{color})" aria-hidden="true">
      <span class="picon"><ActivityIcon {icon} size={24} strokeWidth={2.2} /></span>
      <span class="plabel">{label.trim() || "Activity"}</span>
    </div>

    <label class="field">
      <span>Name</span>
      <input
        type="text"
        bind:value={label}
        maxlength={LABEL_MAX}
        placeholder="e.g. Yoga"
        autocomplete="off"
        required
      />
    </label>

    <fieldset>
      <legend>Color</legend>
      <div class="colors">
        {#each COLORS as c}
          <label class="color" style="--c: var(--c-{c})" title={COLOR_LABELS[c]}>
            <input type="radio" name="color" value={c} bind:group={color} />
            <span class="visually-hidden">{COLOR_LABELS[c]}</span>
          </label>
        {/each}
      </div>
    </fieldset>

    <fieldset>
      <legend>Icon <span class="muted small">(so it's recognisable without color, too)</span></legend>
      <div class="icons">
        {#each ICONS as i}
          <label class="icon" style="--c: var(--c-{color})" title={i}>
            <input type="radio" name="icon" value={i} bind:group={icon} />
            <ActivityIcon icon={i} size={20} />
            <span class="visually-hidden">{i}</span>
          </label>
        {/each}
      </div>
    </fieldset>

    {#if error}<p class="error" role="alert">{error}</p>{/if}
  </form>

  {#snippet footer()}
    <button class="btn" type="button" onclick={() => (open = false)}>Cancel</button>
    <button class="btn btn-primary" type="submit" form="activity-form" disabled={busy}>
      {activity ? "Save" : "Add"}
    </button>
  {/snippet}
</Sheet>

<style>
  form {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .preview {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-radius: var(--radius-lg);
    border: 1.5px solid color-mix(in srgb, var(--c) 45%, var(--border));
    background: color-mix(in srgb, var(--c) 12%, var(--card-raised));
  }
  .picon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: var(--c);
    color: var(--card-raised);
  }
  .plabel {
    font-family: var(--font-rounded);
    font-size: 18px;
    font-weight: 650;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-weight: 560;
  }
  input[type="text"] {
    min-height: 46px;
    padding: 0 14px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-strong);
    background: var(--card-raised);
    font-size: 17px;
  }
  fieldset {
    border: none;
    padding: 0;
    margin: 0;
  }
  legend {
    font-weight: 560;
    margin-bottom: 8px;
    padding: 0;
  }
  .colors {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .color {
    position: relative;
    width: 36px;
    height: 36px;
    border-radius: 999px;
    background: var(--c);
    cursor: pointer;
  }
  .color:has(input:checked) {
    box-shadow:
      0 0 0 3px var(--card),
      0 0 0 5px var(--c);
  }
  .color:has(input:focus-visible),
  .icon:has(input:focus-visible) {
    outline: 3px solid var(--focus);
    outline-offset: 3px;
  }
  .icons {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
    gap: 6px;
  }
  .icon {
    display: grid;
    place-items: center;
    height: 44px;
    border-radius: var(--radius-sm);
    color: var(--ink-2);
    cursor: pointer;
    background: color-mix(in srgb, var(--ink) 4%, transparent);
  }
  .icon:has(input:checked) {
    background: var(--c);
    color: var(--card-raised);
  }
  input[type="radio"] {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
  }
  .error {
    color: var(--danger);
    margin: 0;
  }
</style>
