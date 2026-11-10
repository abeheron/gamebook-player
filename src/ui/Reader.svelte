<script lang="ts">
  import { onMount } from "svelte";
  import type { Section } from "../format/types";
  import TickBox from "./TickBox.svelte";

  let { section, ticks, panelOpen, onOpenTest, bookmarked, onBookmark }: {
    section: Section;
    ticks: { id: string; label: string; count: number }[];
    panelOpen: boolean;
    onOpenTest: () => void;
    bookmarked: boolean;
    onBookmark: () => void;
  } = $props();

  let iconOnly = $state(false);

  onMount(() => {
    const query = window.matchMedia("(max-width: 430px)");
    const apply = () => {
      iconOnly = query.matches;
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  });
</script>

<article class="reader" data-testid="reader">
  <div class="kicker">
    <p class="secno">Section {section.id}</p>
    <button
      type="button"
      class="bm"
      data-testid="bookmark"
      aria-pressed={bookmarked}
      aria-label={iconOnly ? (bookmarked ? "Bookmarked" : "Bookmark this section") : undefined}
      onclick={onBookmark}
    >
      <span class="star" aria-hidden="true">{bookmarked ? "★" : "☆"}</span><span class="txt">{bookmarked ? "Bookmarked" : "Bookmark"}</span>
    </button>
  </div>
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
