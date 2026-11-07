export interface DiceExpression {
  count: number;
  sides: number;
  modifier: number;
  text: string;
}

export type Rng = () => number;

const DICE = /^(\d+)d(\d+)([+-]\d+)?$/;

export function parseDice(input: string): DiceExpression {
  const match = DICE.exec(input);
  if (!match) throw new Error(`Not a dice expression: ${input}`);
  const count = Number(match[1]);
  const sides = Number(match[2]);
  const modifier = match[3] === undefined ? 0 : Number(match[3]);
  if (
    !Number.isInteger(count) ||
    !Number.isInteger(sides) ||
    !Number.isInteger(modifier) ||
    count < 1 ||
    count > 20 ||
    sides < 2 ||
    sides > 100 ||
    modifier < -20 ||
    modifier > 20
  ) {
    throw new Error(`Dice expression is out of range: ${input}`);
  }
  return { count, sides, modifier, text: input };
}

export function rollDie(sides: number, rng: Rng): number {
  const sample = rng();
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
    throw new Error("rng must return a number in [0, 1)");
  }
  return 1 + Math.floor(sample * sides);
}

export interface DiceRoll {
  faces: number[];
  total: number;
}

export function rollDice(expression: DiceExpression, rng: Rng): DiceRoll {
  const faces: number[] = [];
  for (let index = 0; index < expression.count; index += 1) {
    faces.push(rollDie(expression.sides, rng));
  }
  const total = faces.reduce((sum, face) => sum + face, expression.modifier);
  return { faces, total };
}
