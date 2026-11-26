import { describe, expect, it } from "vitest";
import rawMarsh from "../fixtures/p35-marsh.json";
import { demoSystem, marshBook } from "../../src/format/demo";
import { validateBook } from "../../src/format/validate";
import type { Session } from "../../src/format/types";
import { marshCharacter } from "../../src/engine/creation";
import { edgeNow, fightLocked } from "../../src/engine/fight-edge";
import { canRestore } from "../../src/engine/restore";
import {
  acceptTest,
  adventureOver,
  choose,
  currentSection,
  holdTestRoll,
  rerollCombatDie,
  rerollFinalRound,
  rerollTestDie,
  rollCombatRound,
  skipTest,
  startSession,
  tickFightBox,
  undo,
} from "../../src/engine/rules";
import {
  EDGE_RULE,
  fightTestResultLine,
  noLosingNote,
  outcomeLabel,
  rerollLine,
  rerollOrder,
  skippedLine,
  stake,
  waitingLine,
} from "../../src/ui/fight-wording";

/** An rng that rolls these faces on a d6, in order. */
function faces(...list: number[]) {
  const queue = list.map((face) => (face - 0.5) / 6);
  return () => {
    const next = queue.shift();
    if (next === undefined) throw new Error("ran out of scripted faces");
    return next;
  };
}

function at(choiceId: string, weapon: "one-handed" | "two-handed" = "one-handed"): Session {
  const hero = { ...marshCharacter(demoSystem), weapon };
  return choose(startSession(marshBook, demoSystem, hero), marshBook, demoSystem, choiceId);
}

function settle(session: Session, dice: [number, number]): Session {
  return acceptTest(holdTestRoll(session, marshBook, demoSystem, faces(), dice), marshBook, demoSystem);
}

function lastRoll(session: Session) {
  return session.state.rolls[session.state.rolls.length - 1];
}

function rawCopy(): Record<string, unknown> & { sections: Record<string, unknown>[] } {
  return structuredClone(rawMarsh) as unknown as Record<string, unknown> & { sections: Record<string, unknown>[] };
}

function sectionOf(raw: ReturnType<typeof rawCopy>, id: string): Record<string, unknown> {
  const found = raw.sections.find((entry) => entry.id === id);
  if (!found) throw new Error(`missing §${id}`);
  return found;
}

describe("P35 format", () => {
  it("accepts a test and a combat on one section, and checks the wait-for-the-test lock", () => {
    const section = marshBook.sections.find((entry) => entry.id === "10");
    expect(section?.test && section.combat?.afterTest).toBe(true);

    const noLock = rawCopy();
    delete (sectionOf(noLock, "10").combat as Record<string, unknown>).afterTest;
    expect(() => validateBook(noLock, demoSystem)).toThrow(/must wait for it/);

    const strayLock = rawCopy();
    (sectionOf(strayLock, "66").combat as Record<string, unknown>).afterTest = true;
    expect(() => validateBook(strayLock, demoSystem)).toThrow(/no test to wait for/);

    const withChoices = rawCopy();
    sectionOf(withChoices, "10").choices = [{ id: "run", label: "Run", to: "1" }];
    expect(() => validateBook(withChoices, demoSystem)).toThrow(/cannot share its section with choices/);
  });

  it("allows a fight edge, a skip, and boxes only where they make sense", () => {
    const edgeNoFight = rawCopy();
    sectionOf(edgeNoFight, "1").test = {
      id: "t",
      label: "Test Stealth",
      dice: "2d6",
      stat: "talent",
      success: { to: "90", edge: "advantage" },
      failure: { to: "91" },
    };
    expect(() => validateBook(edgeNoFight, demoSystem)).toThrow(/only a test before a fight/);

    const edgeAway = rawCopy();
    ((sectionOf(edgeAway, "50").test as Record<string, unknown>).success as Record<string, unknown>).edge = "advantage";
    expect(() => validateBook(edgeAway, demoSystem)).toThrow(/never opens the fight/);

    const oddEdge = rawCopy();
    ((sectionOf(oddEdge, "10").test as Record<string, unknown>).failure as Record<string, unknown>).edge = "both";
    expect(() => validateBook(oddEdge, demoSystem)).toThrow(/advantage or disadvantage/);

    const boxesNoEdge = rawCopy();
    delete (sectionOf(boxesNoEdge, "70").combat as Record<string, unknown>).edge;
    expect(() => validateBook(boxesNoEdge, demoSystem)).toThrow(/only remove the fight's own/);

    const emptyBranch = rawCopy();
    (sectionOf(emptyBranch, "10").test as Record<string, unknown>).failure = {};
    expect(() => validateBook(emptyBranch, demoSystem)).toThrow(/a destination, effects, or a fight edge/);
  });
});

describe("P35 a test before a fight", () => {
  it("locks the fight until the test is settled, then fights with Disadvantage after a fail", () => {
    let session = at("reed-channel");
    const section = currentSection(marshBook, session);
    expect(fightLocked(section, session.state)).toBe(true);
    expect(() => rollCombatRound(session, marshBook, demoSystem, faces(4, 4))).toThrow(/Settle the test/);

    session = holdTestRoll(session, marshBook, demoSystem, faces(), [6, 6]);
    expect(fightLocked(section, session.state)).toBe(true);
    session = acceptTest(session, marshBook, demoSystem);
    expect(session.state.sectionId).toBe("10");
    expect(session.state.fight).toMatchObject({ sectionId: "10", test: "fail", roll: { faces: [6, 6], success: false } });
    expect(fightLocked(section, session.state)).toBe(false);
    expect(edgeNow(section, session.state)).toBe("disadvantage");

    // The first 1 or 2, left to right, is re-rolled: the 2 on the right here, not the 4.
    session = rollCombatRound(session, marshBook, demoSystem, faces(4, 2, 5));
    expect(lastRoll(session)).toMatchObject({ faces: [4, 5], total: 9, success: true, rerolls: [{ index: 1, from: 2, to: 5, by: "disadvantage" }] });
    const line = lastRoll(session)?.rerolls?.[0];
    if (line) expect(rerollLine(line)).toBe("Disadvantage re-rolled a 2 to a 5.");
    expect(session.state.pending).toEqual({ kind: "combat", sectionId: "10", round: 1 });
  });

  it("re-rolls only the first 1 or 2 each round, and takes the second result even if it is worse", () => {
    let session = settle(at("reed-channel"), [6, 6]);
    session = rollCombatRound(session, marshBook, demoSystem, faces(1, 2, 6));
    expect(lastRoll(session)).toMatchObject({ faces: [6, 2], total: 8, rerolls: [{ index: 0, from: 1, to: 6, by: "disadvantage" }] });
    session = rollCombatRound(session, marshBook, demoSystem, faces(3, 4));
    expect(session.state.rolls.filter((roll) => roll.id === "reed-pike").at(-1)?.rerolls).toBeUndefined();
  });

  it("fights as normal after a pass, with no automatic re-roll", () => {
    let session = settle(at("reed-channel"), [3, 3]);
    expect(session.state.fight?.test).toBe("pass");
    expect(edgeNow(currentSection(marshBook, session), session.state)).toBe("none");
    session = rollCombatRound(session, marshBook, demoSystem, faces(1, 2));
    expect(lastRoll(session)).toMatchObject({ faces: [1, 2] });
    expect(lastRoll(session)?.rerolls).toBeUndefined();
  });

  it("lets Fortune re-roll a die that Disadvantage already replaced, in the same round", () => {
    let session = settle(at("reed-channel"), [6, 6]);
    session = rollCombatRound(session, marshBook, demoSystem, faces(2, 6, 6));
    expect(lastRoll(session)).toMatchObject({ faces: [6, 6], success: false });
    expect(session.state.stats.vitality).toBe(2);
    session = rerollCombatDie(session, marshBook, demoSystem, 0, faces(), 3);
    expect(lastRoll(session)).toMatchObject({
      faces: [3, 6],
      success: true,
      rerolls: [
        { index: 0, from: 2, to: 6, by: "disadvantage" },
        { index: 0, from: 6, to: 3, by: "fortune" },
      ],
    });
    expect(session.state.stats.vitality).toBe(3);
    expect(session.state.stats.fortune).toBe(2);
    // A second Fortune spend on the same round pays again.
    session = rerollCombatDie(session, marshBook, demoSystem, 1, faces(), 1);
    expect(session.state.stats.fortune).toBe(1);
    expect(lastRoll(session)?.rerolls).toHaveLength(3);
  });

  it("offers one Advantage re-roll per round after a pass, after Fortune, and closes Fortune once it is used", () => {
    let session = settle(at("toll-keeper"), [2, 3]);
    const section = currentSection(marshBook, session);
    expect(edgeNow(section, session.state)).toBe("advantage");
    session = rollCombatRound(session, marshBook, demoSystem, faces(6, 5));
    expect(lastRoll(session)?.rerolls).toBeUndefined();
    session = rerollCombatDie(session, marshBook, demoSystem, 0, faces(), 4);
    session = rerollCombatDie(session, marshBook, demoSystem, 1, faces(), 2, "advantage");
    expect(lastRoll(session)).toMatchObject({ faces: [4, 2], success: true });
    expect(lastRoll(session)?.rerolls?.map((entry) => entry.by)).toEqual(["fortune", "advantage"]);
    expect(session.state.stats.fortune).toBe(2);
    expect(() => rerollCombatDie(session, marshBook, demoSystem, 0, faces(), 1, "advantage")).toThrow(/already used this round/);
    expect(() => rerollCombatDie(session, marshBook, demoSystem, 0, faces(), 1)).toThrow(/already used this round/);
  });

  it("keeps Advantage on the round that ends the fight, before the player takes the turn", () => {
    let session = settle(at("toll-keeper"), [2, 3]);
    session = rollCombatRound(session, marshBook, demoSystem, faces(3, 3));
    const start = session.state;
    const held = rollCombatRound(session, marshBook, demoSystem, faces(6, 6));
    expect(held.state.sectionId).toBe("90");
    expect(held.state.stats.vitality).toBe(2);
    const again = rerollFinalRound(held, start, marshBook, demoSystem, 0, faces(), 1, "advantage");
    expect(again.state.sectionId).toBe("90");
    expect(again.state.stats.vitality).toBe(3);
    expect(again.undo).toEqual(held.undo);
    expect(lastRoll(again)?.rerolls).toEqual([{ index: 0, from: 6, to: 1, by: "advantage" }]);
    expect(() => rerollFinalRound(again, start, marshBook, demoSystem, 1, faces(), 1, "advantage")).toThrow(/already used/);
  });

  it("has no Advantage re-roll without Advantage", () => {
    let session = settle(at("reed-channel"), [6, 6]);
    session = rollCombatRound(session, marshBook, demoSystem, faces(4, 4));
    expect(() => rerollCombatDie(session, marshBook, demoSystem, 0, faces(), 1, "advantage")).toThrow(/no Advantage/);
  });

  it("cancels Advantage and Disadvantage when both apply; Fortune still works", () => {
    const pass = settle(at("wight"), [2, 2]);
    expect(edgeNow(currentSection(marshBook, pass), pass.state)).toBe("advantage");
    let session = settle(at("wight"), [6, 6]);
    const section = currentSection(marshBook, session);
    expect(edgeNow(section, session.state)).toBe("cancel");
    session = rollCombatRound(session, marshBook, demoSystem, faces(2, 5));
    expect(lastRoll(session)).toMatchObject({ faces: [2, 5], total: 7 });
    expect(lastRoll(session)?.rerolls).toBeUndefined();
    expect(() => rerollCombatDie(session, marshBook, demoSystem, 0, faces(), 1, "advantage")).toThrow(/no Advantage/);
    session = rerollCombatDie(session, marshBook, demoSystem, 0, faces(), 1);
    expect(lastRoll(session)?.faces).toEqual([1, 5]);
  });

  it("keeps the Fortune re-roll on a held test before a fight, and takes the result once", () => {
    let session = holdTestRoll(at("reed-channel"), marshBook, demoSystem, faces(), [6, 5]);
    expect(session.state.pending).toMatchObject({ kind: "test" });
    session = rerollTestDie(session, marshBook, demoSystem, 0, faces(), 1);
    expect(session.state.pending).toMatchObject({ roll: { faces: [1, 5], success: true } });
    session = acceptTest(session, marshBook, demoSystem);
    expect(session.state.fight?.test).toBe("pass");
    expect(() => holdTestRoll(session, marshBook, demoSystem, faces(), [1, 1])).toThrow(/already settled/);
  });

  it("takes a Wound before round 1 on a fail; the tracker still has no fight-round wounds", () => {
    let session = settle(at("boardwalk"), [6, 6]);
    expect(session.state.stats.vitality).toBe(2);
    expect(session.state.rolls.filter((roll) => roll.id === "boardwalk-thief")).toHaveLength(0);
    expect(session.state.pending).toBeNull();
    // With no losing section, a lost fight after that is game over (P33).
    session = rollCombatRound(session, marshBook, demoSystem, faces(6, 6));
    expect(session.state.stats.vitality).toBe(1);
    expect(session.state.sectionId).toBe("90");
    const passed = settle(at("boardwalk"), [3, 3]);
    expect(passed.state.stats.vitality).toBe(3);
  });

  it("ends the adventure when the Wound before round 1 leaves Vitality at 0 and there is no losing section", () => {
    let session = at("boardwalk");
    session = { ...session, state: { ...session.state, stats: { ...session.state.stats, vitality: 1 } } };
    session = settle(session, [6, 6]);
    expect(session.state.stats.vitality).toBe(0);
    expect(adventureOver(marshBook, session.state)).toBe(true);
  });

  it("turns away on a pass that skips the fight, and fights on a fail", () => {
    const passed = settle(at("ferry-hut"), [2, 2]);
    expect(passed.state.sectionId).toBe("90");
    expect(passed.state.fight).toBeNull();
    const failed = settle(at("ferry-hut"), [6, 6]);
    expect(failed.state.sectionId).toBe("50");
    expect(failed.state.fight?.test).toBe("fail");
    const hit = rollCombatRound(failed, marshBook, demoSystem, faces(6, 6));
    expect(hit.state.sectionId).toBe("90");
    expect(hit.state.stats.vitality).toBe(2);
  });

  it("follows the closing line after a pass as well as after the fight", () => {
    expect(settle(at("mudbank"), [2, 2]).state.sectionId).toBe("90");
    const failed = settle(at("mudbank"), [6, 6]);
    expect(rollCombatRound(failed, marshBook, demoSystem, faces(1, 2)).state.sectionId).toBe("90");
  });

  it("skips an optional test: the fail result without a roll, so no Advantage", () => {
    expect(() => skipTest(at("reed-channel"), marshBook, demoSystem)).toThrow(/cannot be skipped/);
    let session = skipTest(at("heron"), marshBook, demoSystem);
    expect(session.state.fight).toEqual({ sectionId: "30", test: "skipped", ticked: [] });
    expect(edgeNow(currentSection(marshBook, session), session.state)).toBe("none");
    expect(() => skipTest(session, marshBook, demoSystem)).toThrow(/already settled/);
    expect(() => holdTestRoll(session, marshBook, demoSystem, faces(), [1, 1])).toThrow(/already settled/);
    session = rollCombatRound(session, marshBook, demoSystem, faces(3, 3));
    expect(session.state.pending).toMatchObject({ round: 1 });
    expect(undo(undo(session)).state.fight).toBeNull();
  });

  it("changes only the gold on a bargain, then opens the fight; a skip pays the full price", () => {
    const pass = settle(at("eel-seller"), [2, 2]);
    expect(pass.state.gold).toBe(7);
    expect(edgeNow(currentSection(marshBook, pass), pass.state)).toBe("none");
    expect(settle(at("eel-seller"), [6, 6]).state.gold).toBe(4);
    const skipped = skipTest(at("eel-seller"), marshBook, demoSystem);
    expect(skipped.state.gold).toBe(4);
    expect(rollCombatRound(skipped, marshBook, demoSystem, faces(2, 2)).state.sectionId).toBe("90");
  });

  it("lets either box remove the fight's own Disadvantage, before round 1 only", () => {
    let session = at("gnats");
    const section = currentSection(marshBook, session);
    expect(fightLocked(section, session.state)).toBe(false);
    expect(edgeNow(section, session.state)).toBe("disadvantage");
    session = tickFightBox(session, marshBook, "ranged-weapon", true);
    expect(session.state.fight).toEqual({ sectionId: "70", ticked: ["ranged-weapon"] });
    expect(session.undo).toHaveLength(1);
    expect(edgeNow(section, session.state)).toBe("none");
    session = tickFightBox(session, marshBook, "ranged-weapon", false);
    expect(edgeNow(section, session.state)).toBe("disadvantage");
    session = tickFightBox(session, marshBook, "flight-spell", true);
    expect(edgeNow(section, session.state)).toBe("none");
    expect(tickFightBox(session, marshBook, "no-such-box", true)).toBe(session);
    session = rollCombatRound(session, marshBook, demoSystem, faces(1, 1));
    expect(lastRoll(session)?.rerolls).toBeUndefined();
    expect(tickFightBox(session, marshBook, "flight-spell", false)).toBe(session);
    // Leaving the section clears the set-up.
    session = rollCombatRound(session, marshBook, demoSystem, faces(1, 1));
    expect(session.state.sectionId).toBe("90");
    expect(session.state.fight).toBeNull();
  });
});

describe("P35 two-handed weapon", () => {
  it("re-rolls the first 6 of each fight round, in any fight, and the second result stands", () => {
    let session = at("deep-channel", "two-handed");
    session = rollCombatRound(session, marshBook, demoSystem, faces(3, 6, 2));
    expect(lastRoll(session)).toMatchObject({ faces: [3, 2], success: true, rerolls: [{ index: 1, from: 6, to: 2, by: "two-handed" }] });
    session = rollCombatRound(session, marshBook, demoSystem, faces(6, 6, 6));
    expect(session.state.sectionId).toBe("90");
  });

  it("resolves Disadvantage first, then the two-handed 6, including a 6 that Disadvantage rolled", () => {
    let session = settle(at("reed-channel", "two-handed"), [6, 6]);
    session = rollCombatRound(session, marshBook, demoSystem, faces(1, 4, 6, 3));
    expect(lastRoll(session)?.rerolls).toEqual([
      { index: 0, from: 1, to: 6, by: "disadvantage" },
      { index: 0, from: 6, to: 3, by: "two-handed" },
    ]);
    expect(lastRoll(session)?.faces).toEqual([3, 4]);
  });

  it("does nothing for a one-handed weapon", () => {
    const session = rollCombatRound(at("deep-channel"), marshBook, demoSystem, faces(6, 3));
    expect(lastRoll(session)?.rerolls).toBeUndefined();
  });
});

describe("P35 a fight with a losing section is unchanged", () => {
  it("turns to the losing section on a defeat", () => {
    let session = at("deep-channel");
    session = rollCombatRound(session, marshBook, demoSystem, faces(6, 6));
    session = rollCombatRound(session, marshBook, demoSystem, faces(6, 6));
    expect(session.state.sectionId).toBe("90");
    let lost = at("deep-channel");
    lost = { ...lost, state: { ...lost.state, stats: { ...lost.state.stats, vitality: 1 } } };
    lost = rollCombatRound(lost, marshBook, demoSystem, faces(6, 6));
    expect(lost.state.sectionId).toBe("91");
    expect(adventureOver(marshBook, lost.state)).toBe(false);
  });
});

describe("P35 saves", () => {
  it("restores a settled test, ticked boxes, and re-roll notes, and rejects a mismatched set-up", () => {
    let session = settle(at("reed-channel"), [6, 6]);
    session = rollCombatRound(session, marshBook, demoSystem, faces(2, 2, 5));
    expect(canRestore(structuredClone(session), marshBook, demoSystem)).toBe(true);
    const boxes = tickFightBox(at("gnats"), marshBook, "ranged-weapon", true);
    expect(canRestore(structuredClone(boxes), marshBook, demoSystem)).toBe(true);

    const wrongSection = structuredClone(session);
    if (wrongSection.state.fight) wrongSection.state.fight.sectionId = "20";
    expect(canRestore(wrongSection, marshBook, demoSystem)).toBe(false);
    const lying = structuredClone(session);
    if (lying.state.fight) lying.state.fight.test = "pass";
    expect(canRestore(lying, marshBook, demoSystem)).toBe(false);
    const badSkip = structuredClone(session);
    if (badSkip.state.fight) {
      badSkip.state.fight.test = "skipped";
      delete badSkip.state.fight.roll;
    }
    expect(canRestore(badSkip, marshBook, demoSystem)).toBe(false);
    const unknownBox = structuredClone(boxes);
    if (unknownBox.state.fight) unknownBox.state.fight.ticked = ["net"];
    expect(canRestore(unknownBox, marshBook, demoSystem)).toBe(false);
    const badNote = structuredClone(session) as unknown as { state: { rolls: { rerolls?: unknown[] }[] } };
    const note = badNote.state.rolls.at(-1);
    if (note) note.rerolls = [{ index: 0, from: 2, to: 5, by: "luck" }];
    expect(canRestore(badNote, marshBook, demoSystem)).toBe(false);
    // Rounds cannot be held while the fight still waits for its test.
    const early = structuredClone(at("reed-channel"));
    early.state.pending = { kind: "combat", sectionId: "10", round: 1 };
    expect(canRestore(early, marshBook, demoSystem)).toBe(false);
  });
});

describe("P35 wording", () => {
  it("states the stakes on the waiting fight and the outcome buttons", () => {
    const session = at("reed-channel");
    const section = currentSection(marshBook, session);
    const pass = stake(section, session.state, demoSystem, "pass");
    const fail = stake(section, session.state, demoSystem, "fail");
    expect(pass).toBe("fight as normal");
    expect(fail).toBe("fight with Disadvantage");
    expect(waitingLine("Swimming", pass, fail)).toBe("Waiting for the Swimming test. Pass: fight as normal. Fail: fight with Disadvantage.");
    const hut = at("ferry-hut");
    expect(stake(currentSection(marshBook, hut), hut.state, demoSystem, "pass")).toBe("turn to §90");
    expect(stake(currentSection(marshBook, hut), hut.state, demoSystem, "fail")).toBe("fight the Ferry guards, 1 round at −2");
    const walk = at("boardwalk");
    expect(stake(currentSection(marshBook, walk), walk.state, demoSystem, "fail")).toBe("take a Wound, then fight");
    const eel = at("eel-seller");
    expect(stake(currentSection(marshBook, eel), eel.state, demoSystem, "pass")).toBe("pay 3 gold, then fight");
    const wight = at("wight");
    expect(stake(currentSection(marshBook, wight), wight.state, demoSystem, "pass")).toBe("fight with Advantage");
    expect(stake(currentSection(marshBook, wight), wight.state, demoSystem, "fail")).toBe("fight; Advantage and Disadvantage cancel");
  });

  it("words a sneak-style test, its skip, and a fight with no losing section", () => {
    const heron = at("heron");
    const section = currentSection(marshBook, heron);
    const pass = stake(section, heron.state, demoSystem, "pass");
    const fail = stake(section, heron.state, demoSystem, "fail");
    expect(pass).toBe("fight with Advantage");
    expect(fail).toBe("fight without Advantage");
    expect(waitingLine("Stealth", pass, fail, true)).toBe(
      "Waiting for the Stealth test. Pass: fight with Advantage. Fail or skip: fight without Advantage.",
    );
    expect(outcomeLabel("Pass", pass)).toBe("Pass · Fight with Advantage");
    expect(outcomeLabel("Fail", fail)).toBe("Fail · Fight without Advantage");
    expect(outcomeLabel("Skip", fail)).toBe("Skip · Fight without Advantage");
    expect(skippedLine(fail)).toBe("Skipped. Fight without Advantage.");
    const keeper = at("toll-keeper");
    expect(stake(currentSection(marshBook, keeper), keeper.state, demoSystem, "fail")).toBe("fight without Advantage");
    const reed = currentSection(marshBook, at("reed-channel"));
    expect(reed.combat && noLosingNote(reed.combat)).toBe("Win → §39. This fight has no losing section.");
    const eel = currentSection(marshBook, at("deep-channel"));
    expect(eel.combat && noLosingNote(eel.combat)).toBe("");
    expect(fightTestResultLine([6, 6], 12, false, "Swimming +2")).toBe("6 + 6 = 12. Swimming +2. Fail.");
    expect(fightTestResultLine([1, 1], 2, true, "Swimming +2")).toBe("1 + 1 = 2. Swimming +2. Pass.");
    expect(EDGE_RULE.cancel).toBe("A magic weapon grants Advantage. If the fight also has Disadvantage, they cancel and neither applies.");
  });

  it("keeps the fixture's condition boxes as the handoff names them", () => {
    const gnats = currentSection(marshBook, at("gnats"));
    expect(gnats.combat?.unless?.map((box) => box.label)).toEqual(["I can cast a flight spell", "I have a ranged weapon"]);
  });

  it("keeps the re-roll order explicit", () => {
    expect(rerollOrder("disadvantage", false)).toBe(
      "Re-rolls: Disadvantage is automatic, before Fortune. Then Fortune, then Advantage. Advantage does not apply in this fight.",
    );
    expect(rerollOrder("advantage", false)).toContain("Fortune first, then Advantage");
    expect(rerollOrder("cancel", false)).toBe("No Advantage button, and no automatic re-roll of a 1 or 2. Fortune still works as usual.");
    expect(rerollOrder("none", false)).toBe("");
    expect(rerollOrder("none", true)).toBe("Re-rolls: your two-handed weapon re-rolls the first 6 automatically, before Fortune. Then Fortune.");
    expect(rerollOrder("disadvantage", true)).toContain("then your two-handed weapon's first 6, before Fortune");
  });
});
