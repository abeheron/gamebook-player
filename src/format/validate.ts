import type {
  Book,
  Choice,
  CombatDef,
  Condition,
  Effect,
  Section,
  StatDef,
  SystemDef,
  TestDef,
} from "./types";

export class BookValidationError extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = "BookValidationError";
    this.path = path;
  }
}

const ID = /^[a-z0-9][a-z0-9-]{0,40}$/;
const SECTION_ID = /^[0-9]{1,6}$/;
const DICE = /^(\d+)d(\d+)([+-]\d+)?$/;
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

const EFFECT_OPS = new Set(["addItem", "removeItem", "gainKeyword", "tick", "adjustStat"]);
const CONDITION_OPS = new Set(["hasItem", "keyword", "ticked", "statAtLeast", "not", "all"]);

export function validateSystem(input: unknown): SystemDef {
  const root = record(input, "system");
  requireKeys(root, ["id", "name", "attribution", "stats"], "system");
  const stats = arrayOf(root.stats, "system.stats", 1, 12).map((entry, index) =>
    validateStat(entry, `system.stats[${index}]`),
  );
  const ids = new Set<string>();
  for (const stat of stats) {
    if (ids.has(stat.id)) fail(`system.stats`, `duplicate stat ${stat.id}`);
    ids.add(stat.id);
  }
  return {
    id: identifier(root.id, "system.id"),
    name: text(root.name, "system.name", 1, 80),
    attribution: text(root.attribution, "system.attribution", 1, 600),
    stats,
  };
}

export function validateBook(input: unknown, system: SystemDef): Book {
  const root = record(input, "book");
  requireKeys(root, ["id", "title", "author", "rights", "system", "start", "sections"], "book");
  const systemId = identifier(root.system, "book.system");
  if (systemId !== system.id) {
    fail("book.system", `expected ${system.id}`);
  }
  const sections = arrayOf(root.sections, "book.sections", 1, 2000).map((entry, index) =>
    validateSection(entry, `book.sections[${index}]`, system),
  );
  const ids = new Set<string>();
  for (const section of sections) {
    if (ids.has(section.id)) fail("book.sections", `duplicate section ${section.id}`);
    ids.add(section.id);
  }
  const start = sectionId(root.start, "book.start");
  if (!ids.has(start)) fail("book.start", "unknown section");
  for (const section of sections) {
    for (const choice of section.choices ?? []) {
      if (!ids.has(choice.to)) fail(`book.sections.${section.id}`, `choice ${choice.id} leaves the book`);
    }
    if (section.test) {
      if (!ids.has(section.test.success.to) || !ids.has(section.test.failure.to)) {
        fail(`book.sections.${section.id}.test`, "unknown destination");
      }
    }
    if (section.combat) {
      if (!ids.has(section.combat.defeatSection) || !ids.has(section.combat.then)) {
        fail(`book.sections.${section.id}.combat`, "unknown destination");
      }
    }
  }
  return {
    id: identifier(root.id, "book.id"),
    title: text(root.title, "book.title", 1, 120),
    author: text(root.author, "book.author", 1, 120),
    rights: text(root.rights, "book.rights", 1, 600),
    system: systemId,
    start,
    sections,
  };
}

export function sectionMap(book: Book): Map<string, Section> {
  return new Map(book.sections.map((section) => [section.id, section]));
}

function validateStat(input: unknown, path: string): StatDef {
  const root = record(input, path);
  requireKeys(root, ["id", "label", "initial", "min", "max"], path);
  const min = integer(root.min, `${path}.min`, -100, 100);
  const max = integer(root.max, `${path}.max`, -100, 100);
  const initial = integer(root.initial, `${path}.initial`, min, max);
  if (max < min) fail(path, "max is below min");
  return {
    id: identifier(root.id, `${path}.id`),
    label: text(root.label, `${path}.label`, 1, 40),
    initial,
    min,
    max,
  };
}

function validateSection(input: unknown, path: string, system: SystemDef): Section {
  const root = record(input, path);
  requireKeys(root, ["id", "title", "body", "choices", "test", "combat"], path, ["choices", "test", "combat"]);
  const section: Section = {
    id: sectionId(root.id, `${path}.id`),
    title: text(root.title, `${path}.title`, 1, 120),
    body: arrayOf(root.body, `${path}.body`, 1, 12).map((paragraph, index) =>
      text(paragraph, `${path}.body[${index}]`, 1, 2000),
    ),
  };
  if ("choices" in root) {
    section.choices = arrayOf(root.choices, `${path}.choices`, 1, 12).map((entry, index) =>
      validateChoice(entry, `${path}.choices[${index}]`, system),
    );
  }
  if ("test" in root) section.test = validateTest(root.test, `${path}.test`, system);
  if ("combat" in root) section.combat = validateCombat(root.combat, `${path}.combat`, system);
  const modes = [section.choices, section.test, section.combat].filter((mode) => mode !== undefined);
  if (modes.length !== 1) {
    fail(path, "a section needs choices, a test, or a combat, and only one of them");
  }
  return section;
}

function validateChoice(input: unknown, path: string, system: SystemDef): Choice {
  const root = record(input, path);
  requireKeys(root, ["id", "label", "to", "when", "effects"], path, ["when", "effects"]);
  const choice: Choice = {
    id: identifier(root.id, `${path}.id`),
    label: text(root.label, `${path}.label`, 1, 160),
    to: sectionId(root.to, `${path}.to`),
  };
  if ("when" in root) choice.when = validateCondition(root.when, `${path}.when`, system, 0);
  if ("effects" in root) {
    choice.effects = arrayOf(root.effects, `${path}.effects`, 1, 8).map((entry, index) =>
      validateEffect(entry, `${path}.effects[${index}]`, system),
    );
  }
  return choice;
}

function validateTest(input: unknown, path: string, system: SystemDef): TestDef {
  const root = record(input, path);
  requireKeys(root, ["id", "label", "dice", "stat", "modifier", "success", "failure"], path, ["modifier"]);
  const test: TestDef = {
    id: identifier(root.id, `${path}.id`),
    label: text(root.label, `${path}.label`, 1, 160),
    dice: dice(root.dice, `${path}.dice`),
    stat: knownStat(root.stat, `${path}.stat`, system),
    success: validateBranch(root.success, `${path}.success`, system),
    failure: validateBranch(root.failure, `${path}.failure`, system),
  };
  if ("modifier" in root) test.modifier = integer(root.modifier, `${path}.modifier`, -20, 20);
  return test;
}

function validateBranch(input: unknown, path: string, system: SystemDef): TestDef["success"] {
  const root = record(input, path);
  requireKeys(root, ["to", "effects"], path, ["effects"]);
  const branch: TestDef["success"] = { to: sectionId(root.to, `${path}.to`) };
  if ("effects" in root) {
    branch.effects = arrayOf(root.effects, `${path}.effects`, 1, 8).map((entry, index) =>
      validateEffect(entry, `${path}.effects[${index}]`, system),
    );
  }
  return branch;
}

function validateCombat(input: unknown, path: string, system: SystemDef): CombatDef {
  const root = record(input, path);
  requireKeys(
    root,
    ["id", "label", "rounds", "dice", "stat", "modifier", "wound", "defeatSection", "then"],
    path,
    ["modifier"],
  );
  const wound = record(root.wound, `${path}.wound`);
  requireKeys(wound, ["stat", "amount", "defeatAtOrBelow"], `${path}.wound`);
  const combat: CombatDef = {
    id: identifier(root.id, `${path}.id`),
    label: text(root.label, `${path}.label`, 1, 80),
    rounds: integer(root.rounds, `${path}.rounds`, 1, 12),
    dice: dice(root.dice, `${path}.dice`),
    stat: knownStat(root.stat, `${path}.stat`, system),
    wound: {
      stat: knownStat(wound.stat, `${path}.wound.stat`, system),
      amount: integer(wound.amount, `${path}.wound.amount`, 1, 20),
      defeatAtOrBelow: integer(wound.defeatAtOrBelow, `${path}.wound.defeatAtOrBelow`, -100, 100),
    },
    defeatSection: sectionId(root.defeatSection, `${path}.defeatSection`),
    then: sectionId(root.then, `${path}.then`),
  };
  if ("modifier" in root) combat.modifier = integer(root.modifier, `${path}.modifier`, -20, 20);
  return combat;
}

function validateEffect(input: unknown, path: string, system: SystemDef): Effect {
  const root = record(input, path);
  const op = root.op;
  if (typeof op !== "string" || !EFFECT_OPS.has(op)) fail(path, "effect is not allowed");
  if (op === "addItem") {
    requireKeys(root, ["op", "id", "label"], path);
    return { op, id: identifier(root.id, `${path}.id`), label: text(root.label, `${path}.label`, 1, 80) };
  }
  if (op === "removeItem") {
    requireKeys(root, ["op", "id"], path);
    return { op, id: identifier(root.id, `${path}.id`) };
  }
  if (op === "gainKeyword") {
    requireKeys(root, ["op", "id", "label"], path);
    return { op, id: identifier(root.id, `${path}.id`), label: text(root.label, `${path}.label`, 1, 80) };
  }
  if (op === "tick") {
    requireKeys(root, ["op", "id", "label"], path);
    return { op, id: identifier(root.id, `${path}.id`), label: text(root.label, `${path}.label`, 1, 80) };
  }
  requireKeys(root, ["op", "stat", "by"], path);
  return {
    op: "adjustStat",
    stat: knownStat(root.stat, `${path}.stat`, system),
    by: integer(root.by, `${path}.by`, -20, 20),
  };
}

function validateCondition(input: unknown, path: string, system: SystemDef, depth: number): Condition {
  if (depth > 6) fail(path, "condition is nested too deeply");
  const root = record(input, path);
  const op = root.op;
  if (typeof op !== "string" || !CONDITION_OPS.has(op)) fail(path, "condition is not allowed");
  if (op === "hasItem" || op === "keyword" || op === "ticked") {
    requireKeys(root, ["op", "id"], path);
    return { op, id: identifier(root.id, `${path}.id`) };
  }
  if (op === "statAtLeast") {
    requireKeys(root, ["op", "stat", "value"], path);
    return {
      op,
      stat: knownStat(root.stat, `${path}.stat`, system),
      value: integer(root.value, `${path}.value`, -100, 100),
    };
  }
  if (op === "not") {
    requireKeys(root, ["op", "condition"], path);
    return { op, condition: validateCondition(root.condition, `${path}.condition`, system, depth + 1) };
  }
  requireKeys(root, ["op", "conditions"], path);
  return {
    op: "all",
    conditions: arrayOf(root.conditions, `${path}.conditions`, 1, 8).map((entry, index) =>
      validateCondition(entry, `${path}.conditions[${index}]`, system, depth + 1),
    ),
  };
}

function knownStat(input: unknown, path: string, system: SystemDef): string {
  const id = identifier(input, path);
  if (!system.stats.some((stat) => stat.id === id)) fail(path, "unknown stat");
  return id;
}

function dice(input: unknown, path: string): string {
  const value = text(input, path, 3, 12);
  const match = DICE.exec(value);
  if (!match) fail(path, "use a dice expression such as 2d6 or 2d6+1");
  const count = Number(match[1]);
  const sides = Number(match[2]);
  const modifier = match[3] === undefined ? 0 : Number(match[3]);
  if (count < 1 || count > 20 || sides < 2 || sides > 100 || modifier < -20 || modifier > 20) {
    fail(path, "dice expression is out of range");
  }
  return value;
}

function record(input: unknown, path: string): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    fail(path, "expected an object");
  }
  const root = input as Record<string, unknown>;
  for (const key of Object.keys(root)) {
    if (FORBIDDEN_KEYS.has(key)) fail(path, "forbidden key");
  }
  return root;
}

function requireKeys(
  root: Record<string, unknown>,
  allowed: string[],
  path: string,
  optional: string[] = [],
): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(root)) {
    if (!allowedSet.has(key)) fail(path, `unknown field ${key}`);
  }
  for (const key of allowed) {
    if (!optional.includes(key) && !Object.prototype.hasOwnProperty.call(root, key)) fail(path, `missing ${key}`);
  }
}

function arrayOf(input: unknown, path: string, min: number, max: number): unknown[] {
  if (!Array.isArray(input)) fail(path, "expected a list");
  if (input.length < min || input.length > max) fail(path, `expected ${min} to ${max} entries`);
  return input;
}

function identifier(input: unknown, path: string): string {
  const value = text(input, path, 1, 41);
  if (!ID.test(value)) fail(path, "use a short lowercase id");
  return value;
}

function sectionId(input: unknown, path: string): string {
  const value = text(input, path, 1, 6);
  if (!SECTION_ID.test(value)) fail(path, "section ids are numbers, as in a printed book");
  return value;
}

function text(input: unknown, path: string, min: number, max: number): string {
  if (typeof input !== "string") fail(path, "expected text");
  if ([...input].some((char) => char.charCodeAt(0) < 32)) fail(path, "control characters are not allowed");
  if (input.length < min || input.length > max) fail(path, `expected ${min} to ${max} characters`);
  return input;
}

function integer(input: unknown, path: string, min: number, max: number): number {
  if (typeof input !== "number" || !Number.isInteger(input)) fail(path, "expected an integer");
  if (input < min || input > max) fail(path, `expected ${min} to ${max}`);
  return input;
}

function fail(path: string, message: string): never {
  throw new BookValidationError(path, message);
}
