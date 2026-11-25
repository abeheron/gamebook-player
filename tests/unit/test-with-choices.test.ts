import { describe, expect, it } from "vitest";
import rawGlade from "../fixtures/p32-glade.json";
import {
  acceptTest,
  choicesOpen,
  choose,
  holdTestRoll,
  rerollTestDie,
  rollTest,
  startSession,
  undo,
  visibleChoices,
} from "../../src/engine/rules";
import { conditionHolds } from "../../src/engine/state";
import { fixtureCharacter, gladeCharacter } from "../../src/engine/creation";
import { demoSystem, gladeBook } from "../../src/format/demo";
import { BookValidationError, validateBook } from "../../src/format/validate";
import type { Book, Session } from "../../src/format/types";
import { stayHint } from "../../src/ui/skill-test";
import { blockedBecause, testName } from "../../src/ui/wording";

const never = () => 0.5;

function glade(): Session {
  return startSession(gladeBook, demoSystem, gladeCharacter(demoSystem));
}

function rawCopy(): Record<string, unknown> & { sections: Record<string, unknown>[] } {
  return structuredClone(rawGlade) as unknown as Record<string, unknown> & { sections: Record<string, unknown>[] };
}

/** Original sample: a test whose fail costs a Wound and stays, with two choices beside it. */
function woundBook(): Book {
  const raw = rawCopy();
  const first = raw.sections[0] as Record<string, unknown>;
  first.test = {
    id: "jump-ditch",
    label: "Test your Talent",
    dice: "2d6",
    stat: "talent",
    failure: { effects: [{ op: "adjustStat", stat: "vitality", by: -1 }] },
  };
  first.choices = [
    { id: "follow-stream", label: "Follow the stream north", to: "8" },
    { id: "leave-glade", label: "Leave the glade", to: "40" },
  ];
  return validateBook(raw, demoSystem);
}

describe("validation of a test with choices beside it", () => {
  it("accepts the original P32 fixture: a pass link, no fail link, and a fail-only choice", () => {
    const first = gladeBook.sections[0];
    expect(first?.test?.success).toEqual({ to: "14" });
    expect(first?.test?.failure).toBeUndefined();
    expect(first?.choices?.[0]?.when).toEqual({ op: "testFailed" });
  });

  it("still keeps a combat on its own", () => {
    const raw = rawCopy();
    (raw.sections[0] as Record<string, unknown>).combat = {
      id: "toad",
      label: "Toad",
      rounds: 1,
      dice: "2d6",
      stat: "talent",
      wound: { stat: "vitality", amount: 1, defeatAtOrBelow: 0 },
      then: "8",
    };
    expect(() => validateBook(raw, demoSystem)).toThrow(/combat cannot share/);
  });

  it("needs choices when a result stays on the section", () => {
    const raw = rawCopy();
    delete (raw.sections[0] as Record<string, unknown>).choices;
    expect(() => validateBook(raw, demoSystem)).toThrow(/a fail that stays here needs choices/);
  });

  it("needs a choice open after a pass when the pass stays", () => {
    const raw = rawCopy();
    const first = raw.sections[0] as Record<string, unknown>;
    first.test = { ...(first.test as object), success: undefined };
    delete (first.test as Record<string, unknown>).success;
    first.choices = [{ id: "eat-anyway", label: "Eat a blue mushroom anyway", to: "23", when: { op: "testFailed" } }];
    expect(() => validateBook(raw, demoSystem)).toThrow(/open after a pass/);
  });

  it("rejects a fail-only choice on a section without a test, and an empty result", () => {
    const raw = rawCopy();
    (raw.sections[1] as Record<string, unknown>).choices = [
      { id: "back-to-glade", label: "Go back", to: "1", when: { op: "testFailed" } },
    ];
    expect(() => validateBook(raw, demoSystem)).toThrow(BookValidationError);
    const empty = rawCopy();
    ((empty.sections[0] as Record<string, unknown>).test as Record<string, unknown>).failure = {};
    expect(() => validateBook(empty, demoSystem)).toThrow(/expected a destination or effects/);
  });

  it("still accepts a test with both links and no choices", () => {
    const raw = rawCopy();
    const first = raw.sections[0] as Record<string, unknown>;
    first.test = { ...(first.test as object), failure: { to: "23" } };
    delete first.choices;
    expect(validateBook(raw, demoSystem).sections[0]?.test?.failure).toEqual({ to: "23" });
  });
});

describe("playing a test with choices beside it", () => {
  it("lets the player skip the test, but keeps the fail-only choice locked", () => {
    const session = glade();
    const first = gladeBook.sections[0]!;
    expect(choicesOpen(first, session.state)).toBe(true);
    expect(visibleChoices(first, session.state).map((choice) => choice.id)).toEqual(["follow-stream", "climb-oak", "leave-glade"]);
    expect(() => choose(session, gladeBook, demoSystem, "eat-anyway")).toThrow("That choice is not available.");
    const left = choose(session, gladeBook, demoSystem, "climb-oak");
    expect(left.state.sectionId).toBe("31");
    expect(left.state.rolls).toEqual([]);
  });

  it("opens the fail-only choice after a fail, and records the roll as the player leaves", () => {
    let session = holdTestRoll(glade(), gladeBook, demoSystem, never, [6, 6]);
    const first = gladeBook.sections[0]!;
    expect(session.state.pending).toMatchObject({ kind: "test", roll: { success: false } });
    expect(conditionHolds({ op: "testFailed" }, session.state)).toBe(true);
    expect(visibleChoices(first, session.state).map((choice) => choice.id)).toEqual([
      "eat-anyway",
      "follow-stream",
      "climb-oak",
      "leave-glade",
    ]);
    expect(() => acceptTest(session, gladeBook, demoSystem)).toThrow(/stays here/);
    session = choose(session, gladeBook, demoSystem, "eat-anyway");
    expect(session.state.sectionId).toBe("23");
    expect(session.state.pending).toBeNull();
    expect(session.state.rolls.map((roll) => roll.success)).toEqual([false]);
  });

  it("locks the fail-only choice again when Fortune turns the fail into a pass, and unlocks it on the way back", () => {
    let session = holdTestRoll(glade(), gladeBook, demoSystem, never, [6, 6]);
    session = rerollTestDie(session, gladeBook, demoSystem, 0, never, 1);
    expect(session.state.pending).toMatchObject({ roll: { faces: [1, 6], success: true } });
    expect(session.state.stats.fortune).toBe(2);
    expect(conditionHolds({ op: "testFailed" }, session.state)).toBe(false);
    // A pass that turns to a section is taken as a pass always is: the choices wait.
    expect(choicesOpen(gladeBook.sections[0]!, session.state)).toBe(false);
    expect(() => choose(session, gladeBook, demoSystem, "follow-stream")).toThrow();
    session = acceptTest(session, gladeBook, demoSystem);
    expect(session.state.sectionId).toBe("14");
  });

  it("turns to the pass section after a pass", () => {
    let session = holdTestRoll(glade(), gladeBook, demoSystem, never, [1, 1]);
    session = acceptTest(session, gladeBook, demoSystem);
    expect(session.state.sectionId).toBe("14");
  });

  it("is false with no roll, on another section, and after a pass", () => {
    const session = glade();
    expect(conditionHolds({ op: "testFailed" }, session.state)).toBe(false);
    const passed = holdTestRoll(session, gladeBook, demoSystem, never, [2, 3]);
    expect(conditionHolds({ op: "testFailed" }, passed.state)).toBe(false);
    const failed = holdTestRoll(session, gladeBook, demoSystem, never, [6, 6]);
    const elsewhere = { ...failed.state, sectionId: "8" };
    expect(conditionHolds({ op: "testFailed" }, elsewhere)).toBe(false);
  });
});

describe("a result that stays and has a step", () => {
  it("applies the Wound when the fail settles, and keeps the player here to choose", () => {
    const book = woundBook();
    let session = startSession(book, demoSystem, fixtureCharacter(demoSystem));
    session = holdTestRoll(session, book, demoSystem, never, [6, 6]);
    expect(session.state.stats.vitality).toBe(2);
    expect(session.state.sectionId).toBe("1");
    session = choose(session, book, demoSystem, "follow-stream");
    expect(session.state.stats.vitality).toBe(2);
    expect(session.state.sectionId).toBe("8");
  });

  it("takes the Wound back when Fortune turns the fail into a pass, and puts it back on a second fail", () => {
    const book = woundBook();
    let session = startSession(book, demoSystem, fixtureCharacter(demoSystem));
    session = holdTestRoll(session, book, demoSystem, never, [6, 6]);
    expect(session.state.stats).toMatchObject({ vitality: 2, fortune: 3 });
    session = rerollTestDie(session, book, demoSystem, 0, never, 1);
    expect(session.state.stats).toMatchObject({ vitality: 3, fortune: 2 });
    session = rerollTestDie(session, book, demoSystem, 1, never, 6);
    // 1 + 6 = 7 still passes Talent 9, so nothing changes but the Fortune.
    expect(session.state.stats).toMatchObject({ vitality: 3, fortune: 1 });
    session = rerollTestDie(session, book, demoSystem, 0, never, 6);
    expect(session.state.pending).toMatchObject({ roll: { faces: [6, 6], success: false } });
    expect(session.state.stats).toMatchObject({ vitality: 2, fortune: 0 });
    // Undo walks back through each step.
    session = undo(session);
    expect(session.state.stats).toMatchObject({ vitality: 3, fortune: 1 });
  });

  it("the one-step roll also holds a result that stays, with its step applied", () => {
    const book = woundBook();
    const session = rollTest(startSession(book, demoSystem, fixtureCharacter(demoSystem)), book, demoSystem, never, [6, 6]);
    expect(session.state.sectionId).toBe("1");
    expect(session.state.stats.vitality).toBe(2);
    expect(session.state.pending).toMatchObject({ kind: "test", roll: { success: false } });
    // With both results staying, the choices are open after a pass too.
    const passed = rollTest(startSession(book, demoSystem, fixtureCharacter(demoSystem)), book, demoSystem, never, [2, 2]);
    expect(choicesOpen(book.sections[0]!, passed.state)).toBe(true);
  });
});

describe("P32 wording", () => {
  it("names the test in the fail-only reason", () => {
    const test = gladeBook.sections[0]!.test!;
    expect(testName(demoSystem, test)).toBe("Naturalist");
    expect(blockedBecause({ op: "testFailed" }, testName(demoSystem, test))).toBe("Only if the Naturalist test fails.");
    expect(blockedBecause({ op: "testFailed" }, testName(demoSystem, { stat: "talent" }))).toBe("Only if the Talent test fails.");
  });

  it("gives the approved hint before and after a fail, and none when both results turn", () => {
    const test = gladeBook.sections[0]!.test!;
    const roll = (success: boolean) => ({ id: "t", label: "t", dice: "2d6", faces: [6, 6], total: 12, success });
    expect(stayHint(test, null)).toBe("If you fail, choose from the options below.");
    expect(stayHint(test, roll(false))).toBe("The test failed. Choose below.");
    expect(stayHint({ ...test, failure: { to: "23" } }, null)).toBe("");
    expect(stayHint({ ...test, failure: { to: "23" } }, roll(false))).toBe("");
  });

  it("says only that the test passed after a pass that turns to a section", () => {
    const test = gladeBook.sections[0]!.test!;
    const roll = (success: boolean) => ({ id: "t", label: "t", dice: "2d6", faces: [1, 1], total: 2, success });
    expect(stayHint(test, roll(true))).toBe("The test passed.");
    expect(stayHint({ ...test, failure: { to: "23" } }, roll(true))).toBe("The test passed.");
    // A pass that stays here still points to the choices.
    expect(stayHint({ ...test, success: undefined }, roll(true))).toBe("The test passed. Choose below.");
  });
});
