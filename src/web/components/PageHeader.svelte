<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import Menu from "@lucide/svelte/icons/menu";
  import type { Snippet } from "svelte";
  import { href, type Route, router } from "../lib/router.svelte.ts";

  let { title, subtitle, children }: { title: string; subtitle?: string; children?: Snippet } = $props();

  let menuOpen = $state(false);
  let menuEl: HTMLDivElement;

  const links: { route: Route; label: string }[] = [
    { route: "home", label: "Today" },
    { route: "activities", label: "Activities" },
    { route: "changes", label: "Changes" },
    { route: "settings", label: "Settings" },
  ];

  function onwindowclick(e: MouseEvent) {
    if (menuOpen && !menuEl.contains(e.target as Node)) menuOpen = false;
  }
</script>

<svelte:window onclick={onwindowclick} onkeydown={(e) => e.key === "Escape" && (menuOpen = false)} />

<header class="page-header">
  <div class="left">
    {#if router.route !== "home"}
      <a class="icon-btn back" href={href("home")} aria-label="Back to today">
        <ChevronLeft size={24} />
      </a>
    {/if}
    <div>
      <h1 class:wordmark={router.route === "home"}>{title}</h1>
      {#if subtitle}<p class="subtitle">{subtitle}</p>{/if}
    </div>
  </div>
  <div class="right">
    {@render children?.()}
    <div class="menu" bind:this={menuEl}>
      <button
        class="icon-btn"
        aria-label="Menu"
        aria-haspopup="true"
        aria-expanded={menuOpen}
        onclick={() => (menuOpen = !menuOpen)}
      >
        <Menu size={22} />
      </button>
      {#if menuOpen}
        <nav class="popover card" aria-label="Main">
          {#each links as link}
            <a
              href={href(link.route)}
              aria-current={router.route === link.route ? "page" : undefined}
              onclick={() => (menuOpen = false)}>{link.label}</a
            >
          {/each}
        </nav>
      {/if}
    </div>
  </div>
</header>

<style>
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 0 20px;
  }
  .left {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }
  .back {
    margin-left: -10px;
    color: var(--ink);
  }
  h1 {
    font-family: var(--font-rounded);
    font-size: 28px;
    font-weight: 720;
    letter-spacing: -0.01em;
  }
  .subtitle {
    margin: 2px 0 0;
    color: var(--ink-2);
    font-size: 15px;
  }
  .right {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .menu {
    position: relative;
  }
  .popover {
    position: absolute;
    right: 0;
    top: calc(100% + 6px);
    z-index: 10;
    min-width: 200px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    animation: appear 0.16s ease;
  }
  .popover a {
    padding: 11px 14px;
    border-radius: var(--radius-sm);
    color: var(--ink);
    text-decoration: none;
    font-weight: 540;
  }
  .popover a:hover {
    background: color-mix(in srgb, var(--ink) 6%, transparent);
  }
  .popover a[aria-current="page"] {
    background: color-mix(in srgb, var(--ink) 8%, transparent);
  }
  @keyframes appear {
    from {
      opacity: 0;
      transform: translateY(-4px) scale(0.98);
    }
  }
</style>
