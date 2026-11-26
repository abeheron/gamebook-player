<script lang="ts" module>
  const PIPS: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
</script>

<script lang="ts">
  import type { CombatDef, RollRecord } from "../format/types";
  import { advantageUsed, replacedFaces, type EdgeNow } from "../engine/fight-edge";
  import { roundMarks, roundName, roundSummary, type RoundMark } from "./combat-rounds";
  import Die from "./Die.svelte";
  import { ADVANTAGE_USED_NOTE, EDGE_BADGE, EDGE_RULE, noLosingNote, rerollLine } from "./fight-wording";
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
    fortuneMax = 0,
    fortuneCost,
    rollingIndexes,
    locked = false,
    waiting = "",
    edge = "none",
    order = "",
    boxes = [],
    boxesOpen = false,
    onBox,
    onSelect,
    onReroll,
    onAdvantage,
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
    /** P35: shown as "Fortune N / 3" beside the re-roll button, as on the test card. */
    fortuneMax?: number;
    fortuneCost: number;
    rollingIndexes: number[];
    /** P35: the fight waits for the section's test. Resolve stays disabled. */
    locked?: boolean;
    /** The stakes line shown while locked. */
    waiting?: string;
    edge?: EdgeNow;
    /** The re-roll order line. Empty for a plain fight. */
    order?: string;
    /** The fight's own boxes, such as "I can cast a flight spell". */
    boxes?: { id: string; label: string; checked: boolean }[];
    /** Boxes can change only before round 1. */
    boxesOpen?: boolean;
    onBox?: (id: string, checked: boolean) => void;
    onSelect: (index: number) => void;
    onReroll: () => void;
    onAdvantage?: () => void;
    onRoll: () => void;
    onContinue: () => void;
  } = $props();

  const marks = $derived(roundMarks(rolls.map((entry) => entry.success), rounds, held));
  const outcome = $derived(sectionDestination(defeated ? "Vitality is 0" : "Fight over", continueTo, continueTitle));
  const wounds = $derived(rolls.filter((entry) => !entry.success).length);
  const summary = $derived(roundSummary(rolls.length, rounds, wounds, held, vitality));
  const last = $derived(rolls[rolls.length - 1]);
  const usedAdvantage = $derived(advantageUsed(last));
  const replaced = $derived(replacedFaces(last));
  const winNote = $derived(noLosingNote(combat));
  /** Fortune and Advantage appear only once the round is rolled and there are dice to re-roll. */
  const showRerolls = $derived(!locked && rolls.length > 0);
  const canReroll = $derived(ready && !rolling && rolls.length > 0 && selected !== null && !usedAdvantage);

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

<section
  class="card mechanic fight-panel"
  class:is-locked={locked}
  data-testid="combat"
  data-edge={locked ? "waiting" : edge}
  aria-label={locked ? "Fight, waiting" : "Fight"}
>
  {#if locked && waiting}
    <p class="waiting" data-testid="combat-waiting">{waiting}</p>
  {/if}
  <div class="fight-tracker" role="group" aria-label={summary}>
    <div class="rt-head">
      <div class="fight-name">
        <h2>{combat.label}</h2>
        {#if !locked && edge !== "none"}
          <span class="badge {edge === "advantage" ? "adv" : edge === "disadvantage" ? "dis" : "cancel"}" data-testid="combat-edge">{EDGE_BADGE[edge]}</span>
        {/if}
      </div>
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
    {#if !locked && edge !== "none"}
      <p class="rule" data-testid="combat-rule">{EDGE_RULE[edge]}</p>
    {/if}
    {#if boxes.length > 0}
      <div class="checks" data-testid="combat-boxes">
        {#each boxes as box (box.id)}
          <label class="check">
            <input
              type="checkbox"
              data-testid="combat-box-{box.id}"
              checked={box.checked}
              disabled={!ready || !boxesOpen}
              onchange={(event) => onBox?.(box.id, event.currentTarget.checked)}
            />
            {box.label}
          </label>
        {/each}
        <p class="note">Either box removes {combat.edge === "advantage" ? "Advantage" : "Disadvantage"} for this fight. Set them before round 1.</p>
      </div>
    {/if}
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
        {defeated ? `Defeat · turn to §${continueTo}` : `You win the fight · turn to §${continueTo}`}{continueTitle.trim() ? ` · ${continueTitle}` : ""}
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
  {:else if last}
    <div class="dice" aria-label="Dice">
      {#each last.faces as face, index (`${last.total}-${index}`)}
        {@const old = replaced.get(index)}
        {#if old !== undefined}
          <div class="pair" data-testid="replaced-die-{index + 1}">
            <span class="die old" role="img" aria-label="Die {index + 1} was {old}, replaced" data-testid="old-die-{index + 1}">
              {#each [0, 1, 2, 3, 4, 5, 6, 7, 8] as pip (pip)}
                <i class:on={(PIPS[old] ?? []).includes(pip)}></i>
              {/each}
            </span>
            <span class="arrow" aria-hidden="true">→</span>
            <Die {face} {index} replacement selected={selected === index} {onSelect} />
          </div>
        {:else}
          <Die {face} {index} selected={selected === index} {onSelect} />
        {/if}
      {/each}
    </div>
    <p class="result {last.success ? "ok" : "bad"}" data-testid="combat-roll">
      {last.faces.join(" + ")} = {last.total}. {last.success ? "You hold." : "You are hit."}
    </p>
    {#each last.rerolls ?? [] as entry, index (index)}
      <p class="note reroll-line" data-testid="reroll-line">{rerollLine(entry)}</p>
    {/each}
  {/if}
  {#if !locked && order}
    <p class="note" data-testid="reroll-order">{order}</p>
  {/if}
  {#if showRerolls}
  <div class="fortune-row">
    <button
      type="button"
      class="btn ghost"
      data-testid="fortune-reroll"
      disabled={!canReroll || fortune < fortuneCost}
      onclick={onReroll}
    >
      Spend {fortuneCost} Fortune: re-roll selected die
    </button>
    {#if fortuneMax > 0}
      <span class="note fortune-count" data-testid="fight-fortune-count">Fortune {fortune} / {fortuneMax}</span>
    {/if}
  </div>
  {#if usedAdvantage}
    <p class="note fortune-closed" data-testid="fortune-closed">{ADVANTAGE_USED_NOTE}</p>
  {/if}
  {#if edge === "advantage"}
    <div class="adv-row">
      <button type="button" class="btn ghost" data-testid="advantage-reroll" disabled={!canReroll} onclick={onAdvantage}>
        Re-roll one die (Advantage)
      </button>
    </div>
  {/if}
  {/if}
  {#if winNote}
    <p class="note" data-testid="combat-win-note">{winNote}</p>
  {/if}
  {#if held}
    <div class="dest">
      <button type="button" class="btn" data-testid="fight-continue" aria-label={outcome.name} disabled={!ready || rolling} onclick={onContinue}>
        <span class="dest-keep">{outcome.prefix}</span><span class="dest-title">{outcome.title}</span>
      </button>
      <p class="why">The round is saved when you continue. This does not undo earlier rounds.</p>
    </div>
  {:else}
    <button type="button" class="btn" data-testid="roll-combat" disabled={!ready || rolling || locked} onclick={onRoll}>
      Resolve round {round}
    </button>
  {/if}
</section>
