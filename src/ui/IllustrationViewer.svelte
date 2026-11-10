<script lang="ts">
  import type { Illustration } from "../format/types";
  import SampleArt from "./SampleArt.svelte";

  let { art, onClose }: { art: Illustration; onClose: () => void } = $props();

  let closeButton = $state<HTMLButtonElement | null>(null);

  $effect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
      } else if (event.key === "Tab") {
        event.preventDefault();
        closeButton?.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    queueMicrotask(() => closeButton?.focus());
    return () => window.removeEventListener("keydown", onKey, true);
  });

  function onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) onClose();
  }
</script>

<div
  class="lightbox"
  data-testid="illus-viewer"
  role="dialog"
  tabindex="-1"
  aria-modal="true"
  aria-labelledby="illus-title"
  onclick={onBackdrop}
  onkeydown={(event) => {
    if (event.key === "Escape") onClose();
  }}
>
  <div class="inner">
    <div class="bar2">
      <span id="illus-title">{art.title} · {art.label} (demo placeholder)</span>
      <button type="button" class="close" data-testid="illus-close" bind:this={closeButton} onclick={onClose}>
        Close (Esc)
      </button>
    </div>
    <SampleArt id={art.id} alt={art.alt} />
  </div>
</div>
