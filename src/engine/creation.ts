import type { Character, SystemDef, WeaponType } from "../format/types";

/** GNAT character creation, p.6: two free basic skills, up to three Talent trades, one weapon. */
export const FREE_SKILLS = 2;
export const MAX_TRADES = 3;
export const TALENT = "talent";
export const WEAPONS: readonly WeaponType[] = ["one-handed", "long", "two-handed"];

/** Choices made on the creation screen. Nothing here is saved until Begin. */
export interface CreationDraft {
  /** Skill ids in the order they were ticked. Picks beyond the first two are the trades. */
  picked: string[];
  weapon: WeaponType | null;
  shield: boolean;
}

export function emptyDraft(): CreationDraft {
  return { picked: [], weapon: null, shield: false };
}

export function tradesIn(draft: CreationDraft): number {
  return Math.max(0, draft.picked.length - FREE_SKILLS);
}

/** True when every skill slot, free and traded, is used. */
export function skillsFull(draft: CreationDraft): boolean {
  return draft.picked.length >= FREE_SKILLS + MAX_TRADES;
}

export function baseTalent(system: SystemDef): number {
  return system.stats.find((stat) => stat.id === TALENT)?.initial ?? 0;
}

/** Talent now, and the maximum Talent this character keeps: the start value less one per trade. */
export function talentFor(system: SystemDef, draft: CreationDraft): number {
  return baseTalent(system) - tradesIn(draft);
}

/** Ticks or unticks a skill. A pick beyond five, which would be a fourth trade, is refused. */
export function toggleSkill(system: SystemDef, draft: CreationDraft, id: string): CreationDraft {
  if (!system.skills.some((skill) => skill.id === id)) return draft;
  if (draft.picked.includes(id)) return { ...draft, picked: draft.picked.filter((entry) => entry !== id) };
  if (skillsFull(draft)) return draft;
  return { ...draft, picked: [...draft.picked, id] };
}

/** Removes the latest extra skill, which gives its Talent back. Does nothing with no trades. */
export function undoLastTrade(draft: CreationDraft): CreationDraft {
  if (tradesIn(draft) === 0) return draft;
  return { ...draft, picked: draft.picked.slice(0, -1) };
}

/** A shield goes only with a one-handed weapon, so any other choice clears it. */
export function chooseWeapon(draft: CreationDraft, weapon: WeaponType): CreationDraft {
  return { ...draft, weapon, shield: weapon === "one-handed" ? draft.shield : false };
}

export function setShield(draft: CreationDraft, shield: boolean): CreationDraft {
  if (shield && draft.weapon !== "one-handed") return draft;
  return { ...draft, shield };
}

/** What still stops Begin, in the screen's words. Empty when ready. */
export function stillNeeded(draft: CreationDraft): string[] {
  const need: string[] = [];
  const left = FREE_SKILLS - draft.picked.length;
  if (left > 0) need.push(`pick ${left} more skill${left > 1 ? "s" : ""}`);
  if (!draft.weapon) need.push("choose a weapon");
  return need;
}

export function beginReason(system: SystemDef, draft: CreationDraft): { ready: boolean; text: string } {
  const need = stillNeeded(draft);
  if (need.length === 0) return { ready: true, text: `Ready. You start with Talent ${talentFor(system, draft)}.` };
  return { ready: false, text: `To begin, ${need.join(" and ")}.` };
}

/** The character Begin creates, or null while the draft is not ready. */
export function buildCharacter(system: SystemDef, draft: CreationDraft): Character | null {
  if (stillNeeded(draft).length > 0 || !draft.weapon) return null;
  if (draft.picked.length > FREE_SKILLS + MAX_TRADES) return null;
  const stats: Record<string, number> = {};
  for (const stat of system.stats) stats[stat.id] = stat.initial;
  const talent = talentFor(system, draft);
  stats[TALENT] = talent;
  return {
    stats,
    maxima: { [TALENT]: talent },
    skills: draft.picked.map((id) => ({ id, bonus: system.basicSkillBonus })),
    gold: system.startingGold,
    items: system.startingItems.map((item) => ({ id: item.id, label: item.label })),
    weapon: draft.weapon,
    shield: draft.weapon === "one-handed" && draft.shield,
  };
}

/**
 * The ready-made Lantern Stair hero from the system file. Only automated tests reach it,
 * through a hidden query. Players always go through character creation.
 */
export function fixtureCharacter(system: SystemDef): Character {
  const stats: Record<string, number> = {};
  for (const stat of system.stats) stats[stat.id] = stat.initial;
  return {
    stats,
    maxima: { [TALENT]: baseTalent(system) },
    skills: system.startingSkills.map((skill) => ({ id: skill.id, bonus: skill.bonus })),
    gold: system.startingGold,
    items: system.startingItems.map((item) => ({ id: item.id, label: item.label })),
    weapon: "one-handed",
    shield: false,
  };
}

/**
 * The ready-made hero for the hidden P32 fixture: the starting kit, with Climbing and
 * Naturalist as the free skills, so a Naturalist test reads Talent 9 + 2 Naturalist = 11.
 */
export function gladeCharacter(system: SystemDef): Character {
  const base = fixtureCharacter(system);
  return {
    ...base,
    skills: [
      { id: "climbing", bonus: system.basicSkillBonus },
      { id: "naturalist", bonus: system.basicSkillBonus },
    ],
  };
}
