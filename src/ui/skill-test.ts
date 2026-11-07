import type { RollRecord, TestDef } from "../format/types";

/** The one destination a settled roll may offer. No second branch is shown. */
export function settledDestination(test: TestDef, roll: RollRecord): { heading: "Pass" | "Fail"; to: string } {
  if (roll.success) return { heading: "Pass", to: test.success.to };
  return { heading: "Fail", to: test.failure.to };
}

/** A settled roll cannot be rolled again. */
export function canStartRoll(settled: boolean, busy: boolean): boolean {
  return !settled && !busy;
}
