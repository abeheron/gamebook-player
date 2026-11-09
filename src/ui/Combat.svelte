<script lang="ts">
  import type { CombatDef, RollRecord } from "../format/types";
  import { roundMarks, roundName, roundSummary, type RoundMark } from "./combat-rounds";
  import Die from "./Die.svelte";

  let {
    combat,
    formula,
    round,
    rounds,
    rolls,
    vitality,
    vitalityMax,
    ready,
    held,
    continueTitle,
    defeated,
    onRoll,
    onContinue,
  }: {
    combat: CombatDef;
    formula: string;
    round: number;
    rounds: number;
    rolls: RollRecord[];
    vitality: number;
    vitalityMax: number;
    ready: boolean;
    held: boolean;
    continueTitle: string;
    defeated: boolean;
    onRoll: () => void;
    onContinue: () => void;
  } = $props();

  const marks = $derived(roundMarks(rolls.map((entry) => entry.success), rounds, held));
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
        {defeated ? `Defeat · turn to ${continueTitle}` : `You win the fight · turn to ${continueTitle}`}
      </p>
    {/if}
  </div>
  {#if rolls.length > 0}
    {@const last = rolls[rolls.length - 1]}
    {#if last}
      <div class="dice">
        {#each last.faces as face, index (`${last.total}-${index}`)}
          <Die {face} />
        {/each}
      </div>
      <p class="result {last.success ? "ok" : "bad"}" data-testid="combat-roll">
        {last.faces.join(" + ")} = {last.total}. {last.success ? "You hold." : "You are hit."}
      </p>
    {/if}
  {/if}
  {#if held}
    <div class="dest">
      <button type="button" class="btn" data-testid="fight-continue" disabled={!ready} onclick={onContinue}>
        {defeated ? "Vitality is 0" : "Fight over"} → {continueTitle}
      </button>
      <p class="why">The round is saved when you continue. This does not undo earlier rounds.</p>
    </div>
  {:else}
    <button type="button" class="btn" data-testid="roll-combat" disabled={!ready} onclick={onRoll}>
      Resolve round {round}
    </button>
  {/if}
</section>
