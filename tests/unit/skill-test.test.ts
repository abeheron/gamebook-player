import { describe, expect, it } from "vitest";
import type { TestDef } from "../../src/format/types";
import { canStartRoll, settledDestination } from "../../src/ui/skill-test";

const test: TestDef = {
  id: "read-mark",
  label: "Study the mark",
  dice: "2d6",
  stat: "talent",
  success: { to: "4" },
  failure: { to: "5" },
};

describe("compact skill test", () => {
  it("offers only the destination that matches the settled roll", () => {
    expect(settledDestination(test, roll(true)).to).toBe("4");
    expect(settledDestination(test, roll(false)).to).toBe("5");
  });

  it("refuses a second roll once a result exists or a roll is in progress", () => {
    expect(canStartRoll(false, false)).toBe(true);
    expect(canStartRoll(true, false)).toBe(false);
    expect(canStartRoll(false, true)).toBe(false);
  });
});

function roll(success: boolean) {
  return {
    id: "read-mark",
    label: "Study the mark",
    dice: "2d6",
    faces: success ? [1, 2] : [6, 6],
    total: success ? 3 : 12,
    success,
  };
}
