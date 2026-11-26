import type { Book, GameState, NamedValue, Session, SystemDef } from "../format/types";
import { TALENT } from "../engine/creation";
import { SAVE_VERSION, type SaveRecord } from "./types";

/**
 * Turns a version 1 to 5 save into version 6. A version 6 save is returned unchanged.
 * Saves before version 5 were the ready-made demo character: no trades and no chosen weapon.
 * They gain a Talent maximum at the starting Talent, a one-handed weapon, and no shield.
 * Saves before version 6 had no fight set-up (P35): every state gains `fight: null`. Their fight
 * rolls have no re-roll notes, which is still a valid roll.
 */
export function migrateSave(value: unknown, system: SystemDef, book: Book): SaveRecord | null {
  if (!isRecord(value) || typeof value.savedAt !== "string") return null;
  const version = value.version;
  if (version === SAVE_VERSION) {
    if (!isSession(value.session)) return null;
    const bookmarks = parseBookmarks(value.bookmarks, book);
    if (!bookmarks) return null;
    return { version: SAVE_VERSION, savedAt: value.savedAt, session: value.session, bookmarks };
  }
  if (version !== 1 && version !== 2 && version !== 3 && version !== 4 && version !== 5) return null;
  if (!isSession(value.session)) return null;
  const bookmarks = version >= 3 ? parseBookmarks(value.bookmarks, book) : [];
  if (!bookmarks) return null;
  const earlier = version === 1 ? migrateSession(value.session, system) : value.session;
  if (!earlier) return null;
  const equipped = version === 5 ? earlier : equipSession(earlier, system);
  if (!equipped) return null;
  const session = withFight(equipped);
  if (!session) return null;
  return { version: SAVE_VERSION, savedAt: value.savedAt, session, bookmarks };
}

/** Adds the version 6 fight set-up, empty, to every state in an older session. */
function withFight(session: Session): Session | null {
  const add = (value: unknown): GameState | null => {
    if (!isRecord(value)) return null;
    const next = structuredClone(value) as unknown as GameState;
    next.fight = null;
    return next;
  };
  const state = add(session.state);
  if (!state) return null;
  const undo: GameState[] = [];
  for (const entry of session.undo) {
    const next = add(entry);
    if (!next) return null;
    undo.push(next);
  }
  return { bookId: session.bookId, state, undo };
}

function parseBookmarks(value: unknown, book: Book): string[] | null {
  if (!Array.isArray(value) || value.length > 200) return null;
  const ids = new Set(book.sections.map((section) => section.id));
  const seen = new Set<string>();
  const bookmarks: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string" || !ids.has(entry) || seen.has(entry)) return null;
    seen.add(entry);
    bookmarks.push(entry);
  }
  return bookmarks;
}

function migrateSession(session: Session, system: SystemDef): Session | null {
  const state = migrateState(session.state, system);
  if (!state) return null;
  const undo: GameState[] = [];
  for (const entry of session.undo) {
    const next = migrateState(entry, system);
    if (!next) return null;
    undo.push(next);
  }
  return { bookId: session.bookId, state, undo };
}

/** Adds the version 5 character fields to every state in a version 1 to 4 session. */
function equipSession(session: Session, system: SystemDef): Session | null {
  const state = equipState(session.state, system);
  if (!state) return null;
  const undo: GameState[] = [];
  for (const entry of session.undo) {
    const next = equipState(entry, system);
    if (!next) return null;
    undo.push(next);
  }
  return { bookId: session.bookId, state, undo };
}

function equipState(value: unknown, system: SystemDef): GameState | null {
  if (!isRecord(value)) return null;
  const next = structuredClone(value) as unknown as GameState;
  const talent = system.stats.find((stat) => stat.id === TALENT);
  // Every older save started at Talent 9 with no trades. A Talent already above that keeps its value as the ceiling.
  const current = isRecord(next.stats) ? next.stats[TALENT] : undefined;
  next.maxima = talent ? { [TALENT]: Math.max(talent.initial, typeof current === "number" ? current : 0) } : {};
  next.weapon = "one-handed";
  next.shield = false;
  return next;
}

function migrateState(value: unknown, system: SystemDef): GameState | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null;
  const next = structuredClone(value) as unknown as GameState;
  const items: NamedValue[] = next.items;
  for (const item of [...system.startingItems].reverse()) {
    if (!items.some((entry) => entry?.id === item.id)) {
      items.unshift({ id: item.id, label: item.label });
    }
  }
  next.skills = system.startingSkills.map((skill) => ({ id: skill.id, bonus: skill.bonus }));
  next.gold = system.startingGold;
  return next;
}

function isSession(value: unknown): value is Session {
  if (!isRecord(value) || typeof value.bookId !== "string") return false;
  return isRecord(value.state) && Array.isArray(value.undo);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
