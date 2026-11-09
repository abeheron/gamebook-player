import { describe, expect, it } from "vitest";
import { demoBook, demoSystem } from "../../src/format/demo";
import type { Rng } from "../../src/engine/dice";
import { canRestore } from "../../src/engine/restore";
import { choose, currentSection, rollCombatRound, rollTest, startSession, undo, visibleChoices } from "../../src/engine/rules";
import { conditionHolds } from "../../src/engine/state";
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

const low = scripted([0.99, 0.99]);
const high = scripted([0, 0]);

describe("sample book rules", () => {
  it("takes the lantern, ticks the landing, and undoes both", () => {
    let session = startSession(demoBook, demoSystem);
    session = choose(session, demoBook, demoSystem, "take-lantern");
    expect(currentSection(demoBook, session).title).toBe("The landing");
    expect(session.state.items.map((item) => item.id)).toEqual(["ration", "lantern"]);
    expect(visibleChoices(currentSection(demoBook, session), session.state).map((choice) => choice.id)).toEqual([
      "tick-and-study",
      "search-crack",
    ]);

    session = choose(session, demoBook, demoSystem, "tick-and-study");
    expect(session.state.ticks["landing-box"]?.count).toBe(1);
    expect(currentSection(demoBook, session).id).toBe("3");

    session = undo(session);
    expect(currentSection(demoBook, session).id).toBe("2");
    expect(session.state.ticks["landing-box"]).toBeUndefined();
    session = undo(session);
    expect(currentSection(demoBook, session).id).toBe("1");
    expect(session.state.items.map((item) => item.id)).toEqual(["ration"]);
    expect(session.state.gold).toBe(10);
    expect(undo(session)).toBe(session);
  });

  it("records a failed roll-under test and can undo it", () => {
    let session = startSession(demoBook, demoSystem);
    session = choose(session, demoBook, demoSystem, "take-lantern");
    session = choose(session, demoBook, demoSystem, "tick-and-study");
    session = rollTest(session, demoBook, demoSystem, scripted([0.99, 0.99]));
    expect(currentSection(demoBook, session).id).toBe("5");
    expect(session.state.stats.vitality).toBe(2);
    expect(session.state.rolls[0]).toMatchObject({ id: "read-mark", total: 12, success: false });
    session = undo(session);
    expect(currentSection(demoBook, session).id).toBe("3");
    expect(session.state.stats.vitality).toBe(3);
    expect(session.state.rolls).toEqual([]);
  });

  it("passes the test on a low roll and gains the keyword", () => {
    let session = startSession(demoBook, demoSystem);
    session = choose(session, demoBook, demoSystem, "take-lantern");
    session = choose(session, demoBook, demoSystem, "tick-and-study");
    session = rollTest(session, demoBook, demoSystem, scripted([0, 0]));
    expect(currentSection(demoBook, session).id).toBe("4");
    expect(session.state.keywords.map((keyword) => keyword.label)).toEqual(["Mark"]);
    expect(session.state.stats.talent).toBe(9);
  });

  it("resolves fixed-round combat, including defeat, and keeps each round undoable", () => {
    let session = startSession(demoBook, demoSystem);
    session = choose(session, demoBook, demoSystem, "climb-dark");
    expect(session.state.stats.vitality).toBe(2);
    session = choose(session, demoBook, demoSystem, "keep-climbing");
    session = rollCombatRound(session, demoBook, demoSystem, low);
    expect(currentSection(demoBook, session).id).toBe("6");
    expect(session.state.pending).toEqual({ kind: "combat", sectionId: "6", round: 1 });
    expect(session.state.stats.vitality).toBe(1);
    expect(visibleChoices(currentSection(demoBook, session), session.state)).toEqual([]);

    session = rollCombatRound(session, demoBook, demoSystem, scripted([0.99, 0.99]));
    expect(currentSection(demoBook, session).id).toBe("8");
    expect(session.state.stats.vitality).toBe(0);
    expect(session.state.pending).toBeNull();

    session = undo(session);
    expect(session.state.pending?.round).toBe(1);
    expect(session.state.stats.vitality).toBe(1);
  });

  it("ends combat on the following section when the rounds are passed", () => {
    let session = startSession(demoBook, demoSystem);
    session = choose(session, demoBook, demoSystem, "climb-dark");
    session = choose(session, demoBook, demoSystem, "keep-climbing");
    session = rollCombatRound(session, demoBook, demoSystem, high);
    session = rollCombatRound(session, demoBook, demoSystem, scripted([0, 0]));
    expect(currentSection(demoBook, session).id).toBe("7");
    expect(session.state.stats.vitality).toBe(2);
    expect(session.state.stats.fortune).toBe(3);
  });

  it("hides a choice until every part of an all-condition holds", () => {
    const book = validateBook(
      {
        id: "tiny-gate",
        title: "Tiny gate",
        author: "Test",
        rights: "Original unit-test book.",
        system: demoSystem.id,
        start: "1",
        sections: [
          {
            id: "1",
            title: "Start",
            body: ["A step used only by the unit test."],
            choices: [
              {
                id: "drop",
                label: "Drop",
                to: "2",
                effects: [{ op: "adjustStat", stat: "vitality", by: -3 }],
              },
            ],
          },
          {
            id: "2",
            title: "Low",
            body: ["Vitality has nowhere lower to go."],
            choices: [
              {
                id: "up",
                label: "Up",
                to: "1",
                when: { op: "statAtLeast", stat: "vitality", value: 1 },
              },
              {
                id: "both",
                label: "Both",
                to: "1",
                when: {
                  op: "all",
                  conditions: [
                    { op: "statAtLeast", stat: "vitality", value: 1 },
                    { op: "hasItem", id: "lantern" },
                  ],
                },
              },
              { id: "stay", label: "Stay", to: "2" },
            ],
          },
        ],
      },
      demoSystem,
    );
    let session = startSession(book, demoSystem);
    session = choose(session, book, demoSystem, "drop");
    expect(session.state.stats.vitality).toBe(0);
    expect(visibleChoices(currentSection(book, session), session.state).map((choice) => choice.id)).toEqual(["stay"]);
    expect(conditionHolds({ op: "statAtLeast", stat: "vitality", value: 1 }, session.state)).toBe(false);
  });

  it("accepts its own session and rejects a different book", () => {
    const session = startSession(demoBook, demoSystem);
    expect(canRestore(session, demoBook, demoSystem)).toBe(true);
    expect(canRestore({ ...session, bookId: "other" }, demoBook, demoSystem)).toBe(false);
    expect(canRestore({ bookId: demoBook.id, state: { sectionId: "missing" }, undo: [] }, demoBook, demoSystem)).toBe(
      false,
    );
  });
});
