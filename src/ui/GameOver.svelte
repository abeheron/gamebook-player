<script lang="ts">
  import { gameOverLine } from "./wording";

  let {
    sectionId,
    enemy,
    ready,
    onNewGame,
    onLibrary,
  }: {
    sectionId: string;
    enemy: string;
    ready: boolean;
    onNewGame: () => void;
    onLibrary: () => void;
  } = $props();
</script>

<!-- P33: a fight with no losing section was lost. Undo turn stays in the toolbar, not here. -->
<div class="game-over" data-testid="game-over">
  <div class="game-over-card" role="status">
    <svg class="skull" viewBox="0 0 96 112" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" data-testid="game-over-skull">
      <path d="M48 7c19.6 0 35.5 14.8 35.5 35.8 0 12.6-5.6 21.6-13 27.4v16.6c0 9.2-9.8 16.2-22.5 16.2S25.5 96 25.5 86.8V70.2C18.1 64.4 12.5 55.4 12.5 42.8 12.5 21.8 28.4 7 48 7Z" fill="color-mix(in srgb, currentColor 8%, transparent)" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>
      <ellipse cx="34.5" cy="46" rx="9.2" ry="11.2" fill="var(--paper)" stroke="currentColor" stroke-width="2"/>
      <ellipse cx="61.5" cy="46" rx="9.2" ry="11.2" fill="var(--paper)" stroke="currentColor" stroke-width="2"/>
      <path d="M48 58.5 41.5 72h13L48 58.5Z" fill="var(--paper)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M32 82.5h32" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M38 82.5v9.5M44.7 82.5v9.5M51.3 82.5v9.5M58 82.5v9.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
    <h2 data-testid="game-over-heading">Game over</h2>
    <p class="happened" data-testid="game-over-happened">{gameOverLine(sectionId, enemy)}</p>
    <p class="why" data-testid="game-over-why">This fight has no losing section, so a defeat ends the adventure.</p>
    <div class="game-over-actions">
      <button type="button" class="btn" data-testid="game-over-new-game" disabled={!ready} onclick={onNewGame}>New game</button>
      <button type="button" class="btn ghost" data-testid="game-over-library" onclick={onLibrary}>Library</button>
    </div>
  </div>
</div>
