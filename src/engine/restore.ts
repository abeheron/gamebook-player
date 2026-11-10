import type { Book, GameState, RollRecord, Session, SystemDef } from "../format/types";
import { sectionMap } from "../format/validate";
import { parseDice } from "./dice";
import { skillAdjustment } from "./skills";

const ID = /^[a-z0-9][a-z0-9-]{0,40}$/;

/** Rejects saves that do not match the book currently in memory. */
export function canRestore(value: unknown, book: Book, system: SystemDef): value is Session {
  if (!isRecord(value)) return false;
  if (value.bookId !== book.id) return false;
  const history = value.undo;
  if (!Array.isArray(history) || history.length > 50) return false;
  if (!isState(value.state, book, system)) return false;
  return history.every((entry) => isState(entry, book, system));
}

function isState(value: unknown, book: Book, system: SystemDef): value is GameState {
  if (!isRecord(value)) return false;
  if (typeof value.sectionId !== "string" || !sectionMap(book).has(value.sectionId)) return false;
  if (!isRecord(value.stats)) return false;
  if (Object.keys(value.stats).length !== system.stats.length) return false;
  for (const stat of system.stats) {
    const current = value.stats[stat.id];
    if (typeof current !== "number" || !Number.isInteger(current)) return false;
    if (current < stat.min || current > stat.max) return false;
  }
  if (!Array.isArray(value.skills) || !skillsFit(value.skills, system)) return false;
  if (typeof value.gold !== "number" || !Number.isSafeInteger(value.gold) || value.gold < 0) return false;
  if (!Array.isArray(value.items) || !value.items.every(isNamed)) return false;
  if (!Array.isArray(value.keywords) || !value.keywords.every(isNamed)) return false;
  if (!isRecord(value.ticks)) return false;
  for (const tick of Object.values(value.ticks)) {
    if (!isRecord(tick)) return false;
    if (typeof tick.label !== "string" || tick.label.length === 0 || tick.label.length > 80) return false;
    if (typeof tick.count !== "number" || !Number.isInteger(tick.count) || tick.count < 1 || tick.count > 99) {
      return false;
    }
  }
  if (!Array.isArray(value.rolls) || value.rolls.length > 40 || !value.rolls.every(isRoll)) return false;
  if (value.pending === null) return true;
  const pending = value.pending;
  if (!isRecord(pending) || pending.sectionId !== value.sectionId) return false;
  if (pending.kind === "combat") {
    const combat = sectionMap(book).get(value.sectionId)?.combat;
    if (!combat) return false;
    const round = pending.round;
    return typeof round === "number" && Number.isInteger(round) && round >= 1 && round < combat.rounds;
  }
  if (pending.kind !== "test") return false;
  return isHeldTest(
    pending,
    value.sectionId as string,
    value.stats as Record<string, number>,
    value.skills as GameState["skills"],
    book,
    system,
  );
}

function isHeldTest(
  pending: Record<string, unknown>,
  sectionId: string,
  stats: Record<string, number>,
  skills: GameState["skills"],
  book: Book,
  system: SystemDef,
): boolean {
  const test = sectionMap(book).get(sectionId)?.test;
  if (!test || !isRoll(pending.roll) || pending.roll.id !== test.id || pending.roll.dice !== test.dice) return false;
  let parsed;
  try {
    parsed = parseDice(test.dice);
  } catch {
    return false;
  }
  if (pending.roll.faces.length !== parsed.count) return false;
  if (pending.roll.faces.some((face) => face < 1 || face > parsed.sides)) return false;
  const total = pending.roll.faces.reduce((sum, face) => sum + face, parsed.modifier);
  if (pending.roll.total !== total) return false;
  const stat = stats[test.stat];
  if (stat === undefined) return false;
  const target = stat + (test.modifier ?? 0) + skillAdjustment(system, skills, test.skill);
  if (pending.roll.success !== total <= target) return false;
  if (pending.selected === null) return true;
  return typeof pending.selected === "number" && Number.isInteger(pending.selected) && pending.selected >= 0 && pending.selected < pending.roll.faces.length;
}

function isRoll(value: unknown): value is RollRecord {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || !ID.test(value.id)) return false;
  if (typeof value.label !== "string" || value.label.length === 0 || value.label.length > 160) return false;
  if (typeof value.dice !== "string") return false;
  if (typeof value.total !== "number" || !Number.isInteger(value.total)) return false;
  if (typeof value.success !== "boolean") return false;
  return Array.isArray(value.faces) && value.faces.every((face) => typeof face === "number" && Number.isInteger(face));
}

function skillsFit(value: unknown[], system: SystemDef): boolean {
  const seen = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry) || Object.keys(entry).length !== 2) return false;
    if (typeof entry.id !== "string" || !ID.test(entry.id) || seen.has(entry.id)) return false;
    if (!system.skills.some((skill) => skill.id === entry.id)) return false;
    if (typeof entry.bonus !== "number" || !Number.isInteger(entry.bonus)) return false;
    if (entry.bonus < system.basicSkillBonus || entry.bonus > 99) return false;
    seen.add(entry.id);
  }
  return true;
}

function isNamed(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    ID.test(value.id) &&
    typeof value.label === "string" &&
    value.label.length > 0 &&
    value.label.length <= 80 &&
    Object.keys(value).length === 2
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
