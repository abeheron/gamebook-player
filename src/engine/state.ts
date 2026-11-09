import type { Condition, Effect, GameState, Session, SystemDef } from "../format/types";

const ROLL_LIMIT = 40;

export function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

export function initialState(system: SystemDef, sectionId: string): GameState {
  const stats: Record<string, number> = {};
  for (const stat of system.stats) stats[stat.id] = stat.initial;
  return {
    sectionId,
    stats,
    skills: system.startingSkills.map((skill) => ({ id: skill.id, bonus: skill.bonus })),
    gold: system.startingGold,
    items: system.startingItems.map((item) => ({ id: item.id, label: item.label })),
    keywords: [],
    ticks: {},
    rolls: [],
    pending: null,
  };
}

export function initialSession(bookId: string, system: SystemDef, sectionId: string): Session {
  return { bookId, state: initialState(system, sectionId), undo: [] };
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
      state.stats[effect.stat] = Math.min(def.max, Math.max(def.min, current + effect.by));
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
