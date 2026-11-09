<script lang="ts">
  import { onMount } from "svelte";
  import { demoBook, demoSystem } from "../format/demo";
  import type { RollRecord, Session } from "../format/types";
  import { canRestore } from "../engine/restore";
  import { conditionHolds } from "../engine/state";
  import { choose, currentSection, rollCombatRound, rollTest, startSession, undo } from "../engine/rules";
  import { skillAdjustment } from "../engine/skills";
  import { canStartRoll, settledDestination } from "./skill-test";
  import { detectRuntime } from "../platform/runtime";
  import { createIndexedDbStore } from "../storage/indexeddb";
  import { migrateSave } from "../storage/migrate";
  import { SAVE_VERSION, type SaveRecord } from "../storage/types";
  import Choices from "./Choices.svelte";
  import Combat from "./Combat.svelte";
  import Reader from "./Reader.svelte";
  import Log from "./Log.svelte";
  import Rules from "./Rules.svelte";
  import Sheet from "./Sheet.svelte";
  import SkillTest from "./SkillTest.svelte";
  import { blockedBecause, rollFormula, sectionTitle, skillClause, statLabel, ticksOnSection } from "./wording";

  type ViewName = "read" | "sheet" | "test" | "log" | "rules";
  type ViewMark = { view: ViewName; scroll: number };
  type Arrival = { kind: "combat"; session: Session };
  type PendingTest = { sectionId: string; next: Session; roll: RollRecord };

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
  let pendingTest = $state<PendingTest | null>(null);
  let panelOpen = $state(false);
  let mainEl = $state<HTMLElement | null>(null);
  let rollBusy = false;
  let commitBusy = false;

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
  const testSkill = $derived.by(() => {
    const test = section.test;
    if (!test?.skill) return null;
    const label = demoSystem.skills.find((skill) => skill.id === test.skill)?.label ?? test.skill;
    return { label, bonus: skillAdjustment(demoSystem, session.state.skills, test.skill) };
  });
  const testFormula = $derived.by(() => {
    const test = section.test;
    if (!test) return "";
    const value = session.state.stats[test.stat];
    return rollFormula(
      test.dice,
      statLabel(demoSystem, test.stat),
      value ?? 0,
      test.modifier ?? 0,
      testSkill ?? undefined,
    );
  });
  const testAdjustment = $derived(testSkill ? skillClause(testSkill.label, testSkill.bonus) : "");
  const combatFormula = $derived.by(() => {
    const combat = section.combat;
    if (!combat) return "";
    const value = session.state.stats[combat.stat];
    return rollFormula(combat.dice, statLabel(demoSystem, combat.stat), value ?? 0, combat.modifier ?? 0);
  });
  const heldRoll = $derived<RollRecord | null>(
    pendingTest !== null && pendingTest.sectionId === section.id ? pendingTest.roll : null,
  );
  const destinationTitle = $derived.by(() => {
    const test = section.test;
    if (!test || !heldRoll) return "";
    return sectionTitle(demoBook.sections, settledDestination(test, heldRoll).to);
  });
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
      if (event.key !== "Escape") return;
      const target = event.target;
      const leavingSearch = target instanceof HTMLInputElement && target.dataset.navEsc === "back";
      if ((target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) && !leavingSearch) return;
      if (view === "test") {
        event.preventDefault();
        backView();
        return;
      }
      if (panelOpen && view === "read") {
        event.preventDefault();
        closePanel();
        return;
      }
      if (history.length === 0) return;
      event.preventDefault();
      backView();
    };
    window.addEventListener("keydown", onKey);
    void (async () => {
      try {
        const record = await store.load(SLOT);
        if (ignore) return;
        const migrated = migrateSave(record, demoSystem);
        if (migrated && canRestore(migrated.session, demoBook, demoSystem)) {
          session = migrated.session;
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
      version: SAVE_VERSION,
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
    if (view === "test" && next === "read") {
      backView();
      return;
    }
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
      mainEl?.focus({ preventScroll: true });
      window.scrollTo(0, scroll);
    });
  }

  function openPanel(): void {
    panelOpen = true;
  }

  function closePanel(): void {
    const scroll = window.scrollY;
    panelOpen = false;
    queueMicrotask(() => {
      document.getElementById("open-test")?.focus({ preventScroll: true });
      window.scrollTo(0, scroll);
    });
  }

  function openFullTest(): void {
    if (view === "read") show("test");
  }

  function onChoose(choiceId: string): void {
    arrival = null;
    pendingTest = null;
    panelOpen = false;
    session = choose(plainSession(), demoBook, demoSystem, choiceId);
  }

  function onRollTest(): void {
    if (!canStartRoll(pendingTest !== null, rollBusy)) return;
    const test = section.test;
    if (!test) return;
    rollBusy = true;
    try {
      const next = rollTest(plainSession(), demoBook, demoSystem, Math.random);
      const roll = lastRoll(next, test.id);
      if (!roll) return;
      pendingTest = { sectionId: session.state.sectionId, next, roll };
    } finally {
      rollBusy = false;
    }
  }

  function onRollCombat(): void {
    if (arrival) return;
    const next = rollCombatRound(plainSession(), demoBook, demoSystem, Math.random);
    if (next.state.sectionId !== session.state.sectionId) arrival = { kind: "combat", session: next };
    else session = next;
  }

  function onArriveTest(): void {
    if (commitBusy || !pendingTest) return;
    commitBusy = true;
    const next = pendingTest.next;
    pendingTest = null;
    panelOpen = false;
    if (view === "test") {
      const previous = history[history.length - 1];
      if (previous?.view === "read") history = history.slice(0, -1);
      view = "read";
    }
    session = next;
    commitBusy = false;
  }

  function onArriveCombat(): void {
    if (commitBusy || !arrival) return;
    commitBusy = true;
    session = arrival.session;
    arrival = null;
    commitBusy = false;
  }

  function onUndo(): void {
    arrival = null;
    pendingTest = null;
    panelOpen = false;
    session = undo(plainSession());
  }

  function onNewGame(): void {
    arrival = null;
    pendingTest = null;
    panelOpen = false;
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

  function screenName(name: ViewName): string {
    if (name === "sheet") return "character";
    if (name === "log") return "keywords and ticks";
    if (name === "rules") return "rules";
    return "reading";
  }
</script>

<div class="app">
  <nav class="side" aria-label="Screens" data-testid="side-nav">
    <p class="brand">Gamebook Player<small>sample reader</small></p>
    <p class="book-tag" data-testid="book-title">{demoBook.title}</p>
    <button type="button" data-testid="side-read" aria-current={view === "sheet" || view === "log" || view === "rules" ? undefined : "page"} onclick={() => show("read")}>
      Read
    </button>
    <button type="button" data-testid="side-character" aria-current={view === "sheet" ? "page" : undefined} onclick={() => show("sheet")}>
      Character
    </button>
    <button type="button" data-testid="side-test" aria-disabled="true" onclick={(event) => event.preventDefault()}>
      Test &amp; fight
      <span class="nav-note">Not in this build</span>
    </button>
    <button type="button" data-testid="side-keywords" aria-current={view === "log" ? "page" : undefined} onclick={() => show("log")}>
      Keywords &amp; ticks
    </button>
    <button type="button" data-testid="side-library" aria-disabled="true" onclick={(event) => event.preventDefault()}>
      Library
      <span class="nav-note">Not in this build</span>
    </button>
    <button type="button" data-testid="side-rules" aria-current={view === "rules" ? "page" : undefined} onclick={() => show("rules")}>
      Rules
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
            ← Back to {screenName(previous.view)}
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
          <Reader {section} ticks={mentionedTicks} {panelOpen} onOpenTest={openPanel} />
          {#if panelOpen && section.test}
            <SkillTest
              compact
              label={section.test.label}
              dice={section.test.dice}
              formula={testFormula}
              adjustment={testAdjustment}
              {ready}
              roll={heldRoll}
              destination={destinationTitle}
              onRoll={onRollTest}
              onArrive={onArriveTest}
              onClose={closePanel}
              onFull={openFullTest}
            />
          {/if}
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
              onContinue={onArriveCombat}
            />
          {:else if !section.test}
            <Choices rows={choiceRows} {ready} {onChoose} />
          {/if}
        </div>
        <aside aria-label="Quick adventure sheet">
          <Sheet system={demoSystem} state={session.state} brief />
          <button type="button" class="btn ghost" data-testid="open-sheet" onclick={() => show("sheet")}>Full sheet</button>
        </aside>
      </div>
    {:else if view === "log"}
      <Log game={session.state} />
    {:else if view === "rules"}
      <Rules />
    {:else if view === "test" && section.test}
      <SkillTest
        compact={false}
        label={section.test.label}
        dice={section.test.dice}
        formula={testFormula}
        adjustment={testAdjustment}
        {ready}
        roll={heldRoll}
        destination={destinationTitle}
        onRoll={onRollTest}
        onArrive={onArriveTest}
        onClose={closePanel}
        onFull={openFullTest}
      />
    {:else}
      <h1>Character</h1>
      <div data-testid="sheet-view">
        <Sheet system={demoSystem} state={session.state} />
      </div>
    {/if}
    <p class="rights">{demoBook.rights}</p>
  </main>
</div>
<nav class="mobilebar" aria-label="Screens" data-testid="mobile-nav">
  <button type="button" data-testid="mobile-read" aria-current={view === "sheet" || view === "log" || view === "rules" ? undefined : "page"} onclick={() => show("read")}>
    Read
  </button>
  <button type="button" data-testid="mobile-character" aria-current={view === "sheet" ? "page" : undefined} onclick={() => show("sheet")}>
    Character
  </button>
  <button type="button" data-testid="mobile-test" aria-disabled="true" aria-label="Test and fight, not in this build" onclick={(event) => event.preventDefault()}>
    Test &amp; fight
  </button>
  <button type="button" data-testid="mobile-keywords" aria-current={view === "log" ? "page" : undefined} onclick={() => show("log")}>
    Keywords &amp; ticks
  </button>
  <button type="button" data-testid="mobile-library" aria-disabled="true" aria-label="Library, not in this build" onclick={(event) => event.preventDefault()}>
    Library
  </button>
  <button type="button" data-testid="mobile-rules" aria-current={view === "rules" ? "page" : undefined} onclick={() => show("rules")}>
    Rules
  </button>
</nav>
