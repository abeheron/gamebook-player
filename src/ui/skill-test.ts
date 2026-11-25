import type { RollRecord, TestDef } from "../format/types";

/** The one destination a settled roll may offer, or null when that result stays on the section. */
export function settledDestination(test: TestDef, roll: RollRecord): { heading: "Pass" | "Fail"; to: string } | null {
  const to = roll.success ? test.success?.to : test.failure?.to;
  if (to === undefined) return null;
  return { heading: roll.success ? "Pass" : "Fail", to };
}

/** A settled roll cannot be rolled again. */
export function canStartRoll(settled: boolean, busy: boolean): boolean {
  return !settled && !busy;
}

/**
 * The muted line under the destinations when a result stays on the section and the player
 * chooses below (P32). Empty when both results turn to a section.
 */
export function stayHint(test: TestDef, roll: RollRecord | null): string {
  const passes = test.success?.to !== undefined;
  const fails = test.failure?.to !== undefined;
  if (passes && fails) return "";
  if (passes) return roll && !roll.success ? "The test failed. Choose below." : "If you fail, choose from the options below.";
  if (fails) return roll?.success ? "The test passed. Choose below." : "If you pass, choose from the options below.";
  if (!roll) return "After the test, choose from the options below.";
  return roll.success ? "The test passed. Choose below." : "The test failed. Choose below.";
}
