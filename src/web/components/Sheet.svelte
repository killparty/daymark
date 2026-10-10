<script lang="ts">
  import X from "@lucide/svelte/icons/x";
  import type { Snippet } from "svelte";

  let {
    open = $bindable(false),
    title,
    children,
    footer,
  }: { open: boolean; title: string; children: Snippet; footer?: Snippet } = $props();

  let dialog: HTMLDialogElement;

  $effect(() => {
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });
</script>

<!-- A native modal dialog: focus trapping, Escape and inert background for free. -->
<dialog
  bind:this={dialog}
  aria-label={title}
  onclose={() => (open = false)}
  onclick={(e) => {
    if (e.target === dialog) open = false;
  }}
>
  {#if open}
    <div class="sheet">
      <header>
        <h2>{title}</h2>
        <button class="icon-btn" onclick={() => (open = false)} aria-label="Close">
          <X size={20} />
        </button>
      </header>
      <div class="body">
        {@render children()}
      </div>
      {#if footer}
        <footer>{@render footer()}</footer>
      {/if}
    </div>
  {/if}
</dialog>

<style>
  dialog {
    padding: 0;
    border: none;
    background: transparent;
    color: inherit;
    width: min(480px, 100vw);
    max-width: 100vw;
    max-height: 100dvh;
    margin: auto auto 0;
  }
  @media (min-width: 600px) {
    dialog {
      margin: auto;
    }
  }
  dialog::backdrop {
    background: rgb(20 18 14 / 0.35);
    backdrop-filter: blur(2px);
  }
  dialog[open] .sheet {
    animation: rise 0.28s var(--ease-spring);
  }
  .sheet {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    padding: 8px 8px calc(16px + env(safe-area-inset-bottom));
    max-height: 90dvh;
    display: flex;
    flex-direction: column;
  }
  @media (min-width: 600px) {
    .sheet {
      border-radius: var(--radius-lg);
      padding-bottom: 16px;
    }
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 4px 4px 16px;
  }
  h2 {
    font-size: 18px;
    font-weight: 650;
  }
  .body {
    overflow-y: auto;
    padding: 4px 16px 8px;
  }
  footer {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    padding: 8px 16px 0;
  }
  @keyframes rise {
    from {
      transform: translateY(24px);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    dialog[open] .sheet {
      animation: none;
    }
  }
</style>
