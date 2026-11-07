<script lang="ts">
  import type { GameState, SystemDef } from "../format/types";

  let { system, state }: { system: SystemDef; state: GameState } = $props();
</script>

<aside class="sheet" data-testid="sheet">
  <h2>Adventure sheet</h2>
  <dl>
    {#each system.stats as stat (stat.id)}
      <dt>{stat.label}</dt>
      <dd data-testid="sheet-stat-{stat.id}">{state.stats[stat.id]}</dd>
    {/each}
  </dl>
  <p class="note">Fortune is listed for this GNAT-shaped sheet. This demo never spends it.</p>
  <h2>Items</h2>
  {#if state.items.length === 0}
    <p>None.</p>
  {:else}
    <ul>
      {#each state.items as item (item.id)}
        <li data-testid="sheet-item-{item.id}">{item.label}</li>
      {/each}
    </ul>
  {/if}
  <h2>Keywords</h2>
  {#if state.keywords.length === 0}
    <p>None.</p>
  {:else}
    <ul>
      {#each state.keywords as keyword (keyword.id)}
        <li data-testid="sheet-keyword-{keyword.id}">{keyword.label}</li>
      {/each}
    </ul>
  {/if}
  <h2>Ticks</h2>
  {#if Object.keys(state.ticks).length === 0}
    <p>None.</p>
  {:else}
    <ul>
      {#each Object.entries(state.ticks) as [id, tick] (id)}
        <li data-testid="sheet-tick-{id}">{tick.label}: {tick.count}</li>
      {/each}
    </ul>
  {/if}
  <p class="attribution">{system.attribution}</p>
</aside>
