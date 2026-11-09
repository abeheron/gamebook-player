<script lang="ts">
  import type { CombatDef, RollRecord } from "../format/types";
  import { roundCaption, roundLabel, roundMarks, type RoundMark } from "./combat-rounds";
  import Die from "./Die.svelte";

  let { combat, formula, round, rounds, rolls, ready, held, continueTitle, defeated, onRoll, onContinue }: {
    combat: CombatDef;
    formula: string;
    round: number;
    rounds: number;
    rolls: RollRecord[];
    ready: boolean;
    held: boolean;
    continueTitle: string;
    defeated: boolean;
    onRoll: () => void;
    onContinue: () => void;
  } = $props();

  const marks = $derived(roundMarks(rolls.map((roll) => roll.success), rounds, held));
  const caption = $derived(roundCaption(rolls.length, rounds, held));

  function glyph(mark: RoundMark, roundNumber: number): string {
    if (mark === "held") return "✓";
    if (mark === "wound") return "✗";
    return String(roundNumber);
  }
</script>

<section class="card mechanic" data-testid="combat">
  <h2>{combat.label}</h2>
  <p class="formula" data-testid="combat-formula">{formula}</p>
  <p class="note">
    {combat.rounds} rounds at this passage's penalty. A miss is one Wound. Vitality at 0 ends the fight at the passage's defeat. Otherwise you win by finishing the rounds.
  </p>
  <p class="round-caption" data-testid="combat-round-caption">{caption}</p>
  <div class="rounds" data-testid="combat-round">
    {#each marks as mark, index (index)}
      <span
        class="round {mark}"
        role="img"
        aria-label={roundLabel(index + 1, mark)}
        data-testid="combat-marker-{index + 1}"
      >
        {glyph(mark, index + 1)}
      </span>
    {/each}
  </div>
  <p class="round-legend">✓ held · ✗ wound · outline is this round</p>
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
