<script lang="ts">
  import type { Section } from "../format/types";
  import TickBox from "./TickBox.svelte";

  let { section, ticks, panelOpen, onOpenTest }: {
    section: Section;
    ticks: { id: string; label: string; count: number }[];
    panelOpen: boolean;
    onOpenTest: () => void;
  } = $props();
</script>

<article class="reader" data-testid="reader">
  <p class="secno">Section {section.id}</p>
  <h1 data-testid="section-title">{section.title}</h1>
  {#each ticks as tick (tick.id)}
    <p class="tickrow">
      <TickBox ticked={tick.count > 0} label={tick.label} />
      <span>{tick.label}{tick.count > 0 ? `: ${tick.count}` : ""}</span>
    </p>
  {/each}
  <div class="prose" data-testid="section-body">
    {#each section.body as paragraph}
      <p>{paragraph}</p>
    {/each}
  </div>
  {#if section.test}
    <button
      id="open-test"
      type="button"
      class="choice"
      data-testid="open-test"
      aria-expanded={panelOpen}
      aria-controls={panelOpen ? "skill-test-panel" : undefined}
      onclick={onOpenTest}
    >
      <span>{section.test.label}</span>
      <span class="to">test</span>
    </button>
  {/if}
</article>
