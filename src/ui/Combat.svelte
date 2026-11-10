<script lang="ts">
  import type { CombatDef, RollRecord } from "../format/types";
  import { roundMarks, roundName, roundSummary, type RoundMark } from "./combat-rounds";
  import Die from "./Die.svelte";
  import { sectionDestination } from "./wording";

  let {
    combat,
    formula,
    round,
    rounds,
    rolls,
    rolling,
    previewFaces,
    vitality,
    vitalityMax,
    ready,
    held,
    continueTo,
    continueTitle,
    defeated,
    selected,
    fortune,
    fortuneCost,
    rollingIndexes,
    onSelect,
    onReroll,
    onRoll,
    onContinue,
  }: {
    combat: CombatDef;
    formula: string;
    round: number;
    rounds: number;
    rolls: RollRecord[];
    rolling: boolean;
    previewFaces: number[];
    vitality: number;
    vitalityMax: number;
    ready: boolean;
    held: boolean;
    continueTo: string;
    continueTitle: string;
    defeated: boolean;
    selected: number | null;
    fortune: number;
    fortuneCost: number;
    rollingIndexes: number[];
    onSelect: (index: number) => void;
    onReroll: () => void;
    onRoll: () => void;
    onContinue: () => void;
  } = $props();

  const marks = $derived(roundMarks(rolls.map((entry) => entry.success), rounds, held));
  const outcome = $derived(sectionDestination(defeated ? "Vitality is 0" : "Fight over", continueTo, continueTitle));
  const wounds = $derived(rolls.filter((entry) => !entry.success).length);
  const summary = $derived(roundSummary(rolls.length, rounds, wounds, held, vitality));

  function glyph(mark: RoundMark, roundNumber: number): string {
    if (mark === "held") return "✓";
    if (mark === "wound") return "✗";
    return String(roundNumber);
  }

  function faceClass(mark: RoundMark): string {
    if (mark === "now") return "cur";
    if (mark === "later") return "up";
    return mark;
  }
</script>

<section class="card mechanic" data-testid="combat">
  <div class="fight-tracker" role="group" aria-label={summary}>
    <div class="rt-head">
      <h2>{combat.label}</h2>
      <div class="vit" data-testid="combat-vitality" aria-label="Vitality {vitality} of {vitalityMax}">
        <span class="labs">Vitality</span>
        <span class="pips">
          {#each Array.from({ length: vitalityMax }, (_, index) => index) as index (index)}
            <span class="pip" class:on={index < vitality} class:lost={index >= vitality} aria-hidden="true"></span>
          {/each}
        </span>
        <span>{vitality}/{vitalityMax}</span>
      </div>
    </div>
    <p class="formula" data-testid="combat-formula">{formula}</p>
    <p class="note">
      {combat.rounds} rounds at this passage's penalty. A miss is one Wound. Vitality at 0 ends the fight at the passage's defeat. Otherwise you win by finishing the rounds.
    </p>
    <ul class="rounds" data-testid="combat-round">
      {#each marks as mark, index (index)}
        <li
          class="r {faceClass(mark)}"
          class:rolling={rolling && mark === "now"}
          aria-label={roundName(index + 1, mark)}
          data-testid="combat-marker-{index + 1}"
        >
          <span class="n" aria-hidden="true">{glyph(mark, index + 1)}</span>
          <span class="lbl">{mark === "now" ? "now" : mark === "later" ? "later" : mark}</span>
        </li>
      {/each}
    </ul>
    <p class="rt-sum" data-testid="combat-summary">
      <strong>{summary}</strong>{#if vitality <= 0}<span> · Vitality 0 = defeat</span>{/if}
    </p>
    {#if held}
      <p class="outcome {defeated ? "lose" : "win"}" role="status" data-testid="combat-outcome">
        {defeated ? `Defeat · turn to §${continueTo} · ${continueTitle}` : `You win the fight · turn to §${continueTo} · ${continueTitle}`}
      </p>
    {/if}
  </div>
  {#if rolling}
    <div class="dice" aria-hidden="true">
      {#each previewFaces as face, index (`roll-${index}`)}
        <Die {face} rolling={rollingIndexes.includes(index)} />
      {/each}
    </div>
    <p class="result" data-testid="dice-rolling" role="status">Rolling…</p>
  {:else if rolls.length > 0}
    {@const last = rolls[rolls.length - 1]}
    {#if last}
      <div class="dice" aria-label="Dice">
        {#each last.faces as face, index (`${last.total}-${index}`)}
          <Die {face} {index} selected={selected === index} onSelect={held ? undefined : onSelect} />
        {/each}
      </div>
      <p class="result {last.success ? "ok" : "bad"}" data-testid="combat-roll">
        {last.faces.join(" + ")} = {last.total}. {last.success ? "You hold." : "You are hit."}
      </p>
    {/if}
  {/if}
  {#if !held}
    <button
      type="button"
      class="btn ghost"
      data-testid="fortune-reroll"
      disabled={!ready || rolling || rolls.length === 0 || selected === null || fortune < fortuneCost}
      onclick={onReroll}
    >
      Spend {fortuneCost} Fortune: re-roll selected die
    </button>
  {/if}
  {#if held}
    <div class="dest">
      <button type="button" class="btn" data-testid="fight-continue" aria-label={outcome.name} disabled={!ready} onclick={onContinue}>
        <span class="dest-keep">{outcome.prefix}</span><span class="dest-title">{outcome.title}</span>
      </button>
      <p class="why">The round is saved when you continue. This does not undo earlier rounds.</p>
    </div>
  {:else}
    <button type="button" class="btn" data-testid="roll-combat" disabled={!ready || rolling} onclick={onRoll}>
      Resolve round {round}
    </button>
  {/if}
</section>
