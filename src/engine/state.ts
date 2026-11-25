import type { Character, Condition, Effect, GameState, Session, SystemDef } from "../format/types";

const ROLL_LIMIT = 40;

export function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

export function initialState(sectionId: string, character: Character): GameState {
  return {
    sectionId,
    stats: { ...character.stats },
    maxima: { ...character.maxima },
    skills: character.skills.map((skill) => ({ id: skill.id, bonus: skill.bonus })),
    gold: character.gold,
    items: character.items.map((item) => ({ id: item.id, label: item.label })),
    weapon: character.weapon,
    shield: character.shield,
    keywords: [],
    ticks: {},
    rolls: [],
    pending: null,
  };
}

export function initialSession(bookId: string, sectionId: string, character: Character): Session {
  return { bookId, state: initialState(sectionId, character), undo: [] };
}

export function conditionHolds(condition: Condition, state: GameState): boolean {
  switch (condition.op) {
    case "hasItem":
      return state.items.some((item) => item.id === condition.id);
    case "keyword":
      return state.keywords.some((keyword) => keyword.id === condition.id);
    case "ticked": {
      const tick = state.ticks[condition.id];
      return tick !== undefined && tick.count > 0;
    }
    case "statAtLeast": {
      const value = state.stats[condition.stat];
      return value !== undefined && value >= condition.value;
    }
    case "not":
      return !conditionHolds(condition.condition, state);
    case "all":
      return condition.conditions.every((entry) => conditionHolds(entry, state));
    case "testFailed": {
      // Only a held roll on this section counts. No roll yet, or a pass, keeps the choice locked.
      const pending = state.pending;
      return pending?.kind === "test" && pending.sectionId === state.sectionId && !pending.roll.success;
    }
    default: {
      const unreachable: never = condition;
      throw new Error(`Unknown condition ${JSON.stringify(unreachable)}`);
    }
  }
}

export function applyEffects(state: GameState, system: SystemDef, effects: readonly Effect[]): GameState {
  const next = cloneState(state);
  for (const effect of effects) applyEffect(next, system, effect);
  return next;
}

function applyEffect(state: GameState, system: SystemDef, effect: Effect): void {
  switch (effect.op) {
    case "addItem":
      if (!state.items.some((item) => item.id === effect.id)) {
        state.items.push({ id: effect.id, label: effect.label });
      }
      return;
    case "removeItem":
      state.items = state.items.filter((item) => item.id !== effect.id);
      return;
    case "gainKeyword":
      if (!state.keywords.some((keyword) => keyword.id === effect.id)) {
        state.keywords.push({ id: effect.id, label: effect.label });
      }
      return;
    case "tick": {
      const current = state.ticks[effect.id];
      state.ticks[effect.id] = {
        label: effect.label,
        count: (current?.count ?? 0) + 1,
      };
      return;
    }
    case "adjustStat": {
      const def = system.stats.find((stat) => stat.id === effect.stat);
      const current = state.stats[effect.stat];
      if (!def || current === undefined) throw new Error(`Unknown stat ${effect.stat}`);
      const ceiling = Math.min(def.max, state.maxima[effect.stat] ?? def.max);
      state.stats[effect.stat] = Math.min(ceiling, Math.max(def.min, current + effect.by));
      return;
    }
    default: {
      const unreachable: never = effect;
      throw new Error(`Unknown effect ${JSON.stringify(unreachable)}`);
    }
  }
}

export function recordRoll(state: GameState, roll: GameState["rolls"][number]): GameState["rolls"] {
  return [...state.rolls, roll].slice(-ROLL_LIMIT);
}
