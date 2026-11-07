<script lang="ts">
  import { onMount } from "svelte";
  import { demoBook, demoSystem } from "../format/demo";
  import type { RollRecord, Session } from "../format/types";
  import { canRestore } from "../engine/restore";
  import { conditionHolds } from "../engine/state";
  import { choose, currentSection, rollCombatRound, rollTest, startSession, undo } from "../engine/rules";
  import { detectRuntime } from "../platform/runtime";
  import { createIndexedDbStore } from "../storage/indexeddb";
  import type { SaveRecord } from "../storage/types";
  import Choices from "./Choices.svelte";
  import Combat from "./Combat.svelte";
  import Reader from "./Reader.svelte";
  import Sheet from "./Sheet.svelte";
  import { blockedBecause, rollFormula, sectionTitle, statLabel, ticksOnSection } from "./wording";

  type ViewName = "read" | "sheet";
  type ViewMark = { view: ViewName; scroll: number };
  type Arrival = { kind: "test" | "combat"; session: Session };

  const SLOT = "demo";
  const store = createIndexedDbStore();
  const runtime = detectRuntime();

  let session = $state(startSession(demoBook, demoSystem));
  let ready = $state(false);
  let saveStatus = $state("Starting");
  let saveError = $state("");
  let writes = Promise.resolve();
  let view = $state<ViewName>("read");
  let history = $state<ViewMark[]>([]);
  let arrival = $state<Arrival | null>(null);
  let mainEl = $state<HTMLElement | null>(null);

  const section = $derived(currentSection(demoBook, session));
  const mentionedTicks = $derived(
    ticksOnSection(section).map((tick) => ({
      ...tick,
      count: session.state.ticks[tick.id]?.count ?? 0,
    })),
  );
  const choiceRows = $derived(
    (section.choices ?? []).map((choice) => {
      const available = !arrival && (!choice.when || conditionHolds(choice.when, session.state));
      return {
        choice,
        available,
        because: arrival ? "Take the turn from this roll first." : choice.when ? blockedBecause(choice.when) : "",
      };
    }),
  );
  const testFormula = $derived.by(() => {
    const test = section.test;
    if (!test) return "";
    const value = session.state.stats[test.stat];
    return rollFormula(test.dice, statLabel(demoSystem, test.stat), value ?? 0, test.modifier ?? 0);
  });
  const combatFormula = $derived.by(() => {
    const combat = section.combat;
    if (!combat) return "";
    const value = session.state.stats[combat.stat];
    return rollFormula(combat.dice, statLabel(demoSystem, combat.stat), value ?? 0, combat.modifier ?? 0);
  });
  const heldTest = $derived<RollRecord | null>(arrival?.kind === "test" ? lastRoll(arrival.session, section.test?.id) : null);
  const combatRolls = $derived.by(() => {
    const combat = section.combat;
    if (!combat) return [];
    if (arrival?.kind === "combat") return rollsFor(arrival.session, combat.id);
    return rollsFor(session, combat.id);
  });
  const continueTitle = $derived(
    arrival?.kind === "combat" ? sectionTitle(demoBook.sections, arrival.session.state.sectionId) : "",
  );
  const defeated = $derived(
    arrival?.kind === "combat" && section.combat !== undefined && arrival.session.state.sectionId === section.combat.defeatSection,
  );

  onMount(() => {
    let ignore = false;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || history.length === 0) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      backView();
    };
    window.addEventListener("keydown", onKey);
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
      window.removeEventListener("keydown", onKey);
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

  function plainSession() {
    return $state.snapshot(session);
  }

  function show(next: ViewName): void {
    if (next === view) return;
    history = [...history, { view, scroll: window.scrollY }].slice(-10);
    view = next;
    queueMicrotask(() => {
      window.scrollTo(0, 0);
      mainEl?.focus();
    });
  }

  function backView(): void {
    const previous = history[history.length - 1];
    if (!previous) return;
    history = history.slice(0, -1);
    view = previous.view;
    const scroll = previous.scroll;
    queueMicrotask(() => {
      window.scrollTo(0, scroll);
      mainEl?.focus();
    });
  }

  function onChoose(choiceId: string): void {
    arrival = null;
    session = choose(plainSession(), demoBook, demoSystem, choiceId);
  }

  function onRollTest(): void {
    if (arrival) return;
    arrival = { kind: "test", session: rollTest(plainSession(), demoBook, demoSystem, Math.random) };
  }

  function onRollCombat(): void {
    if (arrival) return;
    const next = rollCombatRound(plainSession(), demoBook, demoSystem, Math.random);
    if (next.state.sectionId !== session.state.sectionId) arrival = { kind: "combat", session: next };
    else session = next;
  }

  function onArrive(): void {
    if (!arrival) return;
    session = arrival.session;
    arrival = null;
  }

  function onUndo(): void {
    arrival = null;
    session = undo(plainSession());
  }

  function onNewGame(): void {
    arrival = null;
    session = startSession(demoBook, demoSystem);
  }

  function rollsFor(source: Session, id: string | undefined): RollRecord[] {
    if (!id) return [];
    return source.state.rolls.filter((roll) => roll.id === id);
  }

  function lastRoll(source: Session, id: string | undefined): RollRecord | null {
    const rolls = rollsFor(source, id);
    return rolls[rolls.length - 1] ?? null;
  }
</script>

<div class="app">
  <nav class="side" aria-label="Screens" data-testid="side-nav">
    <p class="brand">Gamebook Player<small>sample reader</small></p>
    <p class="book-tag" data-testid="book-title">{demoBook.title}</p>
    <button type="button" data-testid="side-read" aria-current={view === "read" ? "page" : undefined} onclick={() => show("read")}>
      Read
    </button>
    <button type="button" data-testid="side-sheet" aria-current={view === "sheet" ? "page" : undefined} onclick={() => show("sheet")}>
      Sheet
    </button>
    <div class="foot">
      <p>Back returns to the previous screen and keeps its scroll. It does not rewind the story.</p>
      <p class="runtime" data-testid="runtime">{runtime === "tauri" ? "Linux desktop shell" : "Web"}</p>
    </div>
  </nav>
  <main id="main" tabindex="-1" bind:this={mainEl}>
    <p class="mobile-book">{demoBook.title}</p>
    <div class="backbar">
      {#if history.length > 0}
        {@const previous = history[history.length - 1]}
        {#if previous}
          <button type="button" class="back" data-testid="view-back" onclick={backView}>
            ← Back to {previous.view === "read" ? "reading" : "the sheet"}
          </button>
        {/if}
      {/if}
    </div>
    <div class="toolbar">
      <button type="button" class="btn ghost" data-testid="undo" disabled={!ready || session.undo.length === 0} onclick={onUndo}>
        Undo turn
      </button>
      <button type="button" class="btn ghost" data-testid="new-game" disabled={!ready} onclick={onNewGame}>New game</button>
      <p class="save-status" data-testid="save-status">{saveStatus}</p>
    </div>
    {#if saveError}
      <p class="error" data-testid="save-error">{saveError}</p>
    {/if}
    {#if view === "read"}
      <div class="layout">
        <div>
          <Reader
            {section}
            ticks={mentionedTicks}
            formula={testFormula}
            {ready}
            held={heldTest}
            passTitle={section.test ? sectionTitle(demoBook.sections, section.test.success.to) : ""}
            failTitle={section.test ? sectionTitle(demoBook.sections, section.test.failure.to) : ""}
            {onRollTest}
            onArrive={onArrive}
          />
          {#if section.combat}
            <Combat
              combat={section.combat}
              formula={combatFormula}
              round={(session.state.pending?.round ?? 0) + 1}
              rounds={section.combat.rounds}
              rolls={combatRolls}
              {ready}
              held={arrival?.kind === "combat"}
              {continueTitle}
              {defeated}
              onRoll={onRollCombat}
              onContinue={onArrive}
            />
          {:else}
            <Choices rows={choiceRows} {ready} {onChoose} />
          {/if}
        </div>
        <aside aria-label="Quick adventure sheet">
          <Sheet system={demoSystem} state={session.state} brief />
          <button type="button" class="btn ghost" data-testid="open-sheet" onclick={() => show("sheet")}>Full sheet</button>
        </aside>
      </div>
    {:else}
      <h1>Adventure sheet</h1>
      <div data-testid="sheet-view">
        <Sheet system={demoSystem} state={session.state} />
      </div>
    {/if}
    <p class="rights">{demoBook.rights}</p>
  </main>
</div>
<nav class="mobilebar" aria-label="Screens" data-testid="mobile-nav">
  <button type="button" data-testid="mobile-read" aria-current={view === "read" ? "page" : undefined} onclick={() => show("read")}>
    Read
  </button>
  <button type="button" data-testid="mobile-sheet" aria-current={view === "sheet" ? "page" : undefined} onclick={() => show("sheet")}>
    Sheet
  </button>
</nav>
