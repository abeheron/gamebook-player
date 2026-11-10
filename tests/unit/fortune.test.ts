import { describe, expect, it } from "vitest";
import { acceptTest, choose, holdTestRoll, rerollCombatDie, rerollTestDie, rollCombatRound, selectTestDie, startSession, undo } from "../../src/engine/rules";
import { demoBook, demoSystem } from "../../src/format/demo";

const low = () => 0;

function atMark() {
  let session = startSession(demoBook, demoSystem);
  session = choose(session, demoBook, demoSystem, "take-lantern");
  session = choose(session, demoBook, demoSystem, "tick-and-study");
  return session;
}

describe("Fortune reroll", () => {
  it("holds the roll on the section and spends 1 Fortune on one die", () => {
    let session = holdTestRoll(atMark(), demoBook, demoSystem, low);
    expect(session.state.sectionId).toBe("3");
    expect(session.state.pending).toMatchObject({
      kind: "test",
      selected: null,
      roll: { faces: [1, 1], total: 2, success: true },
    });
    expect(session.state.stats.fortune).toBe(3);
    expect(session.state.rolls).toEqual([]);

    session = selectTestDie(session, 1);
    expect(session.state.pending?.kind === "test" && session.state.pending.selected).toBe(1);
    session = selectTestDie(session, 1);
    expect(session.state.pending?.kind === "test" && session.state.pending.selected).toBeNull();
    session = selectTestDie(session, 0);

    session = rerollTestDie(session, demoBook, demoSystem, 0, low, 6);
    expect(session.state.sectionId).toBe("3");
    expect(session.state.stats.fortune).toBe(2);
    expect(session.state.pending).toMatchObject({
      kind: "test",
      selected: null,
      roll: { faces: [6, 1], total: 7, success: true },
    });

    session = undo(session);
    expect(session.state.stats.fortune).toBe(3);
    expect(session.state.pending).toMatchObject({ roll: { faces: [1, 1], total: 2 } });
  });

  it("stops at the Fortune cap and then takes the settled turn", () => {
    let session = holdTestRoll(atMark(), demoBook, demoSystem, low);
    session = rerollTestDie(session, demoBook, demoSystem, 0, low, 6);
    session = rerollTestDie(session, demoBook, demoSystem, 0, low, 6);
    session = rerollTestDie(session, demoBook, demoSystem, 1, low, 6);
    expect(session.state.stats.fortune).toBe(0);
    expect(demoSystem.stats.find((stat) => stat.id === "fortune")?.max).toBe(3);
    expect(() => rerollTestDie(session, demoBook, demoSystem, 0, low, 1)).toThrow(/Not enough Fortune/);

    session = acceptTest(session, demoBook, demoSystem);
    expect(session.state.sectionId).toBe("5");
    expect(session.state.pending).toBeNull();
    expect(session.state.stats.vitality).toBe(2);
    expect(session.state.rolls.at(-1)?.faces).toEqual([6, 6]);
  });

  it("treats double 1 as a pass and double 6 as a fail, including after a reroll", () => {
    let session = atMark();
    session.state.stats.talent = 1;
    session.state.skills = [];
    session = holdTestRoll(session, demoBook, demoSystem, low, [1, 1]);
    expect(session.state.pending).toMatchObject({ roll: { faces: [1, 1], total: 2, success: true } });

    session = rerollTestDie(session, demoBook, demoSystem, 0, low, 6);
    expect(session.state.pending).toMatchObject({ roll: { faces: [6, 1], total: 7, success: false } });

    session = undo(session);
    session = rerollTestDie(session, demoBook, demoSystem, 0, low, 6);
    session = rerollTestDie(session, demoBook, demoSystem, 1, low, 6);
    expect(session.state.pending).toMatchObject({ roll: { faces: [6, 6], total: 12, success: false } });

    session = atMark();
    session.state.stats.talent = 12;
    session = holdTestRoll(session, demoBook, demoSystem, low, [6, 6]);
    expect(session.state.pending).toMatchObject({ roll: { total: 12, success: false } });
  });

  it("rerolls one die of the current fight round and keeps it on the save", () => {
    let session = startSession(demoBook, demoSystem);
    session = choose(session, demoBook, demoSystem, "face-the-moth");
    session = rollCombatRound(session, demoBook, demoSystem, () => 0.99);
    expect(session.state.sectionId).toBe("10");
    expect(session.state.stats.vitality).toBe(2);
    expect(session.state.stats.fortune).toBe(3);
    const pending = session.state.pending;
    expect(pending?.kind).toBe("combat");

    session = rerollCombatDie(session, demoBook, demoSystem, 0, low, 1);
    expect(session.state.sectionId).toBe("10");
    expect(session.state.stats.fortune).toBe(2);
    expect(session.state.stats.vitality).toBe(3);
    expect(session.state.rolls.at(-1)).toMatchObject({ faces: [1, 6], success: true });
    expect(session.state.pending).toEqual(pending);

    session = rerollCombatDie(session, demoBook, demoSystem, 0, low, 6);
    expect(session.state.stats.fortune).toBe(1);
    expect(session.state.stats.vitality).toBe(2);
    expect(session.state.rolls.at(-1)).toMatchObject({ faces: [6, 6], success: false });
    const broke = structuredClone(session);
    broke.state.stats.fortune = 0;
    expect(() => rerollCombatDie(broke, demoBook, demoSystem, 0, low, 1)).toThrow(/Not enough Fortune/);
  });
});
