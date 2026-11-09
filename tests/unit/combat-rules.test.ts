import { describe, expect, it } from "vitest";
import type { Rng } from "../../src/engine/dice";
import { choose, currentSection, rollCombatRound, rollTest, startSession } from "../../src/engine/rules";
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

const miss = () => scripted([0.99, 0.99]);

describe("minimum fight rules", () => {
  it("applies the passage penalty and still finishes after a miss", () => {
    let session = startSession(demoBook, demoSystem);
    session = choose(session, demoBook, demoSystem, "face-the-moth");
    session = rollCombatRound(session, demoBook, demoSystem, scripted([0.5, 0.7]));
    expect(session.state.rolls[0]).toMatchObject({ id: "pale-moth", faces: [4, 5], total: 9, success: false });
    expect(session.state.stats.vitality).toBe(2);
    expect(session.state.pending).toEqual({ kind: "combat", sectionId: "10", round: 1 });
    expect(currentSection(demoBook, session).id).toBe("10");

    session = rollCombatRound(session, demoBook, demoSystem, scripted([0.4, 0.7]));
    expect(session.state.rolls[1]).toMatchObject({ total: 8, success: true });
    expect(currentSection(demoBook, session).id).toBe("7");
    expect(session.state.stats.vitality).toBe(2);
    expect(session.state.pending).toBeNull();
  });

  it("stops the remaining rounds when Vitality reaches 0", () => {
    const book = validateBook(
      {
        id: "long-fight",
        title: "Long fight",
        author: "Test",
        rights: "Original unit-test book.",
        system: demoSystem.id,
        start: "1",
        sections: [
          {
            id: "1",
            title: "Fight",
            body: ["Four rounds, used only by the unit test."],
            combat: {
              id: "long",
              label: "Long",
              rounds: 4,
              dice: "2d6",
              stat: "talent",
              modifier: -1,
              wound: { stat: "vitality", amount: 1, defeatAtOrBelow: 0 },
              defeatSection: "2",
              then: "3",
            },
          },
          { id: "2", title: "Down", body: ["Vitality is gone."], choices: [{ id: "back", label: "Back", to: "1" }] },
          { id: "3", title: "Through", body: ["The rounds are over."], choices: [{ id: "back", label: "Back", to: "1" }] },
        ],
      },
      demoSystem,
    );
    let session = startSession(book, demoSystem);
    session = rollCombatRound(session, book, demoSystem, miss());
    session = rollCombatRound(session, book, demoSystem, miss());
    expect(currentSection(book, session).id).toBe("1");
    expect(session.state.stats.vitality).toBe(1);
    session = rollCombatRound(session, book, demoSystem, miss());
    expect(currentSection(book, session).id).toBe("2");
    expect(session.state.stats.vitality).toBe(0);
    expect(session.state.rolls).toHaveLength(3);
    expect(session.state.pending).toBeNull();
  });
});

describe("typed dice", () => {
  it("resolves entered faces with the same target and does not roll", () => {
    let session = startSession(demoBook, demoSystem);
    session = choose(session, demoBook, demoSystem, "take-lantern");
    session = choose(session, demoBook, demoSystem, "tick-and-study");
    const rng: Rng = () => {
      throw new Error("rng should not run");
    };
    session = rollTest(session, demoBook, demoSystem, rng, [1, 1]);
    expect(session.state.rolls[0]).toMatchObject({ faces: [1, 1], total: 2, success: true });
    expect(currentSection(demoBook, session).id).toBe("4");
  });

  it("rejects a face the die cannot show", () => {
    let session = startSession(demoBook, demoSystem);
    session = choose(session, demoBook, demoSystem, "take-lantern");
    session = choose(session, demoBook, demoSystem, "tick-and-study");
    expect(() => rollTest(session, demoBook, demoSystem, scripted([0]), [7, 1])).toThrow(/whole number/);
    expect(() => rollTest(session, demoBook, demoSystem, scripted([0]), [1])).toThrow(/one number/);
    expect(session.state.rolls).toEqual([]);
    expect(currentSection(demoBook, session).id).toBe("3");
  });
});
