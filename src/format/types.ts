/** Plain data for a book. Imported books are untrusted and must pass validation. */

export interface StatDef {
  id: string;
  label: string;
  initial: number;
  min: number;
  max: number;
}

export interface SkillDef {
  id: string;
  label: string;
}

/** A skill the character has. Basic skills use `basicSkillBonus`. An advanced skill stores a higher bonus. */
export interface SkillRank {
  id: string;
  bonus: number;
}

/** Incomplete GNAT-shaped configuration. Not the full GNAT rules. */
export interface SystemDef {
  id: string;
  name: string;
  attribution: string;
  stats: StatDef[];
  skills: SkillDef[];
  /** Added to the target when a test names a basic skill the character has. */
  basicSkillBonus: number;
  /** Added to the target when a test names a skill the character does not have. */
  absentSkillPenalty: number;
  startingSkills: SkillRank[];
  startingGold: number;
  startingItems: NamedValue[];
  /** Stat spent to reroll one die. */
  fortuneStat: string;
  /** Fortune points spent to reroll one selected die. */
  fortuneRerollCost: number;
}

export type Effect =
  | { op: "addItem"; id: string; label: string }
  | { op: "removeItem"; id: string }
  | { op: "gainKeyword"; id: string; label: string }
  | { op: "tick"; id: string; label: string }
  | { op: "adjustStat"; stat: string; by: number };

export type Condition =
  | { op: "hasItem"; id: string }
  | { op: "keyword"; id: string }
  | { op: "ticked"; id: string }
  | { op: "statAtLeast"; stat: string; value: number }
  | { op: "not"; condition: Condition }
  | { op: "all"; conditions: Condition[] }
  /** Only on a choice beside a test: true while this section's held test roll has failed. */
  | { op: "testFailed" };

export interface Choice {
  id: string;
  label: string;
  to: string;
  when?: Condition;
  effects?: Effect[];
}

/**
 * One result of a test. With `to`, the result turns there. Without it, the player stays on the
 * section and picks one of its choices; any effects apply as soon as the roll settles.
 */
export interface TestBranch {
  to?: string;
  effects?: Effect[];
}

/** One roll-under check. Crits, fumbles, and re-rolls are not part of this step. */
export interface TestDef {
  id: string;
  label: string;
  dice: string;
  stat: string;
  modifier?: number;
  /** When set, the character's bonus for this skill, or the absent-skill penalty, adjusts the target before the roll is judged. */
  skill?: string;
  /** Absent when a pass stays on the section with nothing to apply. The section then needs choices. */
  success?: TestBranch;
  /** Absent when a fail stays on the section with nothing to apply. The section then needs choices. */
  failure?: TestBranch;
}

export interface CombatDef {
  id: string;
  label: string;
  rounds: number;
  dice: string;
  stat: string;
  modifier?: number;
  wound: { stat: string; amount: number; defeatAtOrBelow: number };
  /** Where a defeat sends the player. Absent means defeat ends the adventure. */
  defeatSection?: string;
  then: string;
}

/** A section picture. The id names a bundled sample drawing. */
export interface Illustration {
  id: string;
  label: string;
  title: string;
  alt: string;
}

/**
 * Runs when the player arrives at a section. If `jump.when` already holds, the player goes
 * straight to `jump.to`. Otherwise `effects` apply and the player stays. A box the book
 * asks you to tick ("If the box above is ticked, turn to N. If not, tick it now") uses this.
 */
export interface SectionEnter {
  jump?: { when: Condition; to: string };
  effects?: Effect[];
}

/** A section's exit is choices, a test, a test with choices beside it, or a combat. */
export interface Section {
  id: string;
  title: string;
  body: string[];
  enter?: SectionEnter;
  choices?: Choice[];
  test?: TestDef;
  combat?: CombatDef;
  illustration?: Illustration;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  rights: string;
  system: string;
  start: string;
  sections: Section[];
}

export interface NamedValue {
  id: string;
  label: string;
}

export interface TickMark {
  label: string;
  count: number;
}

export interface RollRecord {
  id: string;
  label: string;
  dice: string;
  faces: number[];
  total: number;
  success: boolean;
}

/** Present only while a multi-step combat is unfinished. */
export interface PendingCombat {
  kind: "combat";
  sectionId: string;
  /** Rounds already resolved. */
  round: number;
}

/** A skill-test roll that has not been taken yet. Fortune rerolls update this roll in place. */
export interface PendingTest {
  kind: "test";
  sectionId: string;
  roll: RollRecord;
  /** Die chosen for the next Fortune spend, or null when none is chosen. */
  selected: number | null;
}

export type PendingAction = PendingCombat | PendingTest;

/** The starting weapon is stored by type only. It has no name or bonus. */
export type WeaponType = "one-handed" | "long" | "two-handed";

/** Everything a new game needs from character creation, before the start section's hook runs. */
export interface Character {
  stats: Record<string, number>;
  /** Current ceilings for stats this character tracks, such as Talent after trades. */
  maxima: Record<string, number>;
  skills: SkillRank[];
  gold: number;
  items: NamedValue[];
  weapon: WeaponType;
  /** Only with a one-handed weapon. */
  shield: boolean;
}

export interface GameState {
  sectionId: string;
  stats: Record<string, number>;
  /** Current ceilings, such as Talent after trades at creation. A stat not listed here uses the system maximum. */
  maxima: Record<string, number>;
  skills: SkillRank[];
  /** Coin pouch. The rules give it no capacity. */
  gold: number;
  items: NamedValue[];
  weapon: WeaponType;
  shield: boolean;
  keywords: NamedValue[];
  ticks: Record<string, TickMark>;
  rolls: RollRecord[];
  pending: PendingAction | null;
}

export interface Session {
  bookId: string;
  state: GameState;
  undo: GameState[];
}
