<script lang="ts">
  import type { Choice } from "../format/types";

  let { rows, ready, onChoose }: {
    rows: { choice: Choice; available: boolean; because: string }[];
    ready: boolean;
    onChoose: (choiceId: string) => void;
  } = $props();
</script>

{#if rows.length > 0}
  <ul class="choices">
    {#each rows as row (row.choice.id)}
      <li>
        <button
          type="button"
          class="choice"
          data-testid="choice-{row.choice.id}"
          disabled={!ready || !row.available}
          onclick={() => onChoose(row.choice.id)}
        >
          <span>
            {row.choice.label}
            {#if !row.available}
              <span class="why">{row.because}</span>
            {/if}
          </span>
          <span class="to">{row.choice.to}</span>
        </button>
      </li>
    {/each}
  </ul>
{/if}
