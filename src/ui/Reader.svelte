<script lang="ts">
  import type { RollRecord, Section, TestDef } from "../format/types";
  import Die from "./Die.svelte";
  import TickBox from "./TickBox.svelte";

  let { section, ticks, formula, ready, held, passTitle, failTitle, onRollTest, onArrive }: {
    section: Section;
    ticks: { id: string; label: string; count: number }[];
    formula: string;
    ready: boolean;
    held: RollRecord | null;
    passTitle: string;
    failTitle: string;
    onRollTest: () => void;
    onArrive: () => void;
  } = $props();

  const test: TestDef | undefined = $derived(section.test);
</script>

<article class="reader" data-testid="reader" aria-live="polite">
  <p class="secno">Section {section.id}</p>
  <h1 data-testid="section-title">{section.title}</h1>
  {#each ticks as tick (tick.id)}
    <p class="tickrow">
      <TickBox ticked={tick.count > 0} label={tick.label} />
      <span>{tick.label}{tick.count > 0 ? `: ${tick.count}` : ""}</span>
    </p>
  {/each}
  <div class="prose">
    {#each section.body as paragraph}
      <p>{paragraph}</p>
    {/each}
  </div>
  {#if test}
    <div class="card mechanic">
      <h2>{test.label}</h2>
      <p class="formula" data-testid="test-formula">{formula}</p>
      <p class="note">Pass on this total or under. The sample does not add crits, fumbles, or a Fortune spend.</p>
      {#if held}
        <div class="dice">
          {#each held.faces as face, index (`${held.total}-${index}`)}
            <Die {face} />
          {/each}
        </div>
        <p class="result {held.success ? "ok" : "bad"}" data-testid="test-result">
          {held.faces.join(" + ")} = {held.total}. {held.success ? "Pass." : "Fail."}
        </p>
      {/if}
      <button type="button" class="btn" data-testid="roll-test" disabled={!ready || held !== null} onclick={onRollTest}>
        Roll {test.dice}
      </button>
      <div class="dest">
        <button
          type="button"
          class="btn"
          class:ghost={!held?.success}
          data-testid="destination-pass"
          disabled={!ready || !held?.success}
          onclick={onArrive}
        >
          Pass → {passTitle}
        </button>
        <button
          type="button"
          class="btn"
          class:ghost={held?.success !== false}
          data-testid="destination-fail"
          disabled={!ready || held?.success !== false}
          onclick={onArrive}
        >
          Fail → {failTitle}
        </button>
        <p class="why">
          {#if held}
            The matching turn uses the sample's result. It is saved when you take it.
          {:else}
            Roll first. The matching turn unlocks.
          {/if}
        </p>
      </div>
    </div>
  {/if}
</article>
