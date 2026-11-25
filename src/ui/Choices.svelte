<script lang="ts">
  import type { Choice } from "../format/types";

  let { rows, ready, onChoose, lead = "" }: {
    rows: { choice: Choice; available: boolean; because: string }[];
    ready: boolean;
    onChoose: (choiceId: string) => void;
    /** A label above the list, such as "Or choose:" under a standing test. */
    lead?: string;
  } = $props();
</script>

{#if rows.length > 0}
  {#if lead}
    <p class="or-label" data-testid="or-choose">{lead}</p>
  {/if}
  <ul class="choices" data-testid="choices">
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
            {#if !row.available && row.because}
              <span class="why" data-testid="choice-why-{row.choice.id}">{row.because}</span>
            {/if}
          </span>
          <span class="to" data-testid="choice-to-{row.choice.id}">§{row.choice.to}</span>
        </button>
      </li>
    {/each}
  </ul>
{/if}
