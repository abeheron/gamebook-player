import { describe, expect, it } from "vitest";
import { blockedBecause, rollFormula } from "../../src/ui/wording";

describe("sample wording", () => {
  it("prints the sample roll without inventing a modifier", () => {
    expect(rollFormula("2d6", "Talent", 9)).toBe("2d6 ≤ Talent 9");
    expect(rollFormula("2d6", "Talent", 9, -2)).toBe("2d6 ≤ Talent 9 − 2 = 7");
  });

  it("names a skill bonus or penalty beside the target", () => {
    expect(rollFormula("2d6", "Talent", 9, 0, { label: "Linguistics", bonus: 2 })).toBe(
      "2d6 ≤ Talent 9 + 2 Linguistics = 11",
    );
    expect(rollFormula("2d6", "Talent", 9, 0, { label: "Search", bonus: -2 })).toBe(
      "2d6 ≤ Talent 9 − 2 Search = 7",
    );
    expect(rollFormula("2d6", "Talent", 9, -1, { label: "Linguistics", bonus: 2 })).toBe(
      "2d6 ≤ Talent 9 − 1 + 2 Linguistics = 10",
    );
  });

  it("describes a ticked-box block as the sample's own gate", () => {
    expect(blockedBecause({ op: "not", condition: { op: "ticked", id: "landing-box" } })).toBe(
      "That box is already ticked.",
    );
  });
});
