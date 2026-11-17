import { describe, expect, it } from "vitest";
import { blockedBecause, rollFormula, sectionDestination, sectionHeading } from "../../src/ui/wording";

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

  it("puts the section number before a destination title", () => {
    expect(sectionDestination("Pass", "4", "The reading")).toEqual({
      prefix: "Pass → §4 · ",
      title: "The reading",
      name: "Pass, section 4, The reading",
    });
    expect(sectionDestination("Fight over", "7", "Above").prefix).toBe("Fight over → §7 · ");
    expect(sectionDestination("Pass", "326", "")).toEqual({
      prefix: "Pass → §326",
      title: "",
      name: "Pass, section 326",
    });
    expect(sectionDestination("Pass", "326", "   ").title).toBe("");
    expect(sectionHeading("326", "")).toBe("§326");
    expect(sectionHeading("1", "The stair")).toBe("The stair");
  });

  it("describes a ticked-box block as the sample's own gate", () => {
    expect(blockedBecause({ op: "not", condition: { op: "ticked", id: "landing-box" } })).toBe(
      "That box is already ticked.",
    );
  });
});
