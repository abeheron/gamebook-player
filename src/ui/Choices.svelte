<script lang="ts">
  import type { Choice } from "../format/types";

  let { choices, ready, onChoose }: {
    choices: Choice[];
    ready: boolean;
    onChoose: (choiceId: string) => void;
  } = $props();
</script>

{#if choices.length > 0}
  <ul class="choices">
    {#each choices as choice (choice.id)}
      <li>
        <button
          type="button"
          data-testid="choice-{choice.id}"
          disabled={!ready}
          onclick={() => onChoose(choice.id)}
        >
          {choice.label}
        </button>
      </li>
    {/each}
  </ul>
{/if}
