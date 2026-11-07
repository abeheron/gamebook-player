import { describe, expect, it } from "vitest";
import { parseDice, rollDice, rollDie, type Rng } from "../../src/engine/dice";

function scripted(samples: number[]): Rng {
  let index = 0;
  return () => {
    const sample = samples[index];
    index += 1;
    if (sample === undefined) throw new Error("rng exhausted");
    return sample;
  };
}

describe("dice", () => {
  it("parses a bounded dice expression", () => {
    expect(parseDice("2d6")).toMatchObject({ count: 2, sides: 6, modifier: 0 });
    expect(parseDice("1d6+2")).toMatchObject({ count: 1, sides: 6, modifier: 2 });
    expect(parseDice("2d6-1").modifier).toBe(-1);
  });

  it("rejects expressions that are not dice", () => {
    expect(() => parseDice("2d6; alert(1)")).toThrow(/Not a dice expression/);
    expect(() => parseDice("0d6")).toThrow(/out of range/);
  });

  it("rolls inclusive faces from the injected rng", () => {
    expect(rollDie(6, scripted([0]))).toBe(1);
    expect(rollDie(6, scripted([0.999]))).toBe(6);
    expect(() => rollDie(6, scripted([1]))).toThrow(/\[0, 1\)/);
  });

  it("sums faces and the modifier", () => {
    const rolled = rollDice(parseDice("2d6+1"), scripted([0, 0.999]));
    expect(rolled.faces).toEqual([1, 6]);
    expect(rolled.total).toBe(8);
  });
});
