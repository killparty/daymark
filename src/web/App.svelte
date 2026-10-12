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
    // Notice midnight and timezone changes (travel), and changes made on another device: on a
    // timer while the page is visible, and right away when coming back to it.
    const check = () => {
      app.tick();
      void app.checkForChanges();
    };
    const timer = setInterval(check, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    window.addEventListener("online", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      window.removeEventListener("online", check);
    };
  });
</script>

<main class:wide={!["activities", "changes", "settings"].includes(router.route)}>
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
  /* Wide screens: the home page becomes a sidebar plus calendar (see Home.svelte). */
  @media (min-width: 1000px) {
    main.wide {
      max-width: 1240px;
      padding-top: calc(24px + env(safe-area-inset-top));
      padding-bottom: calc(24px + env(safe-area-inset-bottom));
    }
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
