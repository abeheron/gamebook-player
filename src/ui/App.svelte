<script lang="ts">
  import { onMount } from "svelte";
  import { demoBook, demoSystem } from "../format/demo";
  import { canRestore } from "../engine/restore";
  import { choose, currentSection, rollCombatRound, rollTest, startSession, undo, visibleChoices } from "../engine/rules";
  import { detectRuntime } from "../platform/runtime";
  import { createIndexedDbStore } from "../storage/indexeddb";
  import type { SaveRecord } from "../storage/types";
  import Choices from "./Choices.svelte";
  import Combat from "./Combat.svelte";
  import Reader from "./Reader.svelte";
  import Sheet from "./Sheet.svelte";

  const SLOT = "demo";
  const store = createIndexedDbStore();
  const runtime = detectRuntime();

  let session = $state(startSession(demoBook, demoSystem));
  let ready = $state(false);
  let saveStatus = $state("Starting");
  let saveError = $state("");
  let writes = Promise.resolve();

  const section = $derived(currentSection(demoBook, session));
  const choices = $derived(visibleChoices(section, session.state));
  const lastCombatRoll = $derived.by(() => {
    const combatId = section.combat?.id;
    if (!combatId) return undefined;
    for (let index = session.state.rolls.length - 1; index >= 0; index -= 1) {
      const roll = session.state.rolls[index];
      if (roll?.id === combatId) return roll;
    }
    return undefined;
  });

  onMount(() => {
    let ignore = false;
    void (async () => {
      try {
        const record = await store.load(SLOT);
        if (ignore) return;
        if (record?.version === 1 && canRestore(record.session, demoBook, demoSystem)) {
          session = record.session;
          saveStatus = "Restored on this device";
        } else {
          saveStatus = "New game";
        }
      } catch (error) {
        saveError = error instanceof Error ? error.message : "Could not read the save.";
        saveStatus = "Playing without a save";
      } finally {
        if (!ignore) ready = true;
      }
    })();
    return () => {
      ignore = true;
    };
  });

  $effect(() => {
    if (!ready) return;
    const record: SaveRecord = {
      version: 1,
      savedAt: new Date().toISOString(),
      session: $state.snapshot(session),
    };
    saveStatus = "Saving";
    writes = writes
      .catch(() => undefined)
      .then(() => store.save(SLOT, record))
      .then(() => {
        saveStatus = "Saved on this device";
        saveError = "";
      })
      .catch((error: unknown) => {
        saveError = error instanceof Error ? error.message : "Could not save.";
        saveStatus = "Not saved";
      });
  });

  // structuredClone rejects a Svelte $state proxy, so rules always see a plain session.
  function plainSession() {
    return $state.snapshot(session);
  }

  function onChoose(choiceId: string): void {
    session = choose(plainSession(), demoBook, demoSystem, choiceId);
  }

  function onRollTest(): void {
    session = rollTest(plainSession(), demoBook, demoSystem, Math.random);
  }

  function onRollCombat(): void {
    session = rollCombatRound(plainSession(), demoBook, demoSystem, Math.random);
  }

  function onUndo(): void {
    session = undo(plainSession());
  }

  function onNewGame(): void {
    session = startSession(demoBook, demoSystem);
  }
</script>

<main class="app">
  <header>
    <div>
      <p class="note">Gamebook Player</p>
      <h1 data-testid="book-title">{demoBook.title}</h1>
    </div>
    <p class="runtime" data-testid="runtime">{runtime === "tauri" ? "Linux desktop shell" : "Web"}</p>
  </header>
  <div class="toolbar">
    <button type="button" data-testid="undo" disabled={!ready || session.undo.length === 0} onclick={onUndo}>
      Undo
    </button>
    <button type="button" data-testid="new-game" disabled={!ready} onclick={onNewGame}>New game</button>
    <p class="save-status" data-testid="save-status">{saveStatus}</p>
  </div>
  {#if saveError}
    <p class="error" data-testid="save-error">{saveError}</p>
  {/if}
  <div class="layout">
    <div>
      <Reader {section} {ready} {onRollTest} />
      {#if section.combat}
        <Combat
          combat={section.combat}
          pending={session.state.pending}
          lastRoll={lastCombatRoll}
          {ready}
          onRoll={onRollCombat}
        />
      {/if}
      <Choices {choices} {ready} {onChoose} />
    </div>
    <Sheet system={demoSystem} state={session.state} />
  </div>
  <p class="attribution">{demoBook.rights}</p>
</main>
