<script lang="ts">
  import type { GameState } from "../format/types";
  import TickBox from "./TickBox.svelte";

  let { game }: { game: GameState } = $props();

  let query = $state("");
  let kind = $state<"all" | "keyword" | "tick">("all");

  const rows = $derived.by(() => {
    const keywords = game.keywords.map((keyword) => ({
      kind: "keyword" as const,
      id: keyword.id,
      label: keyword.label,
      detail: "Keyword",
    }));
    const ticks = Object.entries(game.ticks).map(([id, tick]) => ({
      kind: "tick" as const,
      id,
      label: tick.label,
      detail: `Tick count ${tick.count}`,
    }));
    const needle = query.trim().toLowerCase();
    return [...keywords, ...ticks].filter((row) => {
      if (kind !== "all" && row.kind !== kind) return false;
      if (needle.length === 0) return true;
      return row.label.toLowerCase().includes(needle) || row.id.toLowerCase().includes(needle);
    });
  });
</script>

<div data-testid="log-view">
  <h1>Keywords and ticks</h1>
  <div class="log-tools">
    <input
      type="search"
      data-testid="log-search"
      data-nav-esc="back"
      placeholder="Filter by name"
      aria-label="Filter keywords and ticks by name"
      bind:value={query}
    />
    <div class="seg" role="group" aria-label="Show">
      <button type="button" aria-pressed={kind === "all"} data-testid="log-filter-all" onclick={() => (kind = "all")}>All</button>
      <button type="button" aria-pressed={kind === "keyword"} data-testid="log-filter-keyword" onclick={() => (kind = "keyword")}>
        Keywords
      </button>
      <button type="button" aria-pressed={kind === "tick"} data-testid="log-filter-tick" onclick={() => (kind = "tick")}>Ticks</button>
    </div>
  </div>
  {#if rows.length === 0}
    <p data-testid="log-empty">{query.trim().length === 0 && kind === "all" ? "None yet." : "No matches."}</p>
  {:else}
    <ul class="plain log-list">
      {#each rows as row (row.kind + row.id)}
        <li data-testid="log-row-{row.id}">
          {#if row.kind === "tick"}
            <TickBox small ticked={true} label={row.label} />
          {/if}
          <span>{row.label}</span>
          <span class="note">{row.detail}</span>
        </li>
      {/each}
    </ul>
  {/if}
  <p class="note">This list reads the same keywords and ticks as the character sheet. This book does not number ticks by section.</p>
</div>
