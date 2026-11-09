import { describe, expect, it } from "vitest";
import type { Rng } from "../../src/engine/dice";
import { choose, currentSection, rollTest, startSession } from "../../src/engine/rules";
import { skillAdjustment } from "../../src/engine/skills";
import { demoBook, demoSystem } from "../../src/format/demo";
import { validateBook } from "../../src/format/validate";

function scripted(samples: number[]): Rng {
  let index = 0;
  return () => {
    const sample = samples[index];
    index += 1;
    if (sample === undefined) throw new Error("rng exhausted");
    return sample;
  };
}

describe("skill bonus and penalty", () => {
  it("uses the stored bonus, and -2 only when the named skill is absent", () => {
    expect(skillAdjustment(demoSystem, demoSystem.startingSkills, undefined)).toBe(0);
    expect(skillAdjustment(demoSystem, demoSystem.startingSkills, "linguistics")).toBe(2);
    expect(skillAdjustment(demoSystem, demoSystem.startingSkills, "search")).toBe(-2);
    expect(skillAdjustment(demoSystem, [{ id: "linguistics", bonus: 4 }], "linguistics")).toBe(4);
  });

  it("passes an 11 on Linguistics +2 and would have failed on Talent 9 alone", () => {
    let session = startSession(demoBook, demoSystem);
    session = choose(session, demoBook, demoSystem, "take-lantern");
    session = choose(session, demoBook, demoSystem, "tick-and-study");
    session = rollTest(session, demoBook, demoSystem, scripted([0.7, 0.84]));
    expect(session.state.rolls[0]).toMatchObject({ id: "read-mark", faces: [5, 6], total: 11, success: true });
    expect(currentSection(demoBook, session).id).toBe("4");
  });

  it("fails an 8 on Search, which is inside unmodified Talent", () => {
    let session = startSession(demoBook, demoSystem);
    session = choose(session, demoBook, demoSystem, "take-lantern");
    session = choose(session, demoBook, demoSystem, "search-crack");
    session = rollTest(session, demoBook, demoSystem, scripted([0.2, 0.84]));
    expect(session.state.rolls[0]).toMatchObject({ id: "search-crack", faces: [2, 6], total: 8, success: false });
    expect(currentSection(demoBook, session).id).toBe("5");
    expect(session.state.stats.vitality).toBe(2);
  });

  it("leaves a test with no skill on the plain Talent target", () => {
    const book = validateBook(
      {
        id: "plain-test",
        title: "Plain test",
        author: "Test",
        rights: "Original unit-test book.",
        system: demoSystem.id,
        start: "1",
        sections: [
          {
            id: "1",
            title: "Roll",
            body: ["A test that names no skill."],
            test: {
              id: "plain",
              label: "Plain",
              dice: "2d6",
              stat: "talent",
              success: { to: "2" },
              failure: { to: "3" },
            },
          },
          { id: "2", title: "Pass", body: ["Through."], choices: [{ id: "back", label: "Back", to: "1" }] },
          { id: "3", title: "Fail", body: ["Back."], choices: [{ id: "back", label: "Back", to: "1" }] },
        ],
      },
      demoSystem,
    );
    let passed = startSession(book, demoSystem);
    passed = rollTest(passed, book, demoSystem, scripted([0.5, 0.7]));
    expect(passed.state.rolls[0]).toMatchObject({ total: 9, success: true });
    expect(currentSection(book, passed).id).toBe("2");

    let failed = startSession(book, demoSystem);
    failed = rollTest(failed, book, demoSystem, scripted([0.5, 0.84]));
    expect(failed.state.rolls[0]).toMatchObject({ total: 10, success: false });
    expect(currentSection(book, failed).id).toBe("3");
  });

  it("adds a section modifier and a stored advanced bonus before the dice are judged", () => {
    const book = validateBook(
      {
        id: "stacked",
        title: "Stacked",
        author: "Test",
        rights: "Original unit-test book.",
        system: demoSystem.id,
        start: "1",
        sections: [
          {
            id: "1",
            title: "Roll",
            body: ["Modifier and skill together."],
            test: {
              id: "stacked",
              label: "Stacked",
              dice: "2d6",
              stat: "talent",
              modifier: -1,
              skill: "linguistics",
              success: { to: "2" },
              failure: { to: "3" },
            },
          },
          { id: "2", title: "Pass", body: ["Through."], choices: [{ id: "back", label: "Back", to: "1" }] },
          { id: "3", title: "Fail", body: ["Back."], choices: [{ id: "back", label: "Back", to: "1" }] },
        ],
      },
      demoSystem,
    );
    const system = {
      ...demoSystem,
      startingSkills: [{ id: "linguistics", bonus: 4 }],
    };
    let session = startSession(book, system);
    session = rollTest(session, book, system, scripted([0.99, 0.99]));
    expect(session.state.rolls[0]).toMatchObject({ total: 12, success: true });
    expect(currentSection(book, session).id).toBe("2");
  });
});
