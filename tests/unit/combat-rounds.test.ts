import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { roundMarks, roundName, roundSummary } from "../../src/ui/combat-rounds";

describe("fight round tracker", () => {
  it("labels the round about to be rolled and counts wounds", () => {
    expect(roundMarks([], 2, false)).toEqual(["now", "later"]);
    expect(roundMarks([false], 2, false)).toEqual(["wound", "now"]);
    expect(roundMarks([true], 2, false)).toEqual(["held", "now"]);
    expect(roundSummary(0, 2, 0, false, 3)).toBe("Round 1 of 2 · 0 wounds taken");
    expect(roundSummary(1, 2, 1, false, 2)).toBe("Round 2 of 2 · 1 wound taken");
    expect(roundName(1, "wound")).toBe("Round 1: wound");
    expect(roundName(2, "now")).toBe("Round 2: now");
  });

  it("states a finished fight and a defeat at Vitality 0", () => {
    expect(roundMarks([true, false], 2, true)).toEqual(["held", "wound"]);
    expect(roundMarks([false], 2, true)).toEqual(["wound", "later"]);
    expect(roundSummary(2, 2, 1, true, 2)).toBe("2 of 2 rounds finished · 1 wound");
    expect(roundSummary(3, 4, 3, true, 0)).toBe("Vitality 0 · fight ends");
  });

  it("turns the rolling pulse off when motion is reduced", () => {
    const css = readFileSync("src/ui/app.css", "utf8");
    expect(css).toMatch(/\.r\.cur\.rolling \.n \{[\s\S]*animation: round-pulse/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.r\.cur\.rolling \.n \{[\s\S]*animation: none/);
  });
});
