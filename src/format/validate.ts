import { isSampleArtId } from "./sample-art";
import type {
  Book,
  Choice,
  CombatDef,
  Condition,
  Effect,
  FightCondition,
  FightEdge,
  Illustration,
  NamedValue,
  Section,
  SectionEnter,
  SkillDef,
  SkillRank,
  StatDef,
  SystemDef,
  TestBranch,
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

const EFFECT_OPS = new Set(["addItem", "removeItem", "gainKeyword", "tick", "adjustStat", "adjustGold"]);
const EDGES = new Set<string>(["advantage", "disadvantage"]);
const CONDITION_OPS = new Set(["hasItem", "keyword", "ticked", "statAtLeast", "not", "all", "testFailed"]);

export function validateSystem(input: unknown): SystemDef {
  const root = record(input, "system");
  requireKeys(
    root,
    [
      "id",
      "name",
      "attribution",
      "stats",
      "skills",
      "basicSkillBonus",
      "absentSkillPenalty",
      "startingSkills",
      "startingGold",
      "startingItems",
      "fortuneStat",
      "fortuneRerollCost",
    ],
    "system",
  );
  const stats = arrayOf(root.stats, "system.stats", 1, 12).map((entry, index) =>
    validateStat(entry, `system.stats[${index}]`),
  );
  const statIds = new Set<string>();
  for (const stat of stats) {
    if (statIds.has(stat.id)) fail(`system.stats`, `duplicate stat ${stat.id}`);
    statIds.add(stat.id);
  }
  const skills = arrayOf(root.skills, "system.skills", 1, 24).map((entry, index) =>
    validateSkill(entry, `system.skills[${index}]`),
  );
  const skillIds = new Set<string>();
  for (const skill of skills) {
    if (skillIds.has(skill.id)) fail("system.skills", `duplicate skill ${skill.id}`);
    skillIds.add(skill.id);
  }
  const basicSkillBonus = integer(root.basicSkillBonus, "system.basicSkillBonus", 0, 20);
  const absentSkillPenalty = integer(root.absentSkillPenalty, "system.absentSkillPenalty", -20, 20);
  const startingSkills = arrayOf(root.startingSkills, "system.startingSkills", 0, 12).map((entry, index) =>
    validateSkillRank(entry, `system.startingSkills[${index}]`, skills, basicSkillBonus),
  );
  const owned = new Set<string>();
  for (const skill of startingSkills) {
    if (owned.has(skill.id)) fail("system.startingSkills", `duplicate skill ${skill.id}`);
    owned.add(skill.id);
  }
  const startingItems = arrayOf(root.startingItems, "system.startingItems", 0, 24).map((entry, index) =>
    validateNamed(entry, `system.startingItems[${index}]`),
  );
  const itemIds = new Set<string>();
  for (const item of startingItems) {
    if (itemIds.has(item.id)) fail("system.startingItems", `duplicate item ${item.id}`);
    itemIds.add(item.id);
  }
  return {
    id: identifier(root.id, "system.id"),
    name: text(root.name, "system.name", 1, 80),
    attribution: text(root.attribution, "system.attribution", 1, 800),
    stats,
    skills,
    basicSkillBonus,
    absentSkillPenalty,
    startingSkills,
    startingGold: integer(root.startingGold, "system.startingGold", 0, 1_000_000),
    startingItems,
    fortuneStat: knownStatId(root.fortuneStat, stats),
    fortuneRerollCost: fortuneCost(root.fortuneRerollCost, stats, knownStatId(root.fortuneStat, stats)),
  };
}

function knownStatId(value: unknown, stats: readonly StatDef[]): string {
  const id = identifier(value, "system.fortuneStat");
  if (!stats.some((stat) => stat.id === id)) fail("system.fortuneStat", `unknown stat ${id}`);
  return id;
}

function fortuneCost(value: unknown, stats: readonly StatDef[], statId: string): number {
  const stat = stats.find((entry) => entry.id === statId);
  const max = stat?.max ?? 1;
  return integer(value, "system.fortuneRerollCost", 1, Math.max(1, max));
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
      for (const branch of [section.test.success, section.test.failure]) {
        if (branch?.to !== undefined && !ids.has(branch.to)) fail(`book.sections.${section.id}.test`, "unknown destination");
      }
    }
    if (section.combat) {
      const defeat = section.combat.defeatSection;
      if ((defeat !== undefined && !ids.has(defeat)) || !ids.has(section.combat.then)) {
        fail(`book.sections.${section.id}.combat`, "unknown destination");
      }
    }
    const jump = section.enter?.jump;
    if (jump && (!ids.has(jump.to) || jump.to === section.id)) fail(`book.sections.${section.id}.enter.jump`, "unknown destination");
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
  requireKeys(root, ["id", "title", "body", "enter", "choices", "test", "combat", "illustration"], path, [
    "enter",
    "choices",
    "test",
    "combat",
    "illustration",
  ]);
  const section: Section = {
    id: sectionId(root.id, `${path}.id`),
    title: text(root.title, `${path}.title`, 0, 120),
    body: arrayOf(root.body, `${path}.body`, 1, 12).map((paragraph, index) =>
      text(paragraph, `${path}.body[${index}]`, 1, 2000),
    ),
  };
  if ("enter" in root) section.enter = validateEnter(root.enter, `${path}.enter`, system);
  // P35: a test beside a combat comes before the fight, and may change it or skip it.
  if ("test" in root) section.test = validateTest(root.test, `${path}.test`, system, "combat" in root);
  if ("choices" in root) {
    const besideTest = section.test !== undefined;
    section.choices = arrayOf(root.choices, `${path}.choices`, 1, 12).map((entry, index) =>
      validateChoice(entry, `${path}.choices[${index}]`, system, besideTest),
    );
  }
  if ("combat" in root) section.combat = validateCombat(root.combat, `${path}.combat`, system);
  if ("illustration" in root) section.illustration = validateIllustration(root.illustration, `${path}.illustration`);
  validateExits(section, path);
  return section;
}

/**
 * A section's exit is choices, a test, a test with choices beside it, a combat, or a test before a
 * combat (P35). A combat never shares its section with choices. Beside a combat, a test result with
 * no destination opens the fight; the combat must say it waits for the test. Elsewhere a test result
 * with no destination stays on the section, so the player needs a choice to leave by: after a pass,
 * one that is not fail-only.
 */
function validateExits(section: Section, path: string): void {
  const { choices, test, combat } = section;
  if (combat) {
    if (choices) fail(path, "a combat cannot share its section with choices");
    if (test && !combat.afterTest) fail(`${path}.combat`, "a combat beside a test must wait for it (afterTest)");
    if (!test && combat.afterTest) fail(`${path}.combat.afterTest`, "there is no test to wait for");
    return;
  }
  if (!choices && !test) fail(path, "a section needs choices, a test, or a combat");
  if (!test) return;
  const open = (choices ?? []).filter((choice) => !failOnly(choice.when));
  if (test.success?.to === undefined && open.length === 0) {
    fail(`${path}.test.success`, "a pass that stays here needs a choice that is open after a pass");
  }
  if (test.failure?.to === undefined && (choices ?? []).length === 0) {
    fail(`${path}.test.failure`, "a fail that stays here needs choices");
  }
}

/** A choice that opens only after a failed test. */
export function failOnly(condition: Condition | undefined): boolean {
  if (!condition) return false;
  if (condition.op === "testFailed") return true;
  if (condition.op === "all") return condition.conditions.some((entry) => failOnly(entry));
  return false;
}

function validateEnter(input: unknown, path: string, system: SystemDef): SectionEnter {
  const root = record(input, path);
  requireKeys(root, ["jump", "effects"], path, ["jump", "effects"]);
  const enter: SectionEnter = {};
  if ("jump" in root) {
    const jump = record(root.jump, `${path}.jump`);
    requireKeys(jump, ["when", "to"], `${path}.jump`);
    enter.jump = {
      when: validateCondition(jump.when, `${path}.jump.when`, system, 0),
      to: sectionId(jump.to, `${path}.jump.to`),
    };
  }
  if ("effects" in root) {
    enter.effects = arrayOf(root.effects, `${path}.effects`, 1, 8).map((entry, index) =>
      validateEffect(entry, `${path}.effects[${index}]`, system),
    );
  }
  if (!enter.jump && !enter.effects) fail(path, "expected a jump or effects");
  return enter;
}

function validateIllustration(input: unknown, path: string): Illustration {
  const root = record(input, path);
  requireKeys(root, ["id", "label", "title", "alt"], path);
  const id = identifier(root.id, `${path}.id`);
  if (!isSampleArtId(id)) fail(path, `unknown illustration ${id}`);
  return {
    id,
    label: text(root.label, `${path}.label`, 1, 40),
    title: text(root.title, `${path}.title`, 1, 80),
    alt: text(root.alt, `${path}.alt`, 1, 200),
  };
}

function validateChoice(input: unknown, path: string, system: SystemDef, besideTest: boolean): Choice {
  const root = record(input, path);
  requireKeys(root, ["id", "label", "to", "when", "effects"], path, ["when", "effects"]);
  const choice: Choice = {
    id: identifier(root.id, `${path}.id`),
    label: text(root.label, `${path}.label`, 1, 160),
    to: sectionId(root.to, `${path}.to`),
  };
  if ("when" in root) choice.when = validateCondition(root.when, `${path}.when`, system, 0, besideTest);
  if ("effects" in root) {
    choice.effects = arrayOf(root.effects, `${path}.effects`, 1, 8).map((entry, index) =>
      validateEffect(entry, `${path}.effects[${index}]`, system),
    );
  }
  return choice;
}

function validateTest(input: unknown, path: string, system: SystemDef, beforeFight: boolean): TestDef {
  const root = record(input, path);
  requireKeys(root, ["id", "label", "dice", "stat", "modifier", "skill", "success", "failure", "optional"], path, [
    "modifier",
    "skill",
    "success",
    "failure",
    "optional",
  ]);
  const test: TestDef = {
    id: identifier(root.id, `${path}.id`),
    label: text(root.label, `${path}.label`, 1, 160),
    dice: dice(root.dice, `${path}.dice`),
    stat: knownStat(root.stat, `${path}.stat`, system),
  };
  if ("success" in root) test.success = validateBranch(root.success, `${path}.success`, system, beforeFight);
  if ("failure" in root) test.failure = validateBranch(root.failure, `${path}.failure`, system, beforeFight);
  if ("optional" in root) {
    if (root.optional !== true) fail(`${path}.optional`, "expected true");
    if (!beforeFight) fail(`${path}.optional`, "only a test before a fight can be skipped");
    test.optional = true;
  }
  if ("modifier" in root) test.modifier = integer(root.modifier, `${path}.modifier`, -20, 20);
  if ("skill" in root) test.skill = knownSkill(root.skill, `${path}.skill`, system);
  return test;
}

function validateBranch(input: unknown, path: string, system: SystemDef, beforeFight: boolean): TestBranch {
  const root = record(input, path);
  requireKeys(root, ["to", "effects", "edge"], path, ["to", "effects", "edge"]);
  const branch: TestBranch = {};
  if ("to" in root) branch.to = sectionId(root.to, `${path}.to`);
  if ("effects" in root) {
    branch.effects = arrayOf(root.effects, `${path}.effects`, 1, 8).map((entry, index) =>
      validateEffect(entry, `${path}.effects[${index}]`, system),
    );
  }
  if ("edge" in root) {
    if (!beforeFight) fail(`${path}.edge`, "only a test before a fight can set Advantage or Disadvantage");
    if (branch.to !== undefined) fail(`${path}.edge`, "a result that turns away never opens the fight");
    branch.edge = edge(root.edge, `${path}.edge`);
  }
  // Leave out a result that neither moves nor changes anything.
  if (branch.to === undefined && branch.effects === undefined && branch.edge === undefined) {
    fail(path, beforeFight ? "expected a destination, effects, or a fight edge" : "expected a destination or effects");
  }
  return branch;
}

function edge(input: unknown, path: string): FightEdge {
  if (typeof input !== "string" || !EDGES.has(input)) fail(path, "expected advantage or disadvantage");
  return input as FightEdge;
}

function validateCombat(input: unknown, path: string, system: SystemDef): CombatDef {
  const root = record(input, path);
  requireKeys(
    root,
    ["id", "label", "rounds", "dice", "stat", "modifier", "wound", "defeatSection", "then", "afterTest", "edge", "unless"],
    path,
    ["modifier", "defeatSection", "afterTest", "edge", "unless"],
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
    then: sectionId(root.then, `${path}.then`),
  };
  if ("defeatSection" in root) combat.defeatSection = sectionId(root.defeatSection, `${path}.defeatSection`);
  if ("modifier" in root) combat.modifier = integer(root.modifier, `${path}.modifier`, -20, 20);
  if ("afterTest" in root) {
    if (root.afterTest !== true) fail(`${path}.afterTest`, "expected true");
    combat.afterTest = true;
  }
  if ("edge" in root) combat.edge = edge(root.edge, `${path}.edge`);
  if ("unless" in root) {
    if (!combat.edge) fail(`${path}.unless`, "a box can only remove the fight's own Advantage or Disadvantage");
    const boxes = arrayOf(root.unless, `${path}.unless`, 1, 4).map((entry, index) =>
      validateFightCondition(entry, `${path}.unless[${index}]`),
    );
    if (new Set(boxes.map((box) => box.id)).size !== boxes.length) fail(`${path}.unless`, "duplicate box");
    combat.unless = boxes;
  }
  return combat;
}

function validateFightCondition(input: unknown, path: string): FightCondition {
  const root = record(input, path);
  requireKeys(root, ["id", "label"], path);
  return { id: identifier(root.id, `${path}.id`), label: text(root.label, `${path}.label`, 1, 120) };
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
  if (op === "adjustGold") {
    requireKeys(root, ["op", "by"], path);
    return { op, by: integer(root.by, `${path}.by`, -10_000, 10_000) };
  }
  requireKeys(root, ["op", "stat", "by"], path);
  return {
    op: "adjustStat",
    stat: knownStat(root.stat, `${path}.stat`, system),
    by: integer(root.by, `${path}.by`, -20, 20),
  };
}

/** `testFailed` is allowed only on a choice beside a test, and not under `not`. */
function validateCondition(input: unknown, path: string, system: SystemDef, depth: number, besideTest = false): Condition {
  if (depth > 6) fail(path, "condition is nested too deeply");
  const root = record(input, path);
  const op = root.op;
  if (typeof op !== "string" || !CONDITION_OPS.has(op)) fail(path, "condition is not allowed");
  if (op === "testFailed") {
    if (!besideTest) fail(path, "testFailed needs a test on the same section");
    requireKeys(root, ["op"], path);
    return { op };
  }
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
      validateCondition(entry, `${path}.conditions[${index}]`, system, depth + 1, besideTest),
    ),
  };
}

function validateSkill(input: unknown, path: string): SkillDef {
  const root = record(input, path);
  requireKeys(root, ["id", "label"], path);
  return {
    id: identifier(root.id, `${path}.id`),
    label: text(root.label, `${path}.label`, 1, 40),
  };
}

function validateSkillRank(input: unknown, path: string, skills: readonly SkillDef[], basicSkillBonus: number): SkillRank {
  const root = record(input, path);
  requireKeys(root, ["id", "bonus"], path);
  const id = identifier(root.id, `${path}.id`);
  if (!skills.some((skill) => skill.id === id)) fail(path, "unknown skill");
  return {
    id,
    bonus: integer(root.bonus, `${path}.bonus`, basicSkillBonus, 99),
  };
}

function validateNamed(input: unknown, path: string): NamedValue {
  const root = record(input, path);
  requireKeys(root, ["id", "label"], path);
  return {
    id: identifier(root.id, `${path}.id`),
    label: text(root.label, `${path}.label`, 1, 80),
  };
}

function knownStat(input: unknown, path: string, system: SystemDef): string {
  const id = identifier(input, path);
  if (!system.stats.some((stat) => stat.id === id)) fail(path, "unknown stat");
  return id;
}

function knownSkill(input: unknown, path: string, system: SystemDef): string {
  const id = identifier(input, path);
  if (!system.skills.some((skill) => skill.id === id)) fail(path, "unknown skill");
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
