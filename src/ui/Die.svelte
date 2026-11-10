<script lang="ts">
  let {
    face,
    rolling = false,
    index = 0,
    selected = false,
    onSelect,
  }: {
    face: number;
    rolling?: boolean;
    index?: number;
    selected?: boolean;
    onSelect?: (index: number) => void;
  } = $props();

  const pips: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };

  const on = $derived(new Set(pips[face] ?? []));
</script>

{#if onSelect}
  <button
    type="button"
    class="die"
    class:rolling
    data-testid="die-{index + 1}"
    aria-pressed={selected}
    aria-label="Die {index + 1}: {rolling ? 'rolling' : face}{selected ? ', selected' : ''}"
    onclick={() => onSelect?.(index)}
  >
    {#each [0, 1, 2, 3, 4, 5, 6, 7, 8] as pip (pip)}
      <i class:on={on.has(pip)}></i>
    {/each}
  </button>
{:else}
  <span class="die" class:rolling role="img" aria-label={rolling ? "Die rolling" : `Die showing ${face}`}>
    {#each [0, 1, 2, 3, 4, 5, 6, 7, 8] as pip (pip)}
      <i class:on={on.has(pip)}></i>
    {/each}
  </span>
{/if}
