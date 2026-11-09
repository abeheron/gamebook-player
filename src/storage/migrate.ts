import type { GameState, NamedValue, Session, SystemDef } from "../format/types";
import { SAVE_VERSION, type SaveRecord } from "./types";

/** Turns a version 1 save into version 2. A version 2 save is returned unchanged. */
export function migrateSave(value: unknown, system: SystemDef): SaveRecord | null {
  if (!isRecord(value) || typeof value.savedAt !== "string") return null;
  if (value.version === SAVE_VERSION) {
    if (!isSession(value.session)) return null;
    return { version: SAVE_VERSION, savedAt: value.savedAt, session: value.session };
  }
  if (value.version !== 1 || !isSession(value.session)) return null;
  const session = migrateSession(value.session, system);
  if (!session) return null;
  return { version: SAVE_VERSION, savedAt: value.savedAt, session };
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
