<script lang="ts">
  import type { GameState, SystemDef } from "../format/types";
  import TickBox from "./TickBox.svelte";

  let { system, state, brief = false }: { system: SystemDef; state: GameState; brief?: boolean } = $props();

  function skillLabel(id: string): string {
    return system.skills.find((skill) => skill.id === id)?.label ?? id;
  }
</script>

<div class="sheet card" data-testid="sheet">
  {#if brief}
    <h2>Character</h2>
  {/if}
  <p class="note">Numbers and maxima are this sample's. Stat names are from GNAT. One Fortune rerolls one selected die. Fortune does not rise above 3.</p>
  <div class="statline">
    {#each system.stats as stat (stat.id)}
      {@const value = state.stats[stat.id] ?? 0}
      {#if stat.id === system.fortuneStat}
        <div class="stat fortune" role="group" aria-label="{stat.label} {value} of {stat.max}" data-testid="sheet-fortune">
          <span aria-hidden="true">{stat.label}</span>
          <b aria-hidden="true" data-testid="sheet-stat-{stat.id}">{value} / {stat.max}</b>
          <span class="fortune-pips" aria-hidden="true">
            {#each Array.from({ length: stat.max }, (_, index) => index) as index (index)}
              <i class:on={index < value} data-testid="fortune-pip"></i>
            {/each}
          </span>
        </div>
      {:else}
        <div class="stat">
          <span>{stat.label}</span>
          <b data-testid="sheet-stat-{stat.id}">{value}</b>
        </div>
      {/if}
    {/each}
  </div>
  <h2>Skills</h2>
  {#if state.skills.length === 0}
    <p>None.</p>
  {:else}
    <ul class="plain">
      {#each state.skills as skill (skill.id)}
        <li data-testid="sheet-skill-{skill.id}">{skillLabel(skill.id)} +{skill.bonus}</li>
      {/each}
    </ul>
  {/if}
  <h2>Coin pouch</h2>
  <p data-testid="sheet-gold">{state.gold} gp</p>
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
    <p class="note" data-testid="sheet-skills-note">The two basic skills on this character are a sample choice.</p>
    <p class="note" data-testid="sheet-missing">This book does not define titles.</p>
    <p class="attribution">{system.attribution}</p>
  {/if}
</div>
