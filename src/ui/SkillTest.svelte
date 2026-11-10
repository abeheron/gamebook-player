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
    rollingIndexes,
    previewFaces,
    passTitle,
    failTitle,
    fortune,
    fortuneMax,
    fortuneCost,
    selected,
    onSelect,
    onReroll,
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
    rollingIndexes: number[];
    previewFaces: number[];
    passTitle: string;
    failTitle: string;
    fortune: number;
    fortuneMax: number;
    fortuneCost: number;
    selected: number | null;
    onSelect: (index: number) => void;
    onReroll: () => void;
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

  function resultLabel(result: RollRecord, skill: string): string {
    if (result.faces.length === 2 && result.faces[0] === 1 && result.faces[1] === 1) return "Double 1 — automatic pass";
    if (result.faces.length === 2 && result.faces[0] === 6 && result.faces[1] === 6) return "Double 6 — automatic fail";
    return `${result.faces.join(" + ")} = ${result.total}.${skill ? ` ${skill}.` : ""} ${result.success ? "Pass." : "Fail."}`;
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
  <p class="note">Double 1 always passes · double 6 always fails. Select a die, then spend Fortune to re-roll it.</p>
  {#if rolling}
    <div class="dice" aria-hidden="true">
      {#each previewFaces as face, index (`roll-${index}`)}
        <Die {face} rolling={rollingIndexes.includes(index)} />
      {/each}
    </div>
    <p class="result" data-testid="test-result" role="status" aria-live="polite">Rolling…</p>
  {:else if roll}
    <div class="dice" aria-label="Dice">
      {#each roll.faces as face, index (`${roll.total}-${index}`)}
        <Die {face} {index} selected={selected === index} onSelect={onSelect} />
      {/each}
    </div>
    <p class="result {roll.success ? "ok" : "bad"}" data-testid="test-result" role="status" aria-live="polite">
      {resultLabel(roll, adjustment)}
    </p>
  {/if}
  <div class="dest">
    <button
      type="button"
      class="btn"
      class:ghost={rolling || !roll?.success}
      data-testid="destination-pass"
      disabled={!ready || rolling || !roll?.success}
      onclick={onArrive}
    >
      Pass → {passTitle}
    </button>
    <button
      type="button"
      class="btn"
      class:ghost={rolling || !roll || roll.success}
      data-testid="destination-fail"
      disabled={!ready || rolling || !roll || roll.success}
      onclick={onArrive}
    >
      Fail → {failTitle}
    </button>
  </div>
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
    <button
      type="button"
      class="btn ghost"
      data-testid="fortune-reroll"
      disabled={!ready || rolling || !roll || selected === null || fortune < fortuneCost}
      onclick={onReroll}
    >
      Spend {fortuneCost} Fortune: re-roll selected die
    </button>
    <span class="note" data-testid="fortune-count">Fortune {fortune} / {fortuneMax}</span>
    {#if compact}
      <button type="button" class="btn ghost" data-testid="open-full-test" onclick={onFull}>Full test</button>
      <button type="button" class="btn ghost" data-testid="close-test" onclick={onClose}>Close</button>
    {/if}
  </div>
</section>
