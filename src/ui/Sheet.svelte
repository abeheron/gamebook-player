<script lang="ts">
  import type { GameState, SystemDef } from "../format/types";
  import TickBox from "./TickBox.svelte";

  let { system, state, brief = false }: { system: SystemDef; state: GameState; brief?: boolean } = $props();
</script>

<div class="sheet card" data-testid="sheet">
  {#if brief}
    <h2>Character</h2>
  {/if}
  <p class="note">Numbers and maxima are this sample's. Stat names are from GNAT. Fortune is not spent, and no re-roll cost is defined here.</p>
  <div class="statline">
    {#each system.stats as stat (stat.id)}
      <div class="stat">
        <span>{stat.label}</span>
        <b data-testid="sheet-stat-{stat.id}">{state.stats[stat.id]}</b>
      </div>
    {/each}
  </div>
  <h2>Items</h2>
  {#if state.items.length === 0}
    <p>None.</p>
  {:else}
    <ul class="plain">
      {#each state.items as item (item.id)}
        <li data-testid="sheet-item-{item.id}">{item.label}</li>
      {/each}
    </ul>
  {/if}
  <h2>Keywords</h2>
  {#if state.keywords.length === 0}
    <p>None.</p>
  {:else}
    <ul class="plain">
      {#each state.keywords as keyword (keyword.id)}
        <li data-testid="sheet-keyword-{keyword.id}">{keyword.label}</li>
      {/each}
    </ul>
  {/if}
  <h2>Ticks</h2>
  {#if Object.keys(state.ticks).length === 0}
    <p>None.</p>
  {:else}
    <ul class="plain ticks">
      {#each Object.entries(state.ticks) as [id, tick] (id)}
        <li>
          <TickBox small ticked={tick.count > 0} label={tick.label} />
          <span data-testid="sheet-tick-{id}">{tick.label}: {tick.count}</span>
        </li>
      {/each}
    </ul>
  {/if}
  {#if !brief}
    <p class="note" data-testid="sheet-missing">This book does not define skills, titles, or money.</p>
    <p class="attribution">{system.attribution}</p>
  {/if}
</div>
