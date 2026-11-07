<script lang="ts">
  let { face }: { face: number } = $props();

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

<span class="die" role="img" aria-label="Die showing {face}">
  {#each [0, 1, 2, 3, 4, 5, 6, 7, 8] as index (index)}
    <i class:on={on.has(index)}></i>
  {/each}
</span>
