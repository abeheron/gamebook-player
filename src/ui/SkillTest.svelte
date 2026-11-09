<script lang="ts">
  import type { RollRecord } from "../format/types";
  import Die from "./Die.svelte";

  let {
    compact,
    label,
    dice,
    formula,
    adjustment,
    ready,
    roll,
    destination,
    onRoll,
    onArrive,
    onClose,
    onFull,
  }: {
    compact: boolean;
    label: string;
    dice: string;
    formula: string;
    adjustment: string;
    ready: boolean;
    roll: RollRecord | null;
    destination: string;
    onRoll: () => void;
    onArrive: () => void;
    onClose: () => void;
    onFull: () => void;
  } = $props();
</script>

<section
  id={compact ? "skill-test-panel" : undefined}
  class="card test-panel"
  class:compact
  data-testid={compact ? "test-panel" : "test-full"}
  aria-label="Skill test"
>
  <h2>{label}</h2>
  <p class="formula" data-testid="test-formula">{formula}</p>
  <p class="note">Pass on this total or under. This sample does not spend Fortune.</p>
  {#if roll}
    <div class="dice" aria-hidden="true">
      {#each roll.faces as face, index (`${roll.total}-${index}`)}
        <Die {face} />
      {/each}
    </div>
    <p class="result {roll.success ? "ok" : "bad"}" data-testid="test-result" role="status" aria-live="polite">
      {roll.faces.join(" + ")} = {roll.total}.{adjustment ? ` ${adjustment}.` : ""} {roll.success ? "Pass." : "Fail."}
    </p>
    <button type="button" class="btn" data-testid="destination-go" disabled={!ready} onclick={onArrive}>
      {roll.success ? "Pass" : "Fail"} → {destination}
    </button>
  {:else}
    <button type="button" class="btn" data-testid="roll-test" disabled={!ready} onclick={onRoll}>
      Roll {dice}
    </button>
  {/if}
  <div class="test-actions">
    {#if compact}
      <button type="button" class="btn ghost" data-testid="open-full-test" onclick={onFull}>Full test</button>
      <button type="button" class="btn ghost" data-testid="close-test" onclick={onClose}>Close</button>
    {/if}
  </div>
</section>
