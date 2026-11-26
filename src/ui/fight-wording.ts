import type { DieReroll, Effect, FightTestResult, GameState, Section, SystemDef } from "../format/types";
import { edgeNow, fightFor, type EdgeNow } from "../engine/fight-edge";
import { statLabel } from "./wording";

/** P35 copy for the fight panel, approved with the sketch. */

export const EDGE_BADGE: Record<Exclude<EdgeNow, "none">, string> = {
  advantage: "Advantage",
  disadvantage: "Disadvantage",
  cancel: "Advantage and Disadvantage cancel",
};

/** The one-line rule under the badge. */
export const EDGE_RULE: Record<Exclude<EdgeNow, "none">, string> = {
  advantage: "You may re-roll any one die, after other re-rolls, and must take the second result. Once per round.",
  disadvantage: "You must re-roll the first 1 or 2 you roll each round, and take the second result.",
  cancel: "This fight has both Advantage and Disadvantage, so they cancel and neither applies.",
};

/**
 * The line that keeps the re-roll order explicit: automatic re-rolls first, then Fortune, then
 * Advantage. Empty for a plain fight with no automatic re-roll.
 */
export function rerollOrder(edge: EdgeNow, twoHanded: boolean): string {
  const twoHandedNote = "Your two-handed weapon re-rolls the first 6 automatically, before Fortune.";
  if (edge === "disadvantage") {
    const automatic = twoHanded
      ? "Re-rolls: Disadvantage is automatic, then your two-handed weapon's first 6, before Fortune."
      : "Re-rolls: Disadvantage is automatic, before Fortune.";
    return `${automatic} Then Fortune, then Advantage. Advantage does not apply in this fight.`;
  }
  if (edge === "advantage") {
    const lead = twoHanded ? `${twoHandedNote} ` : "";
    return `${lead}Re-rolls: Fortune first, then Advantage. The Advantage button is offered once this round, after Fortune.`;
  }
  if (edge === "cancel") {
    const lead = "No Advantage button, and no automatic re-roll of a 1 or 2. Fortune still works as usual.";
    return twoHanded ? `${lead} ${twoHandedNote}` : lead;
  }
  return twoHanded ? `Re-rolls: ${twoHandedNote.charAt(0).toLowerCase()}${twoHandedNote.slice(1)} Then Fortune.` : "";
}

const CAUSE: Record<DieReroll["by"], string> = {
  disadvantage: "Disadvantage",
  "two-handed": "Two-handed weapon",
  fortune: "Fortune",
  advantage: "Advantage",
};

/** "Disadvantage re-rolled a 2 to a 5." */
export function rerollLine(entry: DieReroll): string {
  return `${CAUSE[entry.by]} re-rolled ${article(entry.from)} to ${article(entry.to)}.`;
}

function article(face: number): string {
  return face === 8 || face === 11 || face === 18 ? `an ${face}` : `a ${face}`;
}

/** What a test result does to the fight, in the player's words, lower case: "fight with Disadvantage". */
export function stake(section: Section, state: GameState, system: SystemDef, result: FightTestResult): string {
  const test = section.test;
  const combat = section.combat;
  if (!test || !combat) return "";
  const branch = result === "pass" ? test.success : test.failure;
  if (branch?.to !== undefined) return `turn to §${branch.to}`;
  const ticked = fightFor(state, section.id)?.ticked ?? [];
  const edge = edgeNow(section, { ...state, fight: { sectionId: section.id, test: result, ticked } });
  const other = result === "pass" ? test.failure : test.success;
  // When the other result skips the fight, name the fight this result starts.
  const fight = other?.to !== undefined ? `fight the ${combat.label}, ${roundsText(combat.rounds, combat.modifier)}` : "fight";
  const steps = (branch?.effects ?? []).map((effect) => effectWords(effect, system, combat.wound.stat)).filter(Boolean);
  let how: string;
  if (edge === "advantage") how = `${fight} with Advantage`;
  else if (edge === "disadvantage") how = `${fight} with Disadvantage`;
  else if (edge === "cancel") how = `${fight}; Advantage and Disadvantage cancel`;
  else how = steps.length > 0 || fight !== "fight" ? fight : "fight as normal";
  return steps.length > 0 ? `${steps.join(", ")}, then ${how}` : how;
}

/** "Waiting for the Swimming test. Pass: fight as normal. Fail: fight with Disadvantage." */
export function waitingLine(testName: string, pass: string, fail: string): string {
  return `Waiting for the ${testName} test. Pass: ${pass}. Fail: ${fail}.`;
}

/** "Pass · Fight as normal". */
export function outcomeLabel(heading: "Pass" | "Fail", words: string): string {
  return `${heading} · ${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

/** The muted line under a settled test before a fight, in the P32 hint style. */
export function settledHint(result: FightTestResult | null): string {
  if (result === "pass") return "The test passed. Fight below.";
  if (result === "fail") return "The test failed. Fight below.";
  if (result === "skipped") return "You skipped the test. Fight below.";
  return "";
}

function roundsText(rounds: number, modifier = 0): string {
  const count = rounds === 1 ? "1 round" : `${rounds} rounds`;
  if (modifier === 0) return count;
  return `${count} at ${modifier > 0 ? `+${modifier}` : `−${Math.abs(modifier)}`}`;
}

function effectWords(effect: Effect, system: SystemDef, woundStat: string): string {
  switch (effect.op) {
    case "adjustStat": {
      const amount = Math.abs(effect.by);
      if (effect.stat === woundStat && effect.by < 0) return amount === 1 ? "take a Wound" : `take ${amount} Wounds`;
      return `${effect.by < 0 ? "lose" : "gain"} ${amount} ${statLabel(system, effect.stat)}`;
    }
    case "adjustGold":
      return `${effect.by < 0 ? "pay" : "gain"} ${Math.abs(effect.by)} gold`;
    case "addItem":
      return `gain the ${effect.label}`;
    case "removeItem":
      return "lose an item";
    case "gainKeyword":
      return `gain the keyword ${effect.label}`;
    case "tick":
      return `tick ${effect.label}`;
    default: {
      const unreachable: never = effect;
      return String(unreachable);
    }
  }
}
