<script lang="ts">
  import { onMount } from "svelte";
  import { router } from "./lib/router.svelte.ts";
  import { app } from "./lib/store.svelte.ts";
  import Activities from "./pages/Activities.svelte";
  import Changes from "./pages/Changes.svelte";
  import Home from "./pages/Home.svelte";
  import Settings from "./pages/Settings.svelte";

  onMount(() => {
    void app.init();
    // Notice midnight and timezone changes (travel), and refresh when coming back to the tab.
    const timer = setInterval(() => app.tick(), 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        app.tick();
        void app.refreshToday();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  });
</script>

<main>
  {#if app.loadError}
    <div class="card failed" role="alert">
      <h2>Can't load Daymark</h2>
      <p class="muted">{app.loadError}</p>
      <button class="btn btn-primary" onclick={() => app.init()}>Try again</button>
    </div>
  {:else if !app.me}
    <p class="muted loading" aria-live="polite">Loading…</p>
  {:else if router.route === "activities"}
    <Activities />
  {:else if router.route === "changes"}
    <Changes />
  {:else if router.route === "settings"}
    <Settings />
  {:else}
    <Home />
  {/if}
</main>

{#if app.toast}
  <div class="toast" role="status">{app.toast.message}</div>
{/if}

<style>
  main {
    max-width: 680px;
    margin: 0 auto;
    padding: calc(12px + env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
      calc(40px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  }
  .failed {
    margin-top: 20vh;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
  .loading {
    margin-top: 30vh;
    text-align: center;
  }
  .toast {
    position: fixed;
    left: 50%;
    bottom: calc(20px + env(safe-area-inset-bottom));
    transform: translateX(-50%);
    max-width: min(440px, calc(100vw - 32px));
    padding: 12px 18px;
    border-radius: 16px;
    background: var(--accent);
    color: var(--accent-ink);
    font-size: 15px;
    box-shadow: 0 10px 30px -10px rgb(0 0 0 / 0.4);
    animation: toast 0.25s var(--ease-spring);
    z-index: 100;
  }
  @keyframes toast {
    from {
      opacity: 0;
      transform: translate(-50%, 10px);
    }
  }
</style>
