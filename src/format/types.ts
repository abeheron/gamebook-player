/** Plain data for a book. Imported books are untrusted and must pass validation. */

export interface StatDef {
  id: string;
  label: string;
  initial: number;
  min: number;
  max: number;
}

/** Incomplete GNAT-shaped configuration. Not the full GNAT rules. */
export interface SystemDef {
  id: string;
  name: string;
  attribution: string;
  stats: StatDef[];
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
  | { op: "all"; conditions: Condition[] };

export interface Choice {
  id: string;
  label: string;
  to: string;
  when?: Condition;
  effects?: Effect[];
}

export interface TestBranch {
  to: string;
  effects?: Effect[];
}

/** One roll-under check. Crits, fumbles, and re-rolls are not part of this step. */
export interface TestDef {
  id: string;
  label: string;
  dice: string;
  stat: string;
  modifier?: number;
  success: TestBranch;
  failure: TestBranch;
}

export interface CombatDef {
  id: string;
  label: string;
  rounds: number;
  dice: string;
  stat: string;
  modifier?: number;
  wound: { stat: string; amount: number; defeatAtOrBelow: number };
  defeatSection: string;
  then: string;
}

export interface Section {
  id: string;
  title: string;
  body: string[];
  choices?: Choice[];
  test?: TestDef;
  combat?: CombatDef;
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

export interface GameState {
  sectionId: string;
  stats: Record<string, number>;
  items: NamedValue[];
  keywords: NamedValue[];
  ticks: Record<string, TickMark>;
  rolls: RollRecord[];
  pending: PendingCombat | null;
}

export interface Session {
  bookId: string;
  state: GameState;
  undo: GameState[];
}
