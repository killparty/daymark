<script lang="ts">
  import type { IconKey } from "../../shared/icons.ts";
  import { FallbackIcon, ICON_COMPONENTS } from "../lib/icons.ts";

  let { icon, size = 20, strokeWidth = 2 }: { icon: IconKey; size?: number; strokeWidth?: number } =
    $props();

  const Icon = $derived(ICON_COMPONENTS[icon] ?? FallbackIcon);
</script>

<!-- Lucide icons are aria-hidden by default. -->
<Icon {size} {strokeWidth} />
