import { describe, expect, it } from "vitest";
import {
  beginReason,
  buildCharacter,
  chooseWeapon,
  emptyDraft,
  fixtureCharacter,
  setShield,
  skillsFull,
  talentFor,
  toggleSkill,
  tradesIn,
  undoLastTrade,
  type CreationDraft,
} from "../../src/engine/creation";
import { applyEffects } from "../../src/engine/state";
import { startSession } from "../../src/engine/rules";
import { canRestore } from "../../src/engine/restore";
import { demoBook, demoSystem } from "../../src/format/demo";

function pick(...ids: string[]): CreationDraft {
  return ids.reduce((draft, id) => toggleSkill(demoSystem, draft, id), emptyDraft());
}

describe("character creation", () => {
  it("gives the first two skills free", () => {
    const draft = pick("search", "stealth");
    expect(draft.picked).toEqual(["search", "stealth"]);
    expect(tradesIn(draft)).toBe(0);
    expect(talentFor(demoSystem, draft)).toBe(9);
  });

  it("trades 1 Talent for each extra skill, up to three", () => {
    expect(talentFor(demoSystem, pick("search", "stealth", "occult"))).toBe(8);
    expect(talentFor(demoSystem, pick("search", "stealth", "occult", "tracking"))).toBe(7);
    const five = pick("search", "stealth", "occult", "tracking", "climbing");
    expect(tradesIn(five)).toBe(3);
    expect(talentFor(demoSystem, five)).toBe(6);
    expect(skillsFull(five)).toBe(true);
  });

  it("refuses a fourth trade, so five skills at most", () => {
    const five = pick("search", "stealth", "occult", "tracking", "climbing");
    const refused = toggleSkill(demoSystem, five, "larceny");
    expect(refused).toBe(five);
    expect(refused.picked).toHaveLength(5);
  });

  it("ignores a skill the system does not have", () => {
    const draft = pick("search");
    expect(toggleSkill(demoSystem, draft, "juggling")).toBe(draft);
  });

  it("undoes the last trade and gives its Talent back", () => {
    const draft = pick("search", "stealth", "occult", "tracking");
    const undone = undoLastTrade(draft);
    expect(undone.picked).toEqual(["search", "stealth", "occult"]);
    expect(talentFor(demoSystem, undone)).toBe(8);
    const free = pick("search", "stealth");
    expect(undoLastTrade(free)).toBe(free);
  });

  it("recalculates when any skill is unticked, so no Talent is lost", () => {
    const draft = pick("search", "stealth", "occult");
    const untickedFree = toggleSkill(demoSystem, draft, "search");
    expect(untickedFree.picked).toEqual(["stealth", "occult"]);
    expect(tradesIn(untickedFree)).toBe(0);
    expect(talentFor(demoSystem, untickedFree)).toBe(9);
    const untickedExtra = toggleSkill(demoSystem, draft, "occult");
    expect(talentFor(demoSystem, untickedExtra)).toBe(9);
  });

  it("allows a shield only with a one-handed weapon and clears it when switching away", () => {
    let draft = chooseWeapon(pick("search", "stealth"), "long");
    expect(setShield(draft, true).shield).toBe(false);
    draft = setShield(chooseWeapon(draft, "one-handed"), true);
    expect(draft.shield).toBe(true);
    expect(chooseWeapon(draft, "long").shield).toBe(false);
    expect(chooseWeapon(draft, "two-handed").shield).toBe(false);
    expect(chooseWeapon(draft, "one-handed").shield).toBe(true);
  });

  it("explains what still stops Begin", () => {
    expect(beginReason(demoSystem, emptyDraft())).toEqual({
      ready: false,
      text: "To begin, pick 2 more skills and choose a weapon.",
    });
    expect(beginReason(demoSystem, pick("search")).text).toBe("To begin, pick 1 more skill and choose a weapon.");
    expect(beginReason(demoSystem, pick("search", "stealth")).text).toBe("To begin, choose a weapon.");
    expect(beginReason(demoSystem, chooseWeapon(emptyDraft(), "long")).text).toBe("To begin, pick 2 more skills.");
    expect(beginReason(demoSystem, chooseWeapon(pick("search", "stealth", "occult"), "long"))).toEqual({
      ready: true,
      text: "Ready. You start with Talent 8.",
    });
  });

  it("builds nothing until two skills and a weapon are chosen", () => {
    expect(buildCharacter(demoSystem, pick("search", "stealth"))).toBeNull();
    expect(buildCharacter(demoSystem, chooseWeapon(pick("search"), "long"))).toBeNull();
  });

  it("builds the character Begin starts with", () => {
    const draft = setShield(chooseWeapon(pick("search", "stealth", "occult", "tracking"), "one-handed"), true);
    const character = buildCharacter(demoSystem, draft);
    expect(character).toEqual({
      stats: { talent: 7, vitality: 3, fortune: 3 },
      maxima: { talent: 7 },
      skills: [
        { id: "search", bonus: 2 },
        { id: "stealth", bonus: 2 },
        { id: "occult", bonus: 2 },
        { id: "tracking", bonus: 2 },
      ],
      gold: 10,
      items: [{ id: "ration", label: "Ration" }],
      weapon: "one-handed",
      shield: true,
    });
    const plain = buildCharacter(demoSystem, chooseWeapon(pick("search", "stealth"), "two-handed"));
    expect(plain).toMatchObject({ stats: { talent: 9 }, maxima: { talent: 9 }, weapon: "two-handed", shield: false });
  });

  it("starts the book's start section with the created character and keeps Talent at its maximum", () => {
    const character = buildCharacter(demoSystem, chooseWeapon(pick("search", "stealth", "occult"), "long"));
    expect(character).not.toBeNull();
    if (!character) return;
    const session = startSession(demoBook, demoSystem, character);
    expect(session.state.sectionId).toBe(demoBook.start);
    expect(session.state).toMatchObject({ maxima: { talent: 8 }, weapon: "long", shield: false, gold: 10 });
    expect(canRestore(session, demoBook, demoSystem)).toBe(true);
    const raised = applyEffects(session.state, demoSystem, [{ op: "adjustStat", stat: "talent", by: 3 }]);
    expect(raised.stats.talent).toBe(8);
    const lowered = applyEffects(session.state, demoSystem, [{ op: "adjustStat", stat: "talent", by: -2 }]);
    expect(lowered.stats.talent).toBe(6);
    const fortune = applyEffects(session.state, demoSystem, [{ op: "adjustStat", stat: "fortune", by: 2 }]);
    expect(fortune.stats.fortune).toBe(3);
  });

  it("keeps the hidden test hero at Climbing and Linguistics with Talent 9", () => {
    expect(fixtureCharacter(demoSystem)).toEqual({
      stats: { talent: 9, vitality: 3, fortune: 3 },
      maxima: { talent: 9 },
      skills: [
        { id: "climbing", bonus: 2 },
        { id: "linguistics", bonus: 2 },
      ],
      gold: 10,
      items: [{ id: "ration", label: "Ration" }],
      weapon: "one-handed",
      shield: false,
    });
  });
});
