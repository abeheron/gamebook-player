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
    rolling,
    previewFaces,
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
    rolling: boolean;
    previewFaces: number[];
    destination: string;
    onRoll: (faces?: number[]) => void;
    onArrive: () => void;
    onClose: () => void;
    onFull: () => void;
  } = $props();

  let manual = $state(false);
  let manualError = $state("");
  let entries = $state<string[]>([]);

  const dieCount = $derived(Number.parseInt(dice, 10) || 0);

  function setEntry(index: number, value: string): void {
    const next = entries.slice(0, dieCount);
    while (next.length < dieCount) next.push("");
    next[index] = value;
    entries = next;
  }

  function useDice(): void {
    if (compact || !manual) {
      onRoll();
      return;
    }
    const faces = Array.from({ length: dieCount }, (_, index) => Number(entries[index]));
    if (faces.some((face) => !Number.isInteger(face) || face < 1 || face > 6)) {
      manualError = "Each die must be a whole number from 1 to 6.";
      return;
    }
    manualError = "";
    onRoll(faces);
  }
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
  {#if rolling}
    <div class="dice" aria-hidden="true">
      {#each previewFaces as face, index (`roll-${index}`)}
        <Die {face} rolling />
      {/each}
    </div>
    <p class="result" data-testid="test-result" role="status" aria-live="polite">Rolling…</p>
  {:else if roll}
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
  {/if}
  {#if !roll && !rolling && !compact}
      <div class="seg" role="group" aria-label="Dice source">
        <button type="button" aria-pressed={!manual} data-testid="dice-app" onclick={() => (manual = false)}>App dice</button>
        <button type="button" aria-pressed={manual} data-testid="dice-manual" onclick={() => (manual = true)}>My dice</button>
      </div>
      {#if manual}
        <div class="manual-dice" data-testid="manual-dice">
          {#each Array.from({ length: dieCount }, (_, index) => index) as index (index)}
            <label>
              Die {index + 1}
              <input
                type="number"
                min="1"
                max="6"
                inputmode="numeric"
                data-testid="manual-die-{index + 1}"
                value={entries[index] ?? ""}
                oninput={(event) => setEntry(index, event.currentTarget.value)}
              />
            </label>
          {/each}
        </div>
        {#if manualError}
          <p class="error" data-testid="manual-error">{manualError}</p>
        {/if}
      {/if}
  {/if}
  {#if !roll}
    <button type="button" class="btn" data-testid="roll-test" disabled={!ready || rolling} onclick={useDice}>
      {manual && !compact ? "Use these dice" : `Roll ${dice}`}
    </button>
  {/if}
  <div class="test-actions">
    {#if compact}
      <button type="button" class="btn ghost" data-testid="open-full-test" onclick={onFull}>Full test</button>
      <button type="button" class="btn ghost" data-testid="close-test" onclick={onClose}>Close</button>
    {/if}
  </div>
</section>
