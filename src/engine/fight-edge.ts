import type { FightState, FightTestResult, GameState, RollRecord, Section, TestBranch } from "../format/types";

/**
 * P35: how the fight on a section is fought right now. "cancel" means both Advantage and
 * Disadvantage apply, so neither does (pp.10–11).
 */
export type EdgeNow = "advantage" | "disadvantage" | "cancel" | "none";

/** The fight set-up for this section, or null. A set-up left from another section never counts. */
export function fightFor(state: GameState, sectionId: string): FightState | null {
  const fight = state.fight;
  return fight && fight.sectionId === sectionId ? fight : null;
}

/** How the section's test before the fight was settled, or null while it is not. */
export function fightTestResult(section: Section, state: GameState): FightTestResult | null {
  if (!section.combat?.afterTest || !section.test) return null;
  return fightFor(state, section.id)?.test ?? null;
}

/** The fight is visible but waits: its section's test is not settled yet. */
export function fightLocked(section: Section, state: GameState): boolean {
  return Boolean(section.combat?.afterTest && section.test) && fightTestResult(section, state) === null;
}

/** The test result the fight follows. A skip takes the fail result. */
export function settledBranch(section: Section, result: FightTestResult | null): TestBranch | undefined {
  if (!result || !section.test) return undefined;
  return result === "pass" ? section.test.success : section.test.failure;
}

/** True when one of the fight's own boxes is ticked, which removes its direct Advantage or Disadvantage. */
export function edgeRemoved(section: Section, state: GameState): boolean {
  const boxes = section.combat?.unless ?? [];
  const ticked = fightFor(state, section.id)?.ticked ?? [];
  return boxes.some((box) => ticked.includes(box.id));
}

/**
 * Advantage and Disadvantage on this fight now: the fight's own edge unless a box removes it, plus
 * the settled test result's edge. Both together cancel at resolution time; the data never pre-cancels.
 */
export function edgeNow(section: Section, state: GameState): EdgeNow {
  const combat = section.combat;
  if (!combat) return "none";
  let advantage = false;
  let disadvantage = false;
  if (combat.edge && !edgeRemoved(section, state)) {
    if (combat.edge === "advantage") advantage = true;
    else disadvantage = true;
  }
  const branch = settledBranch(section, fightTestResult(section, state));
  if (branch?.edge === "advantage") advantage = true;
  if (branch?.edge === "disadvantage") disadvantage = true;
  if (advantage && disadvantage) return "cancel";
  if (advantage) return "advantage";
  if (disadvantage) return "disadvantage";
  return "none";
}

/** Advantage's one re-roll this round is spent. */
export function advantageUsed(roll: RollRecord | undefined): boolean {
  return Boolean(roll?.rerolls?.some((entry) => entry.by === "advantage"));
}

/**
 * The faces before each automatic re-roll this round, by die. Only dice that Disadvantage or a
 * two-handed weapon replaced are listed: the first face that die showed.
 */
export function replacedFaces(roll: RollRecord | undefined): Map<number, number> {
  const old = new Map<number, number>();
  for (const entry of roll?.rerolls ?? []) {
    if (entry.by !== "disadvantage" && entry.by !== "two-handed") continue;
    if (!old.has(entry.index)) old.set(entry.index, entry.from);
  }
  return old;
}

/** The die the last automatic re-roll this round replaced (Disadvantage or two-handed), or null. */
export function autoRerolledDie(roll: RollRecord | undefined): number | null {
  const automatic = (roll?.rerolls ?? []).filter((entry) => entry.by === "disadvantage" || entry.by === "two-handed");
  return automatic[automatic.length - 1]?.index ?? null;
}
