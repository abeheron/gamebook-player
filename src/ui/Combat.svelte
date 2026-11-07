<script lang="ts">
  import type { CombatDef, PendingCombat, RollRecord } from "../format/types";

  let { combat, pending, lastRoll, ready, onRoll }: {
    combat: CombatDef;
    pending: PendingCombat | null;
    lastRoll: RollRecord | undefined;
    ready: boolean;
    onRoll: () => void;
  } = $props();

  const round = $derived((pending?.round ?? 0) + 1);
</script>

<section class="panel" data-testid="combat">
  <h2>{combat.label}</h2>
  <p data-testid="combat-round">Round {round} of {combat.rounds}. Roll {combat.dice} at or under Talent. A miss costs Vitality.</p>
  {#if lastRoll}
    <p data-testid="combat-roll">
      Last roll {lastRoll.faces.join(" + ")} = {lastRoll.total}. {lastRoll.success ? "You hold." : "You are hit."}
    </p>
  {/if}
  <button type="button" data-testid="roll-combat" disabled={!ready} onclick={onRoll}>
    Resolve round
  </button>
</section>
