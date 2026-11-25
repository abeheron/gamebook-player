import { rollDice, rollDie, rollFaces, parseDice, type Rng } from "./dice";
import { skillTestSuccess } from "./test-result";
import { skillAdjustment } from "./skills";
import { applyEffects, cloneState, conditionHolds, initialSession, recordRoll } from "./state";
import { sectionMap } from "../format/validate";
import type {
  Book,
  Character,
  Choice,
  Effect,
  GameState,
  PendingAction,
  PendingCombat,
  RollRecord,
  Section,
  Session,
  SystemDef,
  TestBranch,
  TestDef,
} from "../format/types";

const UNDO_LIMIT = 50;

/** Starts a book at its start section with a character from creation, then runs that section's hook. */
export function startSession(book: Book, system: SystemDef, character: Character): Session {
  const session = initialSession(book.id, book.start, character);
  return { ...session, state: arrive(book, system, session.state) };
}

/**
 * Runs the enter hook of the section the player has just reached. The jump is checked first,
 * so a box ticked on this visit cannot open its own jump. A jump lands on another section,
 * whose own hook then runs.
 */
export function arrive(book: Book, system: SystemDef, state: GameState): GameState {
  const sections = sectionMap(book);
  const seen = new Set<string>();
  let next = state;
  while (!seen.has(next.sectionId)) {
    seen.add(next.sectionId);
    const enter = sections.get(next.sectionId)?.enter;
    if (!enter) return next;
    if (enter.jump && conditionHolds(enter.jump.when, next)) {
      next = cloneState(next);
      next.sectionId = enter.jump.to;
      continue;
    }
    return enter.effects ? applyEffects(next, system, enter.effects) : next;
  }
  return next;
}

/** A fight with no defeat section was lost: the adventure ends here. */
export function adventureOver(book: Book, state: GameState): boolean {
  const section = sectionMap(book).get(state.sectionId);
  return section !== undefined && lostHere(section, state);
}

function lostHere(section: Section, state: GameState): boolean {
  const combat = section.combat;
  if (!combat || combat.defeatSection !== undefined || state.pending) return false;
  const wound = state.stats[combat.wound.stat];
  return wound !== undefined && wound <= combat.wound.defeatAtOrBelow;
}

export function undo(session: Session): Session {
  const previous = session.undo[session.undo.length - 1];
  if (!previous) return session;
  return {
    bookId: session.bookId,
    state: cloneState(previous),
    undo: session.undo.slice(0, -1),
  };
}

export function visibleChoices(section: Section, state: GameState): Choice[] {
  if (lostHere(section, state) || !choicesOpen(section, state)) return [];
  return (section.choices ?? []).filter((choice) => !choice.when || conditionHolds(choice.when, state));
}

/**
 * Choices beside a test stay open before the roll and after a result that stays here. A pass
 * that turns to a section must be taken, as a test pass always is. Any other held action closes them.
 */
export function choicesOpen(section: Section, state: GameState): boolean {
  const pending = state.pending;
  if (!pending) return true;
  if (pending.kind !== "test" || pending.sectionId !== section.id || !section.test) return false;
  return resultBranch(section.test, pending.roll.success)?.to === undefined;
}

export function choose(session: Session, book: Book, system: SystemDef, choiceId: string): Session {
  const section = requireSection(book, session.state.sectionId);
  if (!choicesOpen(section, session.state)) throw new Error("Finish the current action before choosing.");
  const choice = visibleChoices(section, session.state).find((entry) => entry.id === choiceId);
  if (!choice) throw new Error("That choice is not available.");
  const held = session.state.pending?.kind === "test" ? session.state.pending.roll : null;
  let state = applyEffects(session.state, system, choice.effects ?? []);
  // A held test roll was settled here: its result effects are already on the sheet. Log the roll as it leaves.
  if (held) state.rolls = recordRoll(state, held);
  state.sectionId = choice.to;
  state.pending = null;
  return commit(session, arrive(book, system, state));
}

/** The branch a test result takes. Absent means it stays here with nothing to apply. */
export function resultBranch(test: TestDef, success: boolean): TestBranch | undefined {
  return success ? test.success : test.failure;
}

/** Effects of a result that stays on the section. They apply when the roll settles. */
function stayEffects(test: TestDef, success: boolean): Effect[] {
  const branch = resultBranch(test, success);
  return branch && branch.to === undefined ? (branch.effects ?? []) : [];
}

export function rollTest(session: Session, book: Book, system: SystemDef, rng: Rng, faces?: readonly number[]): Session {
  const section = requireSection(book, session.state.sectionId);
  const test = section.test;
  if (!test) throw new Error("This section has no test.");
  if (session.state.pending) throw new Error("Finish the current combat before rolling.");
  const stat = session.state.stats[test.stat];
  if (stat === undefined) throw new Error(`Missing stat ${test.stat}`);
  const parsed = parseDice(test.dice);
  const adjustment = skillAdjustment(system, session.state.skills, test.skill);
  const target = stat + (test.modifier ?? 0) + adjustment;
  const rolled = faces ? rollFaces(parsed, faces) : rollDice(parsed, rng);
  const success = skillTestSuccess(rolled.faces, rolled.total, target);
  const branch = resultBranch(test, success);
  const roll: RollRecord = {
    id: test.id,
    label: test.label,
    dice: test.dice,
    faces: rolled.faces,
    total: rolled.total,
    success,
  };
  let state = applyEffects(session.state, system, branch?.effects ?? []);
  if (branch?.to === undefined) {
    // The result stays here: hold the roll so a fail-only choice can open.
    state.pending = { kind: "test", sectionId: section.id, roll, selected: null };
    return commit(session, state);
  }
  state.rolls = recordRoll(state, roll);
  state.sectionId = branch.to;
  state.pending = null;
  return commit(session, arrive(book, system, state));
}

/** Rolls a skill test and keeps it on this section until the player takes the result. */
export function holdTestRoll(session: Session, book: Book, system: SystemDef, rng: Rng, faces?: readonly number[]): Session {
  const section = requireSection(book, session.state.sectionId);
  const test = section.test;
  if (!test) throw new Error("This section has no test.");
  if (session.state.pending) throw new Error("Finish the current action before rolling.");
  const roll = judgeTest(session, section, system, rng, faces);
  // A result that stays here applies its effects now, so the sheet shows them while the player chooses.
  const state = applyEffects(session.state, system, stayEffects(test, roll.success));
  state.pending = { kind: "test", sectionId: section.id, roll, selected: null };
  return commit(session, state);
}

/** Chooses one die for the next Fortune spend. Choosing it again clears the choice. This is not an undo step. */
export function selectTestDie(session: Session, index: number): Session {
  const pending = session.state.pending;
  if (!pending || pending.kind !== "test") return session;
  if (!Number.isInteger(index) || index < 0 || index >= pending.roll.faces.length) return session;
  const selected = pending.selected === index ? null : index;
  const state = cloneState(session.state);
  state.pending = { ...pending, selected };
  return { bookId: session.bookId, state, undo: session.undo };
}

/** Spends the system's Fortune cost to replace one die on the held test. */
export function rerollTestDie(
  session: Session,
  book: Book,
  system: SystemDef,
  index: number,
  rng: Rng,
  face?: number,
): Session {
  const pending = session.state.pending;
  if (!pending || pending.kind !== "test" || pending.sectionId !== session.state.sectionId) {
    throw new Error("There is no test to reroll.");
  }
  const section = requireSection(book, pending.sectionId);
  const test = section.test;
  if (!test) throw new Error("This section has no test.");
  if (!Number.isInteger(index) || index < 0 || index >= pending.roll.faces.length) {
    throw new Error("That die is not in this roll.");
  }
  const fortune = session.state.stats[system.fortuneStat];
  if (fortune === undefined || fortune < system.fortuneRerollCost) throw new Error("Not enough Fortune.");
  const parsed = parseDice(test.dice);
  const nextFace = face === undefined ? rollDie(parsed.sides, rng) : face;
  const faces = pending.roll.faces.slice();
  faces[index] = nextFace;
  const rolled = rollFaces(parsed, faces);
  const success = skillTestSuccess(rolled.faces, rolled.total, testTarget(session, section, system));
  const spend: Effect = { op: "adjustStat", stat: system.fortuneStat, by: -system.fortuneRerollCost };
  let state =
    success === pending.roll.success
      ? applyEffects(session.state, system, [spend])
      : resettle(session, system, test, pending.roll.success, success);
  state.pending = {
    kind: "test",
    sectionId: pending.sectionId,
    selected: null,
    roll: { ...pending.roll, faces: rolled.faces, total: rolled.total, success },
  };
  return commit(session, state);
}

/** Takes the held test's pass or fail turn and clears the pending roll. */
export function acceptTest(session: Session, book: Book, system: SystemDef): Session {
  const pending = session.state.pending;
  if (!pending || pending.kind !== "test" || pending.sectionId !== session.state.sectionId) {
    throw new Error("There is no test to take.");
  }
  const section = requireSection(book, pending.sectionId);
  const test = section.test;
  if (!test) throw new Error("This section has no test.");
  const branch = resultBranch(test, pending.roll.success);
  if (branch?.to === undefined) throw new Error("This result stays here. Choose from the options.");
  let state = applyEffects(session.state, system, branch.effects ?? []);
  state.rolls = recordRoll(state, pending.roll);
  state.sectionId = branch.to;
  state.pending = null;
  return commit(session, arrive(book, system, state));
}

/** One fight round: Talent test at the passage penalty. A miss is one Wound. Vitality at the defeat line ends the fight; otherwise it is won by finishing the rounds. */
export function rollCombatRound(session: Session, book: Book, system: SystemDef, rng: Rng): Session {
  const section = requireSection(book, session.state.sectionId);
  const combat = section.combat;
  if (!combat) throw new Error("This section has no combat.");
  if (adventureOver(book, session.state)) throw new Error("The adventure is over.");
  const completed = completedRounds(session.state.pending, section.id);
  if (completed >= combat.rounds) throw new Error("This combat is already over.");
  const stat = session.state.stats[combat.stat];
  if (stat === undefined) throw new Error(`Missing stat ${combat.stat}`);
  const rolled = rollDice(parseDice(combat.dice), rng);
  const success = rolled.total <= stat + (combat.modifier ?? 0);
  const roll: RollRecord = {
    id: combat.id,
    label: combat.label,
    dice: combat.dice,
    faces: rolled.faces,
    total: rolled.total,
    success,
  };
  let state = cloneState(session.state);
  state.rolls = recordRoll(state, roll);
  if (!success) {
    state = applyEffects(state, system, [
      { op: "adjustStat", stat: combat.wound.stat, by: -combat.wound.amount },
    ]);
  }
  const wound = state.stats[combat.wound.stat];
  const nextRound = completed + 1;
  if (wound !== undefined && wound <= combat.wound.defeatAtOrBelow) {
    // With no defeat section, the player stays here and the adventure is over.
    state.sectionId = combat.defeatSection ?? section.id;
    state.pending = null;
  } else if (nextRound >= combat.rounds) {
    state.sectionId = combat.then;
    state.pending = null;
  } else {
    const pending: PendingCombat = { kind: "combat", sectionId: section.id, round: nextRound };
    state.pending = pending;
  }
  return commit(session, state.sectionId === section.id ? state : arrive(book, system, state));
}

/** Spends 1 Fortune to replace one die on the current fight round. Earlier rounds stay as they were. */
export function rerollCombatDie(
  session: Session,
  book: Book,
  system: SystemDef,
  index: number,
  rng: Rng,
  face?: number,
): Session {
  const section = requireSection(book, session.state.sectionId);
  const combat = section.combat;
  if (!combat) throw new Error("This section has no combat.");
  const pending = session.state.pending;
  if (!pending || pending.kind !== "combat" || pending.sectionId !== section.id) {
    throw new Error("There is no fight round to reroll.");
  }
  const lastIndex = lastCombatRoll(session.state.rolls, combat.id);
  if (lastIndex < 0) throw new Error("There is no fight round to reroll.");
  const last = session.state.rolls[lastIndex];
  if (!last || !Number.isInteger(index) || index < 0 || index >= last.faces.length) {
    throw new Error("That die is not in this round.");
  }
  const fortune = session.state.stats[system.fortuneStat];
  if (fortune === undefined || fortune < system.fortuneRerollCost) throw new Error("Not enough Fortune.");
  const parsed = parseDice(combat.dice);
  const nextFace = face === undefined ? rollDie(parsed.sides, rng) : face;
  const faces = last.faces.slice();
  faces[index] = nextFace;
  const rolled = rollFaces(parsed, faces);
  const stat = session.state.stats[combat.stat];
  if (stat === undefined) throw new Error(`Missing stat ${combat.stat}`);
  const success = rolled.total <= stat + (combat.modifier ?? 0);
  let state = applyEffects(session.state, system, [{ op: "adjustStat", stat: system.fortuneStat, by: -system.fortuneRerollCost }]);
  if (!last.success) {
    state = applyEffects(state, system, [{ op: "adjustStat", stat: combat.wound.stat, by: combat.wound.amount }]);
  }
  const rolls = state.rolls.slice();
  rolls[lastIndex] = { ...last, faces: rolled.faces, total: rolled.total, success };
  state.rolls = rolls;
  if (!success) {
    state = applyEffects(state, system, [{ op: "adjustStat", stat: combat.wound.stat, by: -combat.wound.amount }]);
  }
  const wound = state.stats[combat.wound.stat];
  if (wound !== undefined && wound <= combat.wound.defeatAtOrBelow) {
    state.sectionId = combat.defeatSection ?? section.id;
    state.pending = null;
  }
  return commit(session, state.sectionId === section.id ? state : arrive(book, system, state));
}

/**
 * A Fortune re-roll turned a pass into a fail or back. Takes off the effects the old result put
 * on the sheet and puts on the new result's, then spends the Fortune. The sheet as it was before
 * the roll is the newest undo step with no held action; the Fortune spent on earlier re-rolls is
 * carried over. Without that step, only stat changes can be reversed, as a fight re-roll does.
 */
function resettle(session: Session, system: SystemDef, test: TestDef, was: boolean, now: boolean): GameState {
  const before = stayEffects(test, was);
  const after = stayEffects(test, now);
  const fortune = system.fortuneStat;
  const cost = system.fortuneRerollCost;
  if (before.length === 0) {
    return applyEffects(session.state, system, [{ op: "adjustStat", stat: fortune, by: -cost }, ...after]);
  }
  let rerolls = 0;
  for (let index = session.undo.length - 1; index >= 0; index -= 1) {
    const earlier = session.undo[index];
    if (!earlier) break;
    if (earlier.pending === null && earlier.sectionId === session.state.sectionId) {
      const base = cloneState(earlier);
      const spent = cost * (rerolls + 1);
      return applyEffects(base, system, [{ op: "adjustStat", stat: fortune, by: -spent }, ...after]);
    }
    if (earlier.pending?.kind !== "test") break;
    rerolls += 1;
  }
  const undoStats: Effect[] = before.flatMap((effect) => (effect.op === "adjustStat" ? [{ ...effect, by: -effect.by }] : []));
  return applyEffects(session.state, system, [...undoStats, { op: "adjustStat", stat: fortune, by: -cost }, ...after]);
}

function lastCombatRoll(rolls: readonly RollRecord[], combatId: string): number {
  for (let index = rolls.length - 1; index >= 0; index -= 1) {
    if (rolls[index]?.id === combatId) return index;
  }
  return -1;
}

export function currentSection(book: Book, session: Session): Section {
  return requireSection(book, session.state.sectionId);
}

function judgeTest(
  session: Session,
  section: Section,
  system: SystemDef,
  rng: Rng,
  faces?: readonly number[],
): RollRecord {
  const test = section.test;
  if (!test) throw new Error("This section has no test.");
  const parsed = parseDice(test.dice);
  const rolled = faces ? rollFaces(parsed, faces) : rollDice(parsed, rng);
  return {
    id: test.id,
    label: test.label,
    dice: test.dice,
    faces: rolled.faces,
    total: rolled.total,
    success: skillTestSuccess(rolled.faces, rolled.total, testTarget(session, section, system)),
  };
}

function testTarget(session: Session, section: Section, system: SystemDef): number {
  const test = section.test;
  if (!test) throw new Error("This section has no test.");
  const stat = session.state.stats[test.stat];
  if (stat === undefined) throw new Error(`Missing stat ${test.stat}`);
  return stat + (test.modifier ?? 0) + skillAdjustment(system, session.state.skills, test.skill);
}

function completedRounds(pending: PendingAction | null, sectionId: string): number {
  if (!pending) return 0;
  if (pending.kind !== "combat" || pending.sectionId !== sectionId) {
    throw new Error("A different action is still in progress.");
  }
  return pending.round;
}

function commit(session: Session, state: GameState): Session {
  return {
    bookId: session.bookId,
    state,
    undo: [...session.undo, cloneState(session.state)].slice(-UNDO_LIMIT),
  };
}

function requireSection(book: Book, sectionId: string): Section {
  const section = sectionMap(book).get(sectionId);
  if (!section) throw new Error(`Unknown section ${sectionId}`);
  return section;
}
