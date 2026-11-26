<script lang="ts">
  import type { FightTestResult, RollRecord } from "../format/types";
  import Die from "./Die.svelte";
  import { sectionDestination } from "./wording";

  let {
    compact,
    standing = false,
    hint = "",
    passStake = "",
    failStake = "",
    settled = null,
    onSkip,
    label,
    dice,
    formula,
    adjustment,
    ready,
    roll,
    rolling,
    rollingIndexes,
    previewFaces,
    passTo,
    passTitle,
    failTo,
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
    /** A standing exit beside choices (P32): it has no Close. */
    standing?: boolean;
    /** The muted line under the destinations when a result stays here and the player chooses below. */
    hint?: string;
    /** P35, a test before a fight: a result that opens the fight, as in "Pass · Fight as normal". */
    passStake?: string;
    failStake?: string;
    /** P35: how the test before the fight was settled. The card stays as a settled result. */
    settled?: FightTestResult | null;
    /** P35: shown on a test the section offers ("you can try"), before the roll. */
    onSkip?: () => void;
    label: string;
    dice: string;
    formula: string;
    adjustment: string;
    ready: boolean;
    roll: RollRecord | null;
    rolling: boolean;
    rollingIndexes: number[];
    previewFaces: number[];
    passTo: string;
    passTitle: string;
    failTo: string;
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
  const passDest = $derived(sectionDestination("Pass", passTo, passTitle));
  const failDest = $derived(sectionDestination("Fail", failTo, failTitle));

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
  class:standing
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
        <Die {face} {index} selected={selected === index} onSelect={settled ? undefined : onSelect} />
      {/each}
    </div>
    <p class="result {roll.success ? "ok" : "bad"}" data-testid="test-result" role="status" aria-live="polite">
      {resultLabel(roll, adjustment)}
    </p>
  {/if}
  {#if passTo || failTo || passStake || failStake}
  <div class="dest">
    {#if passTo || passStake}
    <button
      type="button"
      class="btn"
      class:ghost={settled ? settled !== "pass" : rolling || !roll?.success}
      data-testid="destination-pass"
      aria-label={passStake || passDest.name}
      disabled={!ready || rolling || !roll?.success || settled !== null}
      onclick={onArrive}
    >
      {#if passStake}
        <span class="dest-keep">{passStake}</span>
      {:else}
        <span class="dest-keep">{passDest.prefix}</span><span class="dest-title">{passDest.title}</span>
      {/if}
    </button>
    {/if}
    {#if failTo || failStake}
    <button
      type="button"
      class="btn"
      class:ghost={settled ? settled !== "fail" : rolling || !roll || roll.success}
      data-testid="destination-fail"
      aria-label={failStake || failDest.name}
      disabled={!ready || rolling || !roll || roll.success || settled !== null}
      onclick={onArrive}
    >
      {#if failStake}
        <span class="dest-keep">{failStake}</span>
      {:else}
        <span class="dest-keep">{failDest.prefix}</span><span class="dest-title">{failDest.title}</span>
      {/if}
    </button>
    {/if}
  </div>
  {/if}
  {#if hint}
    <p class="fail-hint" data-testid="test-hint">{hint}</p>
  {/if}
  {#if !roll && !rolling && !compact && !settled}
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
  {#if !roll && !settled}
    <button type="button" class="btn" data-testid="roll-test" disabled={!ready || rolling} onclick={useDice}>
      {manual && !compact ? "Use these dice" : `Roll ${dice}`}
    </button>
    {#if onSkip}
      <button type="button" class="btn ghost skip-test" data-testid="skip-test" disabled={!ready || rolling} onclick={onSkip}>Skip the test</button>
    {/if}
  {/if}
  <div class="fortune-row">
    <button
      type="button"
      class="btn ghost"
      data-testid="fortune-reroll"
      disabled={!ready || rolling || !roll || selected === null || fortune < fortuneCost || settled !== null}
      onclick={onReroll}
    >
      Spend {fortuneCost} Fortune: re-roll selected die
    </button>
    <span class="note fortune-count" data-testid="fortune-count">Fortune {fortune} / {fortuneMax}</span>
  </div>
  {#if compact}
    <div class="test-tools">
      <button type="button" class="btn ghost" data-testid="open-full-test" onclick={onFull}>Full test</button>
      {#if !standing}
        <button type="button" class="btn ghost" data-testid="close-test" onclick={onClose}>Close</button>
      {/if}
    </div>
  {/if}
</section>
