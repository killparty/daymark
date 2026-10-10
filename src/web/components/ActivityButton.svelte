<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import type { Activity } from "../../shared/api.ts";
  import { app } from "../lib/store.svelte.ts";
  import ActivityIcon from "./ActivityIcon.svelte";

  let { activity }: { activity: Activity } = $props();

  const done = $derived(app.isDoneToday(activity.id));
  /** Plays the celebration only for a press made in this session, not on page load. */
  let celebrating = $state(false);
  let nudging = $state(false);

  function onclick() {
    if (done) {
      // Already marked today. A press never undoes; just a gentle nudge.
      nudging = true;
      setTimeout(() => (nudging = false), 400);
      return;
    }
    celebrating = true;
    setTimeout(() => (celebrating = false), 900);
    void app.press(activity);
  }
</script>

<button
  class="activity"
  class:done
  class:celebrating
  class:nudging
  style="--c: var(--c-{activity.color})"
  aria-pressed={done}
  aria-label={done ? `${activity.label}, done today` : `Mark ${activity.label} as done today`}
  {onclick}
>
  <span class="burst" aria-hidden="true"></span>
  <span class="icon">
    <ActivityIcon icon={activity.icon} size={24} strokeWidth={2.2} />
  </span>
  <span class="label">{activity.label}</span>
  <span class="state" aria-hidden="true">
    {#if done}
      <span class="check"><Check size={14} strokeWidth={3.2} /></span>
      Done
    {:else}
      Tap to mark
    {/if}
  </span>
</button>

<style>
  .activity {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
    column-gap: 12px;
    align-items: center;
    text-align: left;
    width: 100%;
    min-height: 84px;
    padding: 14px 16px;
    border-radius: var(--radius-lg);
    border: 1.5px solid var(--border);
    background: var(--card-raised);
    box-shadow:
      0 1px 0 rgb(0 0 0 / 0.04),
      0 3px 0 color-mix(in srgb, var(--border-strong) 70%, transparent);
    transition:
      transform 0.16s var(--ease-spring),
      box-shadow 0.16s ease,
      background-color 0.35s ease,
      border-color 0.35s ease;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
  }
  .activity:active {
    transform: translateY(2px) scale(0.98);
    box-shadow:
      0 0 0 rgb(0 0 0 / 0),
      0 1px 0 color-mix(in srgb, var(--border-strong) 70%, transparent);
  }
  .icon {
    grid-row: span 2;
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border-radius: 15px;
    color: var(--c);
    background: color-mix(in srgb, var(--c) 14%, transparent);
    transition:
      background-color 0.35s ease,
      color 0.35s ease,
      transform 0.3s var(--ease-spring);
  }
  .label {
    font-family: var(--font-rounded);
    font-size: 18px;
    font-weight: 650;
    line-height: 1.2;
    overflow-wrap: break-word;
    hyphens: auto;
    min-width: 0;
  }
  .state {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
    font-size: 13px;
    color: var(--ink-3);
  }

  /* Done: the button is filled with its color, like a marked day. */
  .done {
    border-color: color-mix(in srgb, var(--c) 45%, var(--border));
    background: color-mix(in srgb, var(--c) 12%, var(--card-raised));
    box-shadow: 0 1px 0 rgb(0 0 0 / 0.04);
  }
  .done .icon {
    background: var(--c);
    color: var(--card-raised);
  }
  .done .state {
    color: var(--ink-2);
    font-weight: 560;
  }
  .check {
    display: inline-grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 999px;
    background: var(--c);
    color: var(--card-raised);
  }

  /* The moment of the press. */
  .burst {
    position: absolute;
    z-index: -1;
    left: 40px;
    top: 50%;
    width: 48px;
    height: 48px;
    margin: -24px 0 0 -24px;
    border-radius: 999px;
    background: var(--c);
    opacity: 0;
    pointer-events: none;
  }
  .celebrating .burst {
    animation: burst 0.7s cubic-bezier(0.2, 0.7, 0.2, 1);
  }
  .celebrating .icon {
    animation: pop 0.5s var(--ease-spring);
  }
  .celebrating .check {
    animation: pop 0.45s 0.1s var(--ease-spring) backwards;
  }
  .nudging {
    animation: nudge 0.35s ease;
  }
  @keyframes burst {
    0% {
      transform: scale(0.6);
      opacity: 0.35;
    }
    100% {
      transform: scale(9);
      opacity: 0;
    }
  }
  @keyframes pop {
    0% {
      transform: scale(0.7);
    }
    60% {
      transform: scale(1.12);
    }
    100% {
      transform: scale(1);
    }
  }
  @keyframes nudge {
    25% {
      transform: translateX(-3px);
    }
    75% {
      transform: translateX(3px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .activity,
    .icon {
      transition: none;
    }
    .celebrating .burst,
    .celebrating .icon,
    .celebrating .check,
    .nudging {
      animation: none;
    }
  }
</style>
