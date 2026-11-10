<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { demoBook, demoSystem } from "../format/demo";
  import type { RollRecord, Session } from "../format/types";
  import { canRestore } from "../engine/restore";
  import { conditionHolds } from "../engine/state";
  import { acceptTest, choose, currentSection, holdTestRoll, rerollCombatDie, rerollTestDie, rollCombatRound, selectTestDie, startSession, undo } from "../engine/rules";
  import { skillAdjustment } from "../engine/skills";
  import { playDiceSound, stopDiceSound } from "./dice-audio";
  import { DICE_PREFS_KEY, parseStoredPrefs, resolveDicePrefs, withPref, type StoredDicePrefs } from "./dice-prefs";
  import { canStartRoll } from "./skill-test";
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
  import { formatSaveClock, noteKind, readSaveHook, SAVING_DELAY_MS, type SettledSave } from "./save-status";
  import { blockedBecause, rollFormula, sectionTitle, skillClause, statLabel, ticksOnSection } from "./wording";

  type ViewName = "read" | "sheet" | "test" | "log" | "rules";
  type ViewMark = { view: ViewName; scroll: number };
  type Arrival = { kind: "combat"; session: Session };
  const SLOT = "demo";
  const store = createIndexedDbStore();
  const runtime = detectRuntime();

  let session = $state(startSession(demoBook, demoSystem));
  let ready = $state(false);
  let saveError = $state("");
  let writes = Promise.resolve();
  let settled = $state<SettledSave>("idle");
  let writing = $state(false);
  let saveElapsed = $state(0);
  let saveClock = $state("");
  let saveCount = $state(0);
  let saveGeneration = 0;
  let savingTimer = 0;
  const saveKind = $derived(noteKind(settled, writing, saveElapsed));
  let view = $state<ViewName>("read");
  let history = $state<ViewMark[]>([]);
  let arrival = $state<Arrival | null>(null);
  let panelOpen = $state(false);
  let rollingIndexes = $state<number[]>([]);
  let combatSelected = $state<number | null>(null);
  let mainEl = $state<HTMLElement | null>(null);
  let rollBusy = false;
  let commitBusy = false;
  let bookmarks = $state<string[]>([]);
  let diceRolling = $state(false);
  let dicePreview = $state<number[]>([]);
  let motionFrame = 0;
  let motionTimer = 0;

  const ROLL_MS = 750;
  const FRAME_MS = 70;

  function reducedMotionNow(): boolean {
    return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function readStoredPrefs(): StoredDicePrefs {
    try {
      return parseStoredPrefs(localStorage.getItem(DICE_PREFS_KEY));
    } catch {
      return {};
    }
  }

  const initialStored = readStoredPrefs();
  let storedPrefs = $state(initialStored);
  let prefs = $state(resolveDicePrefs(initialStored, reducedMotionNow()));
  let soundNote = $state("");

  function savePref(key: "anim" | "sound", value: boolean): void {
    prefs = { ...prefs, [key]: value };
    storedPrefs = withPref(storedPrefs, key, value);
    try {
      localStorage.setItem(DICE_PREFS_KEY, JSON.stringify(storedPrefs));
    } catch {
      // The roll still works if this browser will not store settings.
    }
    if (key === "sound" && !value) stopDiceSound();
  }

  function clearMotion(): void {
    window.clearInterval(motionFrame);
    window.clearTimeout(motionTimer);
    motionFrame = 0;
    motionTimer = 0;
    diceRolling = false;
    dicePreview = [];
    rollingIndexes = [];
  }

  function playRollSound(): void {
    if (!prefs.sound) return;
    soundNote = "";
    playDiceSound().catch(() => {
      soundNote = "Sound unavailable in this browser.";
    });
  }

  function startRoll(faces: number[], commit: () => void, flickerAt?: number[]): void {
    clearMotion();
    playRollSound();
    const moving = flickerAt ?? faces.map((_, index) => index);
    if (!prefs.anim) {
      commit();
      return;
    }
    diceRolling = true;
    rollingIndexes = moving;
    const flicker = () => {
      dicePreview = faces.map((face, index) => (moving.includes(index) ? 1 + Math.floor(Math.random() * 6) : face));
    };
    flicker();
    motionFrame = window.setInterval(flicker, FRAME_MS);
    motionTimer = window.setTimeout(() => {
      clearMotion();
      commit();
    }, ROLL_MS);
  }

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
  const heldTest = $derived(
    session.state.pending?.kind === "test" && session.state.pending.sectionId === section.id ? session.state.pending : null,
  );
  const heldRoll = $derived<RollRecord | null>(heldTest?.roll ?? null);
  const fortuneStat = $derived(demoSystem.stats.find((stat) => stat.id === demoSystem.fortuneStat));
  const fortuneNow = $derived(session.state.stats[demoSystem.fortuneStat] ?? 0);
  const passTo = $derived(section.test?.success.to ?? "");
  const failTo = $derived(section.test?.failure.to ?? "");
  const passTitle = $derived(section.test ? sectionTitle(demoBook.sections, section.test.success.to) : "");
  const failTitle = $derived(section.test ? sectionTitle(demoBook.sections, section.test.failure.to) : "");
  const combatRolls = $derived.by(() => {
    const combat = section.combat;
    if (!combat) return [];
    if (arrival?.kind === "combat") return rollsFor(arrival.session, combat.id);
    return rollsFor(session, combat.id);
  });
  const combatVitality = $derived.by(() => {
    const combat = section.combat;
    if (!combat) return { current: 0, max: 0 };
    const source = arrival?.kind === "combat" ? arrival.session : session;
    const max = demoSystem.stats.find((stat) => stat.id === combat.wound.stat)?.max ?? 0;
    return { current: source.state.stats[combat.wound.stat] ?? 0, max };
  });
  const continueTo = $derived(arrival?.kind === "combat" ? arrival.session.state.sectionId : "");
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
        const migrated = migrateSave(record, demoSystem, demoBook);
        if (migrated && canRestore(migrated.session, demoBook, demoSystem)) {
          session = migrated.session;
          bookmarks = migrated.bookmarks;
          if (migrated.session.state.pending?.kind === "test") panelOpen = true;
        }
      } catch (error) {
        saveError = error instanceof Error ? error.message : "Could not read the save.";
      } finally {
        if (!ignore) ready = true;
      }
    })();
    return () => {
      ignore = true;
      window.removeEventListener("keydown", onKey);
    };
  });

  onDestroy(() => {
    clearMotion();
    stopDiceSound();
    window.clearTimeout(savingTimer);
  });

  function currentRecord(): SaveRecord {
    return {
      version: SAVE_VERSION,
      savedAt: new Date().toISOString(),
      session: $state.snapshot(session),
      bookmarks: $state.snapshot(bookmarks),
    };
  }

  function queueSave(record: SaveRecord): void {
    const generation = ++saveGeneration;
    writing = true;
    saveElapsed = 0;
    window.clearTimeout(savingTimer);
    savingTimer = window.setTimeout(() => {
      if (saveGeneration === generation && writing) saveElapsed = SAVING_DELAY_MS;
    }, SAVING_DELAY_MS);
    writes = writes
      .catch(() => undefined)
      .then(async () => {
        const hook = readSaveHook(typeof sessionStorage === "undefined" ? null : sessionStorage);
        if (hook.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, hook.delayMs));
        if (hook.fail) throw new Error("storage refused");
        await store.save(SLOT, record);
      })
      .then(() => {
        if (generation !== saveGeneration) return;
        window.clearTimeout(savingTimer);
        writing = false;
        saveElapsed = 0;
        saveClock = formatSaveClock(new Date());
        settled = "saved";
        saveCount += 1;
        saveError = "";
      })
      .catch(() => {
        if (generation !== saveGeneration) return;
        window.clearTimeout(savingTimer);
        writing = false;
        saveElapsed = 0;
        settled = "failed";
      });
  }

  $effect(() => {
    if (!ready) return;
    queueSave(currentRecord());
  });

  function retrySave(): void {
    queueSave(currentRecord());
  }

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
    clearMotion();
    arrival = null;
    panelOpen = false;
    session = choose(plainSession(), demoBook, demoSystem, choiceId);
  }

  function onRollTest(faces?: number[]): void {
    if (diceRolling || !canStartRoll(heldTest !== null, rollBusy)) return;
    const test = section.test;
    if (!test) return;
    rollBusy = true;
    try {
      const next = holdTestRoll(plainSession(), demoBook, demoSystem, Math.random, faces);
      const pending = next.state.pending;
      if (!pending || pending.kind !== "test") return;
      startRoll(pending.roll.faces, () => {
        session = next;
      });
    } finally {
      rollBusy = false;
    }
  }

  function onSelectDie(index: number): void {
    if (diceRolling) return;
    session = selectTestDie(plainSession(), index);
  }

  function onRerollDie(): void {
    if (diceRolling || !heldTest || heldTest.selected === null) return;
    if (fortuneNow < demoSystem.fortuneRerollCost) return;
    const index = heldTest.selected;
    const face = 1 + Math.floor(Math.random() * 6);
    const next = rerollTestDie(plainSession(), demoBook, demoSystem, index, Math.random, face);
    startRoll(heldTest.roll.faces, () => {
      session = next;
    }, [index]);
  }

  function onRollCombat(): void {
    if (diceRolling || arrival) return;
    combatSelected = null;
    const next = rollCombatRound(plainSession(), demoBook, demoSystem, Math.random);
    const roll = next.state.rolls[next.state.rolls.length - 1];
    startRoll(roll?.faces ?? [], () => {
      if (next.state.sectionId !== session.state.sectionId) arrival = { kind: "combat", session: next };
      else session = next;
    });
  }

  function onSelectCombatDie(index: number): void {
    if (diceRolling || arrival) return;
    combatSelected = combatSelected === index ? null : index;
  }

  function onRerollCombat(): void {
    if (diceRolling || arrival || combatSelected === null) return;
    if (fortuneNow < demoSystem.fortuneRerollCost) return;
    const last = combatRolls[combatRolls.length - 1];
    if (!last) return;
    const index = combatSelected;
    const face = 1 + Math.floor(Math.random() * 6);
    const next = rerollCombatDie(plainSession(), demoBook, demoSystem, index, Math.random, face);
    startRoll(last.faces, () => {
      combatSelected = null;
      if (next.state.sectionId !== session.state.sectionId) arrival = { kind: "combat", session: next };
      else session = next;
    }, [index]);
  }

  function onArriveTest(): void {
    if (commitBusy || !heldTest) return;
    commitBusy = true;
    const next = acceptTest(plainSession(), demoBook, demoSystem);
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
    clearMotion();
    arrival = null;
    panelOpen = false;
    session = undo(plainSession());
  }

  function onNewGame(): void {
    clearMotion();
    arrival = null;
    panelOpen = false;
    session = startSession(demoBook, demoSystem);
    bookmarks = [];
    if (view === "test") {
      view = "read";
      history = [];
      queueMicrotask(() => {
        window.scrollTo(0, 0);
        mainEl?.focus();
      });
    }
  }

  function rollsFor(source: Session, id: string | undefined): RollRecord[] {
    if (!id) return [];
    return source.state.rolls.filter((roll) => roll.id === id);
  }

  function toggleBookmark(): void {
    const id = session.state.sectionId;
    bookmarks = bookmarks.includes(id) ? bookmarks.filter((entry) => entry !== id) : [...bookmarks, id];
  }

  const bookmarked = $derived(bookmarks.includes(session.state.sectionId));

  function screenName(name: ViewName): string {
    if (name === "sheet") return "character";
    if (name === "log") return "keywords and ticks";
    if (name === "rules") return "rules";
    if (name === "test") return "test and fight";
    return "reading";
  }
</script>

<div class="app">
  <nav class="side" aria-label="Screens" data-testid="side-nav">
    <p class="brand">Gamebook Player<small>sample reader</small></p>
    <p class="book-tag" data-testid="book-title">{demoBook.title}</p>
    <button type="button" data-testid="side-read" aria-current={view === "read" ? "page" : undefined} onclick={() => show("read")}>
      Read
    </button>
    <button type="button" data-testid="side-character" aria-current={view === "sheet" ? "page" : undefined} onclick={() => show("sheet")}>
      Character
    </button>
    <button type="button" data-testid="side-test" aria-current={view === "test" ? "page" : undefined} onclick={() => show("test")}>
      Test &amp; fight
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
    </div>
    {#if saveError}
      <p class="error" data-testid="save-error">{saveError}</p>
    {/if}
    {#if view === "read"}
      <div class="layout">
        <div>
          <Reader {section} ticks={mentionedTicks} {panelOpen} onOpenTest={openPanel} {bookmarked} onBookmark={toggleBookmark} />
          {#if panelOpen && section.test}
            <SkillTest
              compact
              label={section.test.label}
              dice={section.test.dice}
              formula={testFormula}
              adjustment={testAdjustment}
              {ready}
              roll={heldRoll}
              rolling={diceRolling}
              {rollingIndexes}
              previewFaces={dicePreview}
              {passTo}
              {passTitle}
              {failTo}
              {failTitle}
              fortune={fortuneNow}
              fortuneMax={fortuneStat?.max ?? 0}
              fortuneCost={demoSystem.fortuneRerollCost}
              selected={heldTest?.selected ?? null}
              onSelect={onSelectDie}
              onReroll={onRerollDie}
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
              round={(session.state.pending?.kind === "combat" ? session.state.pending.round : 0) + 1}
              rounds={section.combat.rounds}
              rolls={combatRolls}
              rolling={diceRolling}
              previewFaces={dicePreview}
              vitality={combatVitality.current}
              vitalityMax={combatVitality.max}
              {ready}
              held={arrival?.kind === "combat"}
              {continueTo}
              {continueTitle}
              {defeated}
              selected={combatSelected}
              fortune={fortuneNow}
              fortuneCost={demoSystem.fortuneRerollCost}
              {rollingIndexes}
              onSelect={onSelectCombatDie}
              onReroll={onRerollCombat}
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
          {#if saveKind === "saving"}
            <p class="save busy" role="status" aria-live="polite" data-testid="autosave" data-phase="writing" data-saved-count={saveCount}>
              <span class="dot" aria-hidden="true"></span>
              <span>Saving…</span>
            </p>
          {:else if saveKind === "failed"}
            <p class="save fail" role="alert" aria-live="assertive" data-testid="autosave" data-phase="failed" data-saved-count={saveCount}>
              <span class="fail-copy"><span class="mark" aria-hidden="true">✗</span> Not saved — this device's storage refused the save</span>
              <button type="button" class="retry" data-testid="save-retry" onclick={retrySave}>Try again</button>
            </p>
          {:else if saveKind === "saved"}
            <p class="save ok" role="status" aria-live="polite" data-testid="autosave" data-phase={writing ? "writing" : "saved"} data-saved-count={saveCount}>
              <span class="mark" aria-hidden="true">✓</span>
              <span>Autosaved on this device · {saveClock}</span>
            </p>
          {:else}
            <p class="save" data-testid="autosave" data-phase={writing ? "writing" : "idle"} data-saved-count={saveCount}></p>
          {/if}
        </aside>
      </div>
    {:else if view === "log"}
      <Log game={session.state} />
    {:else if view === "rules"}
      <Rules />
    {:else if view === "test"}
      <h1>Test &amp; fight</h1>
      <div class="toggles" role="group" aria-label="Dice settings" data-testid="dice-settings">
        <label>
          <input
            type="checkbox"
            data-testid="dice-anim"
            checked={prefs.anim}
            onchange={(event) => savePref("anim", event.currentTarget.checked)}
          />
          Animate rolls
        </label>
        <label>
          <input
            type="checkbox"
            data-testid="dice-sound"
            checked={prefs.sound}
            onchange={(event) => savePref("sound", event.currentTarget.checked)}
          />
          Rolling sound
        </label>
        <span class="note" data-testid="dice-credit">
          Sound: “Wooden dice on wooden table roll” by Wuzzy,
          <a href="https://opengameart.org/content/wooden-dice-on-wodden-table-roll">OpenGameArt</a>, CC0 (trimmed).
        </span>
        {#if soundNote}
          <span class="note" data-testid="dice-sound-note">{soundNote}</span>
        {/if}
      </div>
      <div data-testid="test-view">
        {#if section.test}
          <SkillTest
            compact={false}
            label={section.test.label}
            dice={section.test.dice}
            formula={testFormula}
            adjustment={testAdjustment}
            {ready}
            roll={heldRoll}
            rolling={diceRolling}
            {rollingIndexes}
            previewFaces={dicePreview}
            {passTo}
            {passTitle}
            {failTo}
            {failTitle}
            fortune={fortuneNow}
            fortuneMax={fortuneStat?.max ?? 0}
            fortuneCost={demoSystem.fortuneRerollCost}
            selected={heldTest?.selected ?? null}
            onSelect={onSelectDie}
            onReroll={onRerollDie}
            onRoll={onRollTest}
            onArrive={onArriveTest}
            onClose={closePanel}
            onFull={openFullTest}
          />
        {:else if section.combat}
          <Combat
            combat={section.combat}
            formula={combatFormula}
            round={(session.state.pending?.kind === "combat" ? session.state.pending.round : 0) + 1}
            rounds={section.combat.rounds}
            rolls={combatRolls}
            rolling={diceRolling}
            previewFaces={dicePreview}
            vitality={combatVitality.current}
            vitalityMax={combatVitality.max}
            {ready}
            held={arrival?.kind === "combat"}
            {continueTo}
            {continueTitle}
            {defeated}
            selected={combatSelected}
            fortune={fortuneNow}
            fortuneCost={demoSystem.fortuneRerollCost}
            {rollingIndexes}
            onSelect={onSelectCombatDie}
            onReroll={onRerollCombat}
            onRoll={onRollCombat}
            onContinue={onArriveCombat}
          />
        {:else}
          <p data-testid="test-empty">This section has no test or fight.</p>
        {/if}
      </div>
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
  <button type="button" data-testid="mobile-read" aria-current={view === "read" ? "page" : undefined} onclick={() => show("read")}>
    Read
  </button>
  <button type="button" data-testid="mobile-character" aria-current={view === "sheet" ? "page" : undefined} onclick={() => show("sheet")}>
    Character
  </button>
  <button type="button" data-testid="mobile-test" aria-current={view === "test" ? "page" : undefined} onclick={() => show("test")}>
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
