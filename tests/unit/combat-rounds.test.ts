import { describe, expect, it } from "vitest";
import { roundCaption, roundLabel, roundMarks } from "../../src/ui/combat-rounds";

describe("fight round markers", () => {
  it("names the round about to be rolled", () => {
    expect(roundCaption(0, 2, false)).toBe("Round 1 of 2");
    expect(roundCaption(1, 2, false)).toBe("Round 2 of 2");
    expect(roundMarks([], 2, false)).toEqual(["current", "upcoming"]);
    expect(roundMarks([true], 2, false)).toEqual(["held", "current"]);
    expect(roundMarks([false], 2, false)).toEqual(["wound", "current"]);
  });

  it("stops calling a round current once the fight has settled", () => {
    expect(roundCaption(2, 2, true)).toBe("Round 2 of 2");
    expect(roundCaption(1, 2, true)).toBe("Round 1 of 2");
    expect(roundMarks([true, false], 2, true)).toEqual(["held", "wound"]);
    expect(roundMarks([false], 2, true)).toEqual(["wound", "upcoming"]);
    expect(roundLabel(1, "wound")).toBe("Round 1: wound");
    expect(roundLabel(2, "current")).toBe("Round 2: current");
  });
});
