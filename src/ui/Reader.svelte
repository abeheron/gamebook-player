<script lang="ts">
  import type { Section } from "../format/types";

  let { section, ready, onRollTest }: {
    section: Section;
    ready: boolean;
    onRollTest: () => void;
  } = $props();
</script>

<article class="reader" data-testid="reader">
  <p class="note">Section {section.id}</p>
  <h2 data-testid="section-title">{section.title}</h2>
  {#each section.body as paragraph}
    <p>{paragraph}</p>
  {/each}
  {#if section.test}
    <div class="panel">
      <h2>{section.test.label}</h2>
      <p>Roll {section.test.dice}. You pass on {section.test.dice} at or under Talent.</p>
      <button type="button" data-testid="roll-test" disabled={!ready} onclick={onRollTest}>
        Roll {section.test.dice}
      </button>
    </div>
  {/if}
</article>
