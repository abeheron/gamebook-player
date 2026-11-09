import { rollDice, rollFaces, parseDice, type Rng } from "./dice";
import { skillAdjustment } from "./skills";
import { applyEffects, cloneState, conditionHolds, initialSession, recordRoll } from "./state";
import { sectionMap } from "../format/validate";
import type {
  Book,
  Choice,
  GameState,
  PendingCombat,
  RollRecord,
  Section,
  Session,
  SystemDef,
} from "../format/types";

const UNDO_LIMIT = 50;

export function startSession(book: Book, system: SystemDef): Session {
  return initialSession(book.id, system, book.start);
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
  if (state.pending) return [];
  return (section.choices ?? []).filter((choice) => !choice.when || conditionHolds(choice.when, state));
}

export function choose(session: Session, book: Book, system: SystemDef, choiceId: string): Session {
  const section = requireSection(book, session.state.sectionId);
  if (session.state.pending) throw new Error("Finish the current combat before choosing.");
  const choice = visibleChoices(section, session.state).find((entry) => entry.id === choiceId);
  if (!choice) throw new Error("That choice is not available.");
  let state = applyEffects(session.state, system, choice.effects ?? []);
  state.sectionId = choice.to;
  state.pending = null;
  return commit(session, state);
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
  const success = rolled.total <= target;
  const branch = success ? test.success : test.failure;
  const roll: RollRecord = {
    id: test.id,
    label: test.label,
    dice: test.dice,
    faces: rolled.faces,
    total: rolled.total,
    success,
  };
  let state = applyEffects(session.state, system, branch.effects ?? []);
  state.rolls = recordRoll(state, roll);
  state.sectionId = branch.to;
  state.pending = null;
  return commit(session, state);
}

/** One fight round: Talent test at the passage penalty. A miss is one Wound. Vitality at the defeat line ends the fight; otherwise it is won by finishing the rounds. */
export function rollCombatRound(session: Session, book: Book, system: SystemDef, rng: Rng): Session {
  const section = requireSection(book, session.state.sectionId);
  const combat = section.combat;
  if (!combat) throw new Error("This section has no combat.");
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
    state.sectionId = combat.defeatSection;
    state.pending = null;
  } else if (nextRound >= combat.rounds) {
    state.sectionId = combat.then;
    state.pending = null;
  } else {
    const pending: PendingCombat = { kind: "combat", sectionId: section.id, round: nextRound };
    state.pending = pending;
  }
  return commit(session, state);
}

export function currentSection(book: Book, session: Session): Section {
  return requireSection(book, session.state.sectionId);
}

function completedRounds(pending: PendingCombat | null, sectionId: string): number {
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
