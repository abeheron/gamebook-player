import { describe, expect, it } from "vitest";
import { adventureOver, choose, holdTestRoll, rollCombatRound, startSession, undo, visibleChoices } from "../../src/engine/rules";
import { fixtureCharacter } from "../../src/engine/creation";
import { demoSystem, ravineBook } from "../../src/format/demo";
import type { Session } from "../../src/format/types";
import { gameOverLine } from "../../src/ui/wording";

/** Every die comes up 6, so 6 + 6 = 12 misses Talent 9 and each round is a Wound. */
const sixes = () => 0.999;

function ravine(): Session {
  return startSession(ravineBook, demoSystem, fixtureCharacter(demoSystem));
}

function loseAllRounds(session: Session): Session {
  let next = session;
  for (let round = 0; round < 3; round += 1) next = rollCombatRound(next, ravineBook, demoSystem, sixes);
  return next;
}

describe("P33 game over (original sample: The Ash Ravine)", () => {
  it("a lost fight with no losing section stays on the section and ends the adventure", () => {
    const atFight = choose(ravine(), ravineBook, demoSystem, "cross-bridge");
    expect(atFight.state.sectionId).toBe("5");
    expect(adventureOver(ravineBook, atFight.state)).toBe(false);
    const lost = loseAllRounds(atFight);
    expect(lost.state.sectionId).toBe("5");
    expect(lost.state.stats.vitality).toBe(0);
    expect(lost.state.pending).toBeNull();
    expect(adventureOver(ravineBook, lost.state)).toBe(true);
    expect(() => rollCombatRound(lost, ravineBook, demoSystem, sixes)).toThrow("The adventure is over.");
  });

  it("undo rewinds the last fight round and leaves game over", () => {
    const lost = loseAllRounds(choose(ravine(), ravineBook, demoSystem, "cross-bridge"));
    const back = undo(lost);
    expect(adventureOver(ravineBook, back.state)).toBe(false);
    expect(back.state.stats.vitality).toBe(1);
    expect(back.state.pending).toEqual({ kind: "combat", sectionId: "5", round: 2 });
  });

  it("a fight with a losing section still turns there and is not game over", () => {
    const lost = loseAllRounds(choose(ravine(), ravineBook, demoSystem, "wade-ford"));
    expect(lost.state.sectionId).toBe("12");
    expect(lost.state.stats.vitality).toBe(0);
    expect(adventureOver(ravineBook, lost.state)).toBe(false);
  });

  it("a test-only wound to 0 is not game over (out of scope)", () => {
    const atTest = choose(ravine(), ravineBook, demoSystem, "climb-scree");
    const held = holdTestRoll(atTest, ravineBook, demoSystem, sixes, [6, 6]);
    expect(held.state.stats.vitality).toBe(0);
    expect(adventureOver(ravineBook, held.state)).toBe(false);
    const section = ravineBook.sections.find((entry) => entry.id === "17");
    expect(section && visibleChoices(section, held.state).map((choice) => choice.id)).toEqual(["back-down"]);
  });

  it("names the section and the enemy on the card", () => {
    expect(gameOverLine("5", "Cinder hound")).toBe("You fell at §5 fighting the Cinder hound.");
    expect(gameOverLine("44", "The Grey Warden")).toBe("You fell at §44 fighting The Grey Warden.");
  });
});
