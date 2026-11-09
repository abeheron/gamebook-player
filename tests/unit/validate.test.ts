import { describe, expect, it } from "vitest";
import rawBook from "../fixtures/lantern-stair.json";
import { BookValidationError, validateBook, validateSystem } from "../../src/format/validate";
import { demoBook, demoSystem } from "../../src/format/demo";

function editableBook(): Record<string, unknown> {
  return structuredClone(rawBook) as unknown as Record<string, unknown>;
}

describe("book validation", () => {
  it("accepts the original sample and the demo system", () => {
    expect(demoBook.id).toBe("lantern-stair");
    expect(demoBook.sections).toHaveLength(9);
    expect(demoSystem.stats.map((stat) => stat.id)).toEqual(["talent", "vitality", "fortune"]);
    expect(demoSystem.skills.map((skill) => skill.label)).toEqual([
      "Climbing",
      "Diplomacy",
      "Larceny",
      "Linguistics",
      "Naturalist",
      "Occult",
      "Search",
      "Stealth",
      "Swimming",
      "Tracking",
    ]);
    expect(demoSystem.basicSkillBonus).toBe(2);
    expect(demoSystem.absentSkillPenalty).toBe(-2);
  });

  it("rejects unknown fields instead of evaluating them", () => {
    const book = editableBook();
    book.eval = "process.exit(1)";
    expect(() => validateBook(book, demoSystem)).toThrow(BookValidationError);
    expect(() => validateBook(book, demoSystem)).toThrow(/unknown field eval/);
  });

  it("rejects an effect that is not on the allowlist", () => {
    const book = editableBook();
    const sections = book.sections as Record<string, unknown>[];
    const first = sections[0] as { choices: Record<string, unknown>[] };
    const choice = first.choices[0];
    if (!choice) throw new Error("missing choice");
    choice.effects = [{ op: "eval", code: "alert(1)" }];
    expect(() => validateBook(book, demoSystem)).toThrow(/effect is not allowed/);
  });

  it("rejects links that leave the book and dice that is not dice", () => {
    const book = editableBook();
    const sections = book.sections as { choices?: { to: string }[]; test?: { dice: string } }[];
    const first = sections[0];
    if (!first?.choices?.[0]) throw new Error("missing choice");
    first.choices[0].to = "99";
    expect(() => validateBook(book, demoSystem)).toThrow(/leaves the book/);

    const again = editableBook();
    const testSection = (again.sections as { test?: { dice: string } }[])[2];
    if (!testSection?.test) throw new Error("missing test");
    testSection.test.dice = "2d6;alert(1)";
    expect(() => validateBook(again, demoSystem)).toThrow(/dice expression/);
  });

  it("rejects a system that is not the declared one", () => {
    const book = editableBook();
    book.system = "fighting-fantasy";
    expect(() => validateBook(book, demoSystem)).toThrow(/expected gnat-demo/);
  });

  it("rejects forbidden keys on a system file", () => {
    const system = JSON.parse(
      '{"id":"gnat-demo","name":"GNAT demo","attribution":"Test attribution that is long enough.","stats":[{"id":"talent","label":"Talent","initial":9,"min":1,"max":12}],"__proto__":{"polluted":true}}',
    ) as unknown;
    expect(() => validateSystem(system)).toThrow(/forbidden key/);
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });
});
