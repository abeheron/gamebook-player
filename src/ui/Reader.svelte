<script lang="ts">
  import { onMount } from "svelte";
  import { isSampleArtId } from "../format/sample-art";
  import type { Section } from "../format/types";
  import type { IllustrationMode } from "./dice-prefs";
  import SampleArt from "./SampleArt.svelte";
  import TickBox from "./TickBox.svelte";

  const modes: { id: IllustrationMode; label: string }[] = [
    { id: "inline", label: "Inline" },
    { id: "link", label: "Link only" },
    { id: "hidden", label: "Hidden" },
  ];

  let {
    section,
    ticks,
    panelOpen,
    onOpenTest,
    bookmarked,
    onBookmark,
    illustrations,
    onIllustrations,
    onOpenArt,
  }: {
    section: Section;
    ticks: { id: string; label: string; count: number }[];
    panelOpen: boolean;
    onOpenTest: () => void;
    bookmarked: boolean;
    onBookmark: () => void;
    illustrations: IllustrationMode;
    onIllustrations: (mode: IllustrationMode) => void;
    onOpenArt: () => void;
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
  {#if section.illustration && isSampleArtId(section.illustration.id)}
    {@const art = section.illustration}
    <div class="prefrow" data-testid="illus-pref">
      <span>Illustrations:</span>
      <div class="seg sm" role="group" aria-label="Illustration display">
        {#each modes as mode (mode.id)}
          <button
            type="button"
            data-testid="illus-mode-{mode.id}"
            aria-pressed={illustrations === mode.id}
            onclick={() => onIllustrations(mode.id)}
          >
            {mode.label}
          </button>
        {/each}
      </div>
    </div>
    {#if illustrations === "inline"}
      <figure class="illus" data-testid="illus-figure">
        <button
          type="button"
          class="frame"
          data-testid="illus-open"
          aria-label="Open {art.title} full size"
          onclick={onOpenArt}
        >
          <SampleArt id={art.id} alt={art.alt} />
        </button>
        <figcaption>
          <span class="prov">{art.label}</span>
          <span>Placeholder SVG drawn for this prototype, not a scan or AI image. Select it to view full size.</span>
        </figcaption>
      </figure>
    {:else if illustrations === "link"}
      <p class="illus" data-testid="illus-link-row">
        <button type="button" class="illus-link" data-testid="illus-open" onclick={onOpenArt}>
          View illustration for section {section.id}
        </button>
        <span class="prov">{art.label}</span>
      </p>
    {/if}
  {/if}
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
