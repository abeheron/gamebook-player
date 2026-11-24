import type { Book, Effect, Section, SectionEnter, SystemDef } from "./types";
import { BookValidationError, validateBook } from "./validate";

export interface SourcePage {
  ref: string;
  text: string;
}

export interface DraftChoice {
  label: string;
  to: string;
  /** Taking this choice ticks the section's box, as in "put a tick in the box above and turn to N". */
  tick?: boolean;
}

/** A section the reader can correct before it is stored. */
export interface DraftSection {
  number: string;
  title: string;
  passage: string;
  choices: DraftChoice[];
  testLabel: string;
  skill: string;
  /** Signed test modifier, such as "−2" for "at -2". Empty when the text gives none. */
  testModifier: string;
  passTo: string;
  failTo: string;
  /** Steps taken on a pass, such as a ticked box or a lost Talent. */
  passEffects: Effect[];
  /** Steps taken on a fail, such as a Wound. */
  failEffects: Effect[];
  fightName: string;
  fightRounds: string;
  /** Signed penalty, such as "−2". Empty when the text gives none. */
  fightPenalty: string;
  winTo: string;
  /** Empty when the book gives no defeat section: losing the fight ends the adventure. */
  loseTo: string;
  /** "If the box above is ticked, turn to N": N, or empty. The box is named after the section. */
  tickTo: string;
  /** "If not, put a tick there now and read on": the box is ticked on arrival, after the jump check. */
  tickOnEnter: boolean;
  sawTest: boolean;
  sawFight: boolean;
  pageIndex: number;
  flags: string[];
  checked: boolean;
}

export type BookFileKind = "pdf" | "epub";

export interface DraftBook {
  title: string;
  author: string;
  source: BookFileKind;
  pages: SourcePage[];
  sections: DraftSection[];
}

export interface PlacedFlags {
  number: string[];
  passage: string[];
  choices: string[][];
  pass: string[];
  fail: string[];
  test: string[];
  win: string[];
  lose: string[];
  fight: string[];
  other: string[];
}

export interface ConvertCounts {
  sections: number;
  flagged: number;
  choices: number;
  tests: number;
  fights: number;
  missingDestinations: number;
}

/** Flag reasons. placeFlags puts each one under the field it talks about. */
export const FLAG = {
  fightName: "No enemy name found for this fight.",
  fightRounds: "Round count unclear.",
  fightTwice: "More than one fight in this section.",
  noWin: "No section to turn to if you win.",
  secondWin: "More than one section to turn to if you win.",
  winExtra: "The win link has extra steps the draft cannot hold.",
  secondLose: "More than one section to turn to if you lose.",
  loseExtra: "The lose link has extra steps the draft cannot hold.",
  noTest: "Success or fail links, but no test to roll.",
  testTwice: "More than one test in this section.",
  testModifier: "This test has a modifier the draft cannot hold.",
  testSkill: "This test names a skill the system does not include.",
  noPass: "No section to turn to if you succeed.",
  secondPass: "More than one section to turn to if you succeed.",
  passExtra: "The success link has extra steps the draft cannot hold.",
  noFail: "No section to turn to if you fail.",
  secondFail: "More than one section to turn to if you fail.",
  failExtra: "The fail link has extra steps the draft cannot hold.",
  mixedExits: "This section has more than one kind of exit.",
  noExits: "This section has no exits.",
  tickCondition: "A ticked-box link with another condition cannot be wired yet.",
  tickNever: "Nothing in this section ticks the box above.",
} as const;

const FLAG_FIELD: Record<string, "fight" | "win" | "lose" | "test" | "pass" | "fail"> = {
  [FLAG.fightName]: "fight",
  [FLAG.fightRounds]: "fight",
  [FLAG.fightTwice]: "fight",
  [FLAG.noWin]: "win",
  [FLAG.secondWin]: "win",
  [FLAG.winExtra]: "win",
  [FLAG.secondLose]: "lose",
  [FLAG.loseExtra]: "lose",
  [FLAG.noTest]: "test",
  [FLAG.testTwice]: "test",
  [FLAG.testModifier]: "test",
  [FLAG.testSkill]: "test",
  [FLAG.noPass]: "pass",
  [FLAG.secondPass]: "pass",
  [FLAG.passExtra]: "pass",
  [FLAG.noFail]: "fail",
  [FLAG.secondFail]: "fail",
  [FLAG.failExtra]: "fail",
};

export type BuiltBook =
  | { ok: true; book: Book }
  | { ok: false; step: 5 | 6; error: string };

const HEADER = /^(\d{1,4})\s*\.\s*$/;
const COUNT = "(\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)";
const WIN = /if you (?:win(?: the fight)?|survive),?\s*turn to (\d+)/i;
const LOSE = /if you (?:are defeated|lose),?\s*turn to (\d+)/i;
const ROUNDS_AT = new RegExp(`(?:fight (?:for )?)?${COUNT} rounds? at\\s*([−-]?\\d+)`, "i");
const ROUNDS = new RegExp(`fight (?:for )?${COUNT} rounds?\\b`, "i");
/** A stat line such as "Wolf Fight two rounds at -1". The words before "Fight" name the enemy. */
const FIGHT_LINE = new RegExp(`^(.{1,40}?)\\s+fight (?:for )?${COUNT} rounds?\\b`, "i");
const TEST = /\btest (?:your )?([A-Za-z]+)/i;
const SUCCESS = /if you (?:are successful|succeed),?\s*turn to (\d+)/i;
const FAIL = /if you fail,?\s*turn to (\d+)/i;
const TICK = /\bthe box above is ticked\b/i;
/** "If the box above is ticked, turn to N", allowing a clause before "; turn to N". No other condition. */
const TICK_JUMP = /^if the box above is ticked,\s*(?:[^.;]*;\s*)?turn to (\d+)\b[\s.]*$/i;
/** "If not, put a tick there now and read on." */
const TICK_ON_ENTER = /\bput a tick (?:there|in the box above)? ?now and read on\b/i;
/** A choice that ticks the box as it is taken. */
const TICK_ON_CHOICE = /\b(?:put a tick in the box above|tick the box above)\b/i;
/**
 * Looser outcome wording. Flavour may sit after a comma before "turn to N", as in
 * "If you win, you climb the stairs; turn to N". Close win synonyms count only once a fight
 * is already in the section.
 */
const OUTCOME_HEAD: { kind: "win" | "lose" | "pass" | "fail"; head: RegExp; needsFight?: boolean }[] = [
  { kind: "win", head: /^if you (?:win|survive)(?: (?:the|this) (?:fight|battle|combat|onslaught))?\b/i },
  { kind: "win", head: /^(?:if by some chance you win\b|if you (?:overcome|defeat) (?:the|this|these|them|it|him|her)\b[^,;]*)/i, needsFight: true },
  { kind: "lose", head: /^if you (?:are defeated|lose)\b/i },
  { kind: "pass", head: /^if you (?:are successful|succeed)\b/i },
  { kind: "fail", head: /^if you fail\b/i },
];
/** What follows an outcome head: optional ", flavour", then "turn to N" and nothing else. */
const OUTCOME_TAIL = /^\s*(?:,\s*(.*?)[\s;,]*(?:\band\s+)?)?\(?turn to (\d+)\)?[\s.]*$/i;
/** Words that mean a real step or a condition, not flavour. */
const MECHANICS =
  /\b(?:ticks?|ticked|keywords?|increase|decrease|reduce|restore|lose|deduct|gain|add|wounds?|note|cross|remove|assault|score|roll|either|if|unless|instead|choose|otherwise|talent|vitality|gold|advantage|disadvantage|items?|or)\b/i;
/** A test's success and fail clauses, in the section text after the test. */
const CLAUSE = /\bif you (?:are successful|succeed|fail)\b/gi;
/** The wording before a shared destination after a test: "If you are still alive, ...". */
const SHARED_LEAD = /^(?:if you (?:are still alive|survive)\b[^,;]*[,;]\s*|either way,\s*|in either case,\s*)/i;
const TRAILING_TURN = /[\s;,]*(?:\band\s+)?\(?turn to \d+\)?[\s.]*$/i;
const TURN = /turn to (\d+)/i;
const TURNS = /turn to (\d+)(?:\s*\))?/gi;
const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

/** Turn extracted pages into a draft. Uncertain structure is flagged, not guessed. */
export function structurePages(
  pages: readonly SourcePage[],
  meta: { title: string; author: string; source: BookFileKind },
  system: SystemDef,
): DraftBook {
  const raws: { number: string; lines: string[]; pageIndex: number }[] = [];
  let current: { number: string; lines: string[]; pageIndex: number } | null = null;
  let previous = "";
  pages.forEach((page, pageIndex) => {
    for (const line of page.text.split(/\n/)) {
      const header = HEADER.exec(line.trim());
      const wrapped = /\bturn(?: to)?$/i.test(previous);
      if (line.trim()) previous = line.trim();
      if (header?.[1] && !wrapped) {
        current = { number: header[1], lines: [], pageIndex };
        raws.push(current);
        continue;
      }
      current?.lines.push(line);
    }
  });
  const sections = raws.map((raw) => parseSection(raw, system));
  noteNumbering(sections);
  noteMissingDestinations(sections);
  return {
    title: clean(meta.title, 120) || "Imported book",
    author: clean(meta.author, 120) || "Unknown",
    source: meta.source,
    pages: pages.map((page) => ({ ref: page.ref, text: page.text })),
    sections,
  };
}

export function countDraft(draft: DraftBook): ConvertCounts {
  const ids = new Set(draft.sections.map((section) => section.number));
  let missingDestinations = 0;
  for (const section of draft.sections) {
    for (const destination of destinations(section)) {
      if (!ids.has(destination)) missingDestinations += 1;
    }
  }
  return {
    sections: draft.sections.length,
    flagged: draft.sections.filter((section) => section.flags.length > 0).length,
    choices: draft.sections.reduce((sum, section) => sum + section.choices.length, 0),
    tests: draft.sections.filter((section) => section.sawTest).length,
    fights: draft.sections.filter((section) => section.sawFight).length,
    missingDestinations,
  };
}

/** Counts only. The lines never include passage text. */
export function formatCounts(counts: ConvertCounts): string {
  return [
    `sections found: ${counts.sections}`,
    `flagged: ${counts.flagged}`,
    `choices: ${counts.choices}`,
    `tests: ${counts.tests}`,
    `fights: ${counts.fights}`,
    `missing destinations: ${counts.missingDestinations}`,
  ].join("\n");
}

export function draftToBook(draft: DraftBook, system: SystemDef): BuiltBook {
  const sections: Section[] = [];
  for (const section of draft.sections) {
    const built = buildSection(section, system);
    if (!built.ok) return built;
    sections.push(built.section);
  }
  const ids = new Set(sections.map((section) => section.id));
  if (ids.size !== sections.length) {
    return { ok: false, step: 5, error: "Two sections use the same number." };
  }
  const start = ids.has("1") ? "1" : [...ids].sort((a, b) => Number(a) - Number(b))[0];
  if (!start) return { ok: false, step: 5, error: "Nothing in this file was recognised as a book." };
  const book = {
    id: bookSlug(draft.title),
    title: draft.title,
    author: draft.author,
    rights: "Converted on this device from a file the reader supplied.",
    system: system.id,
    start,
    sections,
  };
  try {
    return { ok: true, book: validateBook(book, system) };
  } catch (error) {
    const message = error instanceof BookValidationError || error instanceof Error ? error.message : "The book is not valid.";
    if (message.startsWith("book.system")) {
      return { ok: false, step: 6, error: `This app does not include the system “${system.id}”.` };
    }
    return { ok: false, step: 5, error: message };
  }
}

/** "Page 4 of this PDF". An EPUB uses the same shape with EPUB. */
export function sourcePageHeading(ref: string, source: BookFileKind): string {
  const number = /^Page (\d+)$/.exec(ref)?.[1] ?? ref;
  return `Page ${number} of this ${source === "epub" ? "EPUB" : "PDF"}`;
}

/** §N plus the opening words. The review list truncates long passages. */
export function listLabel(number: string, passage: string): string {
  const words = passage.replace(/\s+/g, " ").trim();
  const max = 48;
  if (words.length <= max) return words ? `§${number} ${words}` : `§${number}`;
  const cut = words.slice(0, max);
  const last = cut.lastIndexOf(" ");
  const clipped = (last > 16 ? cut.slice(0, last) : cut).trim();
  return `§${number} ${clipped}…`;
}

export function flaggedNotice(count: number): string {
  return count === 1
    ? "Add to library stays unavailable while 1 section is still flagged."
    : `Add to library stays unavailable while ${count} sections are still flagged.`;
}

/** Put each flag under the field it talks about. */
export function placeFlags(section: DraftSection): PlacedFlags {
  const placed: PlacedFlags = {
    number: [],
    passage: [],
    choices: section.choices.map(() => []),
    pass: [],
    fail: [],
    test: [],
    win: [],
    lose: [],
    fight: [],
    other: [],
  };
  for (const flag of section.flags) {
    const destination = /^Destination §(\d+) does not exist\.$/.exec(flag);
    if (destination?.[1]) {
      let used = false;
      section.choices.forEach((choice, index) => {
        if (choice.to === destination[1]) {
          placed.choices[index]?.push(flag);
          used = true;
        }
      });
      if (section.passTo === destination[1]) {
        placed.pass.push(flag);
        used = true;
      }
      if (section.failTo === destination[1]) {
        placed.fail.push(flag);
        used = true;
      }
      if (section.winTo === destination[1]) {
        placed.win.push(flag);
        used = true;
      }
      if (section.loseTo === destination[1]) {
        placed.lose.push(flag);
        used = true;
      }
      if (!used) placed.other.push(flag);
      continue;
    }
    const field = FLAG_FIELD[flag];
    if (field) {
      placed[field].push(flag);
      continue;
    }
    if (flag === "This section has no passage.") {
      placed.passage.push(flag);
      continue;
    }
    if (flag === "Duplicate section number." || flag.startsWith("Numbering ")) {
      placed.number.push(flag);
      continue;
    }
    if (flag === FLAG.tickCondition) {
      const index = section.choices.findIndex((choice) => /ticked/i.test(choice.label));
      if (index >= 0) placed.choices[index]?.push(flag);
      else placed.other.push(flag);
      continue;
    }
    placed.other.push(flag);
  }
  return placed;
}

export function penaltyModifier(value: string): number | undefined {
  const trimmed = value.trim().replaceAll("−", "-");
  if (!/^[+-]?\d+$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed.startsWith("+") || trimmed.startsWith("-") ? trimmed : `-${trimmed.replace(/^-/, "")}`);
  if (!Number.isInteger(parsed) || parsed < -20 || parsed > 20) return undefined;
  return parsed;
}

export function bookSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 41)
    .replace(/-+$/g, "");
  return /^[a-z0-9][a-z0-9-]{0,40}$/.test(slug) ? slug : "imported-book";
}

function parseSection(
  raw: { number: string; lines: string[]; pageIndex: number },
  system: SystemDef,
): DraftSection {
  const flags: string[] = [];
  const units = sentences(logicalLines(raw.lines));
  const segmented = units.map((unit) => turnSegments(unit));
  const winIndex = segmented.findIndex((segments) => segments.some((segment) => WIN.test(segment)));
  const sawFight =
    winIndex >= 0 || units.some((unit) => ROUNDS.test(unit) || ROUNDS_AT.test(unit)) || segmented.some((segments) => segments.some((segment) => LOSE.test(segment)));
  const fightName = sawFight ? monsterName(units, winIndex >= 0 ? winIndex : units.length) : "";
  const lastLinkUnit = segmented.reduce((last, segments, index) => (segments.length > 0 ? index : last), -1);
  let winTo = "";
  let loseTo = "";
  let fightRounds = "";
  let fightPenalty = "";
  let fights = 0;
  let sawTest = false;
  let tests = 0;
  let testLabel = "";
  let skill = "";
  let testModifier = "";
  let testIndex = -1;
  let testRest = "";
  let tickTo = "";
  let tickOnEnter = false;
  /** "If you survive, you press on." with "Turn to N" in a later sentence. */
  let pendingWin = false;
  const problems = new Set<string>();
  const extra = new Set<"win" | "lose" | "pass" | "fail">();
  let passTo = "";
  let failTo = "";
  let passEffects: Effect[] = [];
  let failEffects: Effect[] = [];
  const choices: DraftChoice[] = [];
  /** For each choice: the sentence it came from and where that sentence would sit in the passage. */
  const choiceAt: { unit: number; body: number }[] = [];
  const body: string[] = [];

  units.forEach((unit, index) => {
    if (!unit) {
      body.push("");
      return;
    }
    if (TICK_ON_ENTER.test(unit)) tickOnEnter = true;
    const roundsAt = ROUNDS_AT.exec(unit);
    const rounds = roundsAt ?? ROUNDS.exec(unit);
    if (rounds?.[1]) {
      fights += 1;
      fightRounds = countValue(rounds[1]);
      if (roundsAt?.[2]) fightPenalty = normalizePenalty(roundsAt[2]);
      // Only a bare "Name Fight N rounds" line leaves the passage. Condition words stay visible.
      const rest = unit.replace(rounds[0], "").replace(fightName, "").replace(/[\s.,;:]+/g, "");
      if (!rest) return;
    }
    if (sawFight && (/^talent\b/i.test(unit) || /^vitality\b/i.test(unit) || unit === fightName)) return;
    const test = findTest(unit, system);
    if (test) {
      sawTest = true;
      tests += test.count;
      // A long sentence would clip the skill's name, so the label then starts at the test.
      testLabel = clip(unit.length > 160 ? unit.slice(test.at) : unit, 160);
      skill = test.skill;
      testModifier = test.modifier;
      testIndex = index;
      testRest = test.rest;
      if (test.unknownSkill) problems.add(FLAG.testSkill);
      if (test.unstorable) problems.add(FLAG.testModifier);
    }
    const segments = segmented[index] ?? [];
    if (test || segments.length === 0) body.push(unit);
    if (sawFight && !winTo && segments.length === 0 && winLead(unit)) pendingWin = true;
    else if (pendingWin && segments.length === 0 && MECHANICS.test(unit)) pendingWin = false;
    for (const segment of segments) {
      if (pendingWin && !winTo && segments.length === 1 && index === lastLinkUnit && bareLink(segment)) {
        winTo = TURN.exec(segment)?.[1] ?? "";
        pendingWin = false;
        continue;
      }
      const outcome = readOutcome(segment, sawFight, raw.number);
      if (outcome && "to" in outcome) {
        // A second link of the same kind stays a choice, so nothing is lost, and is flagged.
        if (outcome.kind === "win") {
          if (!winTo) {
            winTo = outcome.to;
            continue;
          }
          problems.add(FLAG.secondWin);
        } else if (outcome.kind === "lose") {
          if (!loseTo) {
            loseTo = outcome.to;
            continue;
          }
          problems.add(FLAG.secondLose);
        } else if (outcome.kind === "pass") {
          if (!passTo) {
            passTo = outcome.to;
            passEffects = outcome.effects;
            continue;
          }
          problems.add(FLAG.secondPass);
        } else {
          if (!failTo) {
            failTo = outcome.to;
            failEffects = outcome.effects;
            continue;
          }
          problems.add(FLAG.secondFail);
        }
      }
      const to = TURN.exec(segment)?.[1] ?? "";
      const jump = TICK_JUMP.exec(segment);
      if (jump?.[1] && !tickTo) {
        // Wired as the section's box jump. The words stay in the passage.
        tickTo = jump[1];
        body.push(segment);
        continue;
      }
      if (TICK.test(segment)) problems.add(FLAG.tickCondition);
      if (outcome && !("to" in outcome)) extra.add(outcome.kind);
      choices.push({ label: clip(segment, 160), to, ...(TICK_ON_CHOICE.test(segment) ? { tick: true } : {}) });
      choiceAt.push({ unit: index, body: body.length });
    }
  });
  if ((passTo || failTo) && !sawTest) sawTest = true;

  // A test whose results are told in the section, then one destination for everyone.
  const shared =
    !sawFight && tests === 1 && !passTo && !failTo && extra.size === 0 && choices.length === 1
      ? sharedOutcome(units, segmented, testIndex, testRest, choiceAt[0]?.unit ?? -1, raw.number)
      : null;
  if (shared) {
    passTo = shared.to;
    failTo = shared.to;
    passEffects = shared.pass;
    failEffects = shared.fail;
    if (shared.keep) body.splice(choiceAt[0]?.body ?? body.length, 0, shared.keep);
    choices.length = 0;
  }

  if (sawFight) {
    if (!fightName) flags.push(FLAG.fightName);
    if (!validRounds(fightRounds)) flags.push(FLAG.fightRounds);
    if (fights > 1) flags.push(FLAG.fightTwice);
    if (extra.has("win")) flags.push(FLAG.winExtra);
    else if (!winTo) flags.push(FLAG.noWin);
    if (problems.has(FLAG.secondWin)) flags.push(FLAG.secondWin);
    // No lose link means losing ends the adventure, so that is not a flag.
    if (extra.has("lose")) flags.push(FLAG.loseExtra);
    if (problems.has(FLAG.secondLose)) flags.push(FLAG.secondLose);
  }
  if (sawTest) {
    if (tests === 0) flags.push(FLAG.noTest);
    if (tests > 1) flags.push(FLAG.testTwice);
    for (const flag of [FLAG.testModifier, FLAG.testSkill]) if (problems.has(flag)) flags.push(flag);
    if (extra.has("pass")) flags.push(FLAG.passExtra);
    else if (!passTo) flags.push(FLAG.noPass);
    if (problems.has(FLAG.secondPass)) flags.push(FLAG.secondPass);
    if (extra.has("fail")) flags.push(FLAG.failExtra);
    else if (!failTo) flags.push(FLAG.noFail);
    if (problems.has(FLAG.secondFail)) flags.push(FLAG.secondFail);
  }
  const modes = [sawFight, sawTest, choices.length > 0].filter(Boolean).length;
  if (modes > 1) flags.push(FLAG.mixedExits);
  if (!sawFight && !sawTest && choices.length === 0) flags.push(FLAG.noExits);
  if (problems.has(FLAG.tickCondition)) flags.push(FLAG.tickCondition);
  const ticksBox = [...passEffects, ...failEffects].some((effect) => effect.op === "tick");
  if (tickTo && !tickOnEnter && !ticksBox && !choices.some((choice) => choice.tick)) flags.push(FLAG.tickNever);
  const passage = passageText(body);
  if (!passage) flags.push("This section has no passage.");

  return {
    number: raw.number,
    title: "",
    passage,
    choices,
    testLabel,
    skill,
    testModifier: sawTest ? testModifier : "",
    passTo,
    failTo,
    passEffects,
    failEffects,
    fightName,
    fightRounds: validRounds(fightRounds) ? fightRounds : "",
    fightPenalty,
    winTo,
    loseTo,
    tickTo,
    tickOnEnter: Boolean(tickTo) && tickOnEnter,
    sawTest,
    sawFight,
    pageIndex: raw.pageIndex,
    flags,
    checked: false,
  };
}

/**
 * A win, lose, success or fail link. Returns its destination when the words between the
 * condition and "turn to N" are only flavour. A test link may also carry steps the draft can
 * store, such as "put a tick in the box above". Anything else is returned without a
 * destination, so the caller keeps it as a choice and flags the extra steps.
 */
function readOutcome(
  segment: string,
  sawFight: boolean,
  number: string,
): { kind: "win" | "lose" | "pass" | "fail"; to: string; effects: Effect[] } | { kind: "win" | "lose" | "pass" | "fail" } | null {
  const strict: [RegExp, "win" | "lose" | "pass" | "fail"][] = [
    [WIN, "win"],
    [LOSE, "lose"],
    [SUCCESS, "pass"],
    [FAIL, "fail"],
  ];
  for (const [pattern, kind] of strict) {
    const to = pattern.exec(segment)?.[1];
    if (to) return { kind, to, effects: [] };
  }
  const entry = OUTCOME_HEAD.find((candidate) => (!candidate.needsFight || sawFight) && candidate.head.test(segment));
  if (!entry) return null;
  const head = entry.head.exec(segment)?.[0] ?? "";
  const tail = OUTCOME_TAIL.exec(segment.slice(head.length));
  if (!tail?.[2]) return { kind: entry.kind };
  const steps = readEffects(tail[1] ?? "", number);
  const test = entry.kind === "pass" || entry.kind === "fail";
  // A fight result cannot hold steps yet. A test result can hold the ones the draft stores.
  if (MECHANICS.test(steps.rest) || (!test && steps.effects.length > 0)) return { kind: entry.kind };
  return { kind: entry.kind, to: tail[2], effects: steps.effects };
}

/** "If you survive, you press on." with no destination yet, and nothing but flavour. */
function winLead(unit: string): boolean {
  const entry = OUTCOME_HEAD.find((candidate) => candidate.kind === "win" && candidate.head.test(unit));
  if (!entry) return false;
  const rest = unit.slice(entry.head.exec(unit)?.[0].length ?? 0);
  if (!/^\s*(?:,|[.!?]?$)/.test(rest)) return false;
  return !MECHANICS.test(rest);
}

/** "Turn to N", or "Picking yourself up, turn to N": a destination with no condition. */
function bareLink(segment: string): boolean {
  const lead = segment.replace(TRAILING_TURN, "");
  return !/^\s*(?:to|or)\b/i.test(lead) && !MECHANICS.test(lead);
}

/**
 * "Test your Talent. If you succeed, you leap clear. If you fail, Take a Wound. If you are still
 * alive, turn to N." Both results go to N. Steps the draft can store go on each result. Returns
 * null when the shared link has a condition or a result names a step the draft cannot store.
 */
function sharedOutcome(
  units: readonly string[],
  segmented: readonly string[][],
  testIndex: number,
  testRest: string,
  linkIndex: number,
  number: string,
): { to: string; pass: Effect[]; fail: Effect[]; keep: string } | null {
  if (testIndex < 0 || linkIndex <= testIndex) return null;
  const segments = segmented[linkIndex] ?? [];
  const link = segments[0];
  if (segments.length !== 1 || !link) return null;
  const to = TURN.exec(link)?.[1];
  if (!to) return null;
  const lead = link.replace(SHARED_LEAD, "").replace(TRAILING_TURN, "");
  if (/^\s*(?:to|or)\b/i.test(lead)) return null;
  const both = readEffects(lead, number);
  if (MECHANICS.test(both.rest)) return null;

  const pass: Effect[] = [];
  const fail: Effect[] = [];
  let clauses = 0;
  for (let index = testIndex; index < linkIndex; index += 1) {
    const text = index === testIndex ? testRest : (units[index] ?? "");
    if (!text) continue;
    const marks = [...text.matchAll(CLAUSE)];
    if (marks.length === 0) {
      // Another condition in between, such as "If you have a rope", is more than this can hold.
      if (index > testIndex && /^if\b/i.test(text) && !SHARED_LEAD.test(text)) return null;
      continue;
    }
    if (index > testIndex && (marks[0]?.index ?? 0) > 0 && /\bif\b/i.test(text.slice(0, marks[0]?.index ?? 0))) return null;
    for (let mark = 0; mark < marks.length; mark += 1) {
      const found = marks[mark];
      if (!found) continue;
      const start = (found.index ?? 0) + found[0].length;
      const end = marks[mark + 1]?.index ?? text.length;
      const steps = readEffects(text.slice(start, end), number);
      if (MECHANICS.test(steps.rest)) return null;
      (/fail/i.test(found[0]) ? fail : pass).push(...steps.effects);
      clauses += 1;
    }
  }
  if (clauses === 0) return null;
  // Flavour on the shared link, such as "you climb out", stays in the passage.
  const keep = lead.trim() ? link : "";
  return { to, pass: [...pass, ...both.effects], fail: [...fail, ...both.effects], keep };
}

/** Steps the draft can store, in the order the text gives them, and the words left over. */
function readEffects(text: string, number: string): { effects: Effect[]; rest: string } {
  const found: { at: number; end: number; effect: Effect }[] = [];
  const amount = (word: string) => (word.toLowerCase() === "a" ? 1 : Number(countValue(word)));
  for (const match of text.matchAll(/\b(?:lose|deduct)\s+(a|one|two|three|\d+)\s+talent\b/gi)) {
    found.push({ at: match.index ?? 0, end: (match.index ?? 0) + match[0].length, effect: { op: "adjustStat", stat: "talent", by: -amount(match[1] ?? "1") } });
  }
  for (const match of text.matchAll(/\btake\s+(a|one|two|three|\d+)\s+wounds?\b/gi)) {
    found.push({ at: match.index ?? 0, end: (match.index ?? 0) + match[0].length, effect: { op: "adjustStat", stat: "vitality", by: -amount(match[1] ?? "1") } });
  }
  for (const match of text.matchAll(/\bgain the keyword ([A-Z][A-Za-z]{0,40})\b/gi)) {
    const word = match[1] ?? "";
    found.push({ at: match.index ?? 0, end: (match.index ?? 0) + match[0].length, effect: { op: "gainKeyword", id: word.toLowerCase(), label: word } });
  }
  for (const match of text.matchAll(/\b(?:put a tick in|tick) the box above\b/gi)) {
    found.push({ at: match.index ?? 0, end: (match.index ?? 0) + match[0].length, effect: boxTick(number) });
  }
  found.sort((a, b) => a.at - b.at);
  let rest = text;
  for (const entry of [...found].sort((a, b) => b.at - a.at)) rest = `${rest.slice(0, entry.at)} ${rest.slice(entry.end)}`;
  return { effects: found.map((entry) => entry.effect), rest };
}

function noteNumbering(sections: DraftSection[]): void {
  const counts = new Map<string, number>();
  for (const section of sections) counts.set(section.number, (counts.get(section.number) ?? 0) + 1);
  for (const section of sections) {
    if ((counts.get(section.number) ?? 0) > 1) push(section, "Duplicate section number.");
  }
  const unique = [...new Set(sections.map((section) => Number(section.number)))].sort((a, b) => a - b);
  const first = unique[0];
  if (first !== undefined && first !== 1) push(sections[0], "Numbering does not start at 1.");
  for (let index = 1; index < unique.length; index += 1) {
    const previous = unique[index - 1];
    const next = unique[index];
    if (previous === undefined || next === undefined || next - previous <= 1) continue;
    const skipped: string[] = [];
    for (let number = previous + 1; number < next; number += 1) skipped.push(String(number));
    push(
      sections.find((section) => section.number === String(next)),
      `Numbering skips ${skipped.join(", ")}.`,
    );
  }
}

function noteMissingDestinations(sections: DraftSection[]): void {
  const ids = new Set(sections.map((section) => section.number));
  for (const section of sections) {
    for (const destination of destinations(section)) {
      if (!ids.has(destination)) push(section, `Destination §${destination} does not exist.`);
    }
  }
}

function destinations(section: DraftSection): string[] {
  return [
    ...section.choices.map((choice) => choice.to),
    section.passTo,
    section.failTo,
    section.winTo,
    section.loseTo,
    section.tickTo,
  ].filter((destination) => destination !== "");
}

function buildSection(section: DraftSection, system: SystemDef): { ok: true; section: Section } | { ok: false; step: 5; error: string } {
  const number = section.number.trim();
  const body = passageBody(section.passage);
  if (!body) return { ok: false, step: 5, error: `Section ${number || "?"} needs a passage.` };
  // A fight needs a win section. With no lose section, losing ends the adventure.
  const fightOn = Boolean(section.fightName.trim() && section.winTo.trim() && validRounds(section.fightRounds));
  const testOn = Boolean(section.passTo.trim() && section.failTo.trim());
  const choices = section.choices.filter((choice) => choice.label.trim() || choice.to.trim());
  const filled = [fightOn, testOn, choices.length > 0].filter(Boolean).length;
  if (filled !== 1) {
    return { ok: false, step: 5, error: `Section ${number} needs one exit: choices, a test, or a fight.` };
  }
  const box = boxTick(number);
  const tickTo = section.tickTo.trim();
  const enter: SectionEnter | undefined = tickTo
    ? { jump: { when: { op: "ticked", id: box.id }, to: tickTo }, ...(section.tickOnEnter ? { effects: [box] } : {}) }
    : undefined;
  const base = {
    id: number,
    title: clip(section.title.trim(), 120),
    body,
    ...(enter ? { enter } : {}),
  };
  if (fightOn) {
    const id = bookSlug(section.fightName) === "imported-book" ? "fight" : bookSlug(section.fightName);
    const penalty = section.fightPenalty.trim() ? penaltyModifier(section.fightPenalty) : undefined;
    if (section.fightPenalty.trim() && penalty === undefined) {
      return { ok: false, step: 5, error: `Section ${number} has a fight penalty this format cannot store.` };
    }
    return {
      ok: true,
      section: {
        ...base,
        combat: {
          id,
          label: clip(section.fightName.trim(), 80),
          rounds: Number(section.fightRounds),
          dice: "2d6",
          stat: "talent",
          ...(penalty === undefined ? {} : { modifier: penalty }),
          wound: { stat: "vitality", amount: 1, defeatAtOrBelow: 0 },
          ...(section.loseTo.trim() ? { defeatSection: section.loseTo.trim() } : {}),
          then: section.winTo.trim(),
        },
      },
    };
  }
  if (testOn) {
    const named = TEST.exec(section.testLabel);
    const word = named?.[1];
    if (word && word.toLowerCase() !== "talent" && !system.skills.some((entry) => entry.label.toLowerCase() === word.toLowerCase())) {
      return { ok: false, step: 5, error: `Section ${number} names a skill this system does not include.` };
    }
    const label = clip(section.testLabel.trim() || "Test your Talent", 160);
    const modifier = section.testModifier.trim() ? penaltyModifier(section.testModifier) : undefined;
    if (section.testModifier.trim() && modifier === undefined) {
      return { ok: false, step: 5, error: `Section ${number} has a test modifier this format cannot store.` };
    }
    if (section.passEffects.length > 8 || section.failEffects.length > 8) {
      return { ok: false, step: 5, error: `Section ${number} has more test steps than this format can store.` };
    }
    return {
      ok: true,
      section: {
        ...base,
        test: {
          id: "test",
          label,
          dice: "2d6",
          stat: "talent",
          ...(modifier === undefined ? {} : { modifier }),
          ...(section.skill ? { skill: section.skill } : {}),
          success: { to: section.passTo.trim(), ...(section.passEffects.length ? { effects: section.passEffects } : {}) },
          failure: { to: section.failTo.trim(), ...(section.failEffects.length ? { effects: section.failEffects } : {}) },
        },
      },
    };
  }
  if (choices.length > 12) return { ok: false, step: 5, error: `Section ${number} has too many choices.` };
  const built = choices.map((choice, index) => ({
    id: `c${index + 1}`,
    label: clip(choice.label.trim(), 160),
    to: choice.to.trim(),
    ...(choice.tick && tickTo ? { effects: [box] } : {}),
  }));
  if (built.some((choice) => !choice.label || !choice.to)) {
    return { ok: false, step: 5, error: `Section ${number} has a choice without words or a destination.` };
  }
  return { ok: true, section: { ...base, choices: built } };
}

/** The box a section asks you to tick, named after the section: "box-12". */
function boxTick(number: string): Effect & { op: "tick" } {
  return { op: "tick", id: `box-${number}`, label: `§${number} box` };
}

function monsterName(units: readonly string[], winIndex: number): string {
  for (const unit of units) {
    const named = FIGHT_LINE.exec(unit)?.[1]?.trim() ?? "";
    if (named && /^[A-Z]/.test(named) && !/[.,;:!?]/.test(named) && !/\b(?:if|you|your)\b/i.test(named)) return named;
  }
  for (let index = winIndex - 1; index >= 0; index -= 1) {
    const line = units[index] ?? "";
    if (!line) continue;
    if (/^talent\b/i.test(line) || /^vitality\b/i.test(line)) continue;
    if (ROUNDS.test(line) || ROUNDS_AT.test(line) || LOSE.test(line) || WIN.test(line)) continue;
    if (/^if you\b/i.test(line) || TURN.test(line) || line.length > 40) continue;
    return line;
  }
  return "";
}

/**
 * Rejoin lines that a page wrapped in the middle of a sentence, so "turn to" and its
 * number stay together. A line ending in . ! ? or : ends a sentence. A short line, such
 * as an enemy's name or a stat line, stays on its own unless the next line plainly
 * continues it.
 */
export function logicalLines(lines: readonly string[]): string[] {
  const out: string[] = [];
  let previous = "";
  for (const raw of lines) {
    const line = tidyLine(raw);
    if (!line) {
      out.push("");
      previous = "";
      continue;
    }
    const last = out.length - 1;
    if (previous && last >= 0 && continues(previous, line)) out[last] = tidyLine(`${out[last]} ${line}`);
    else out.push(line);
    previous = line;
  }
  return out;
}

function continues(previous: string, next: string): boolean {
  if (/[.!?:]['"’”)]*$/.test(previous)) return false;
  if (/^[a-z(,;)]/.test(next)) return true;
  if (/(?:^|\s)(?:turn|turn to|to)$/i.test(previous)) return true;
  if (FIGHT_LINE.test(previous) || ROUNDS.test(previous) || ROUNDS_AT.test(previous)) return false;
  return previous.length >= 40;
}

/** Remove the stray spaces PDF text often leaves before punctuation, as in "turn to 12 ." */
function tidyLine(line: string): string {
  return line
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?)])/g, "$1")
    .replace(/\(\s+/g, "(")
    .trim();
}

/**
 * Split logical lines into sentences. Blank lines stay as paragraph breaks. A capital "If you"
 * straight after a lowercase word starts a new sentence too: a stat line such as
 * "Wolf Fight one round with Advantage if you can" has no full stop before "If you win".
 */
export function sentences(lines: readonly string[]): string[] {
  return lines.flatMap((line) =>
    line ? line.split(/(?<=[.!?]['"’”)]?)\s+(?=['"‘“(]?[A-Z])|(?<=[a-z])\s+(?=If you\b)/).filter(Boolean) : [""],
  );
}

/**
 * One piece per "turn to N" in a sentence, so "If you win, turn to 4. If you lose, turn to 9."
 * or "the door (turn to 4) or the stairs (turn to 9)" give two exits with their own words.
 */
function turnSegments(unit: string): string[] {
  const ends = [...unit.matchAll(TURNS)].map((match) => (match.index ?? 0) + match[0].length);
  if (ends.length === 0) return [];
  if (ends.length === 1) return [unit];
  const segments: string[] = [];
  let start = 0;
  ends.forEach((end, index) => {
    const stop = index === ends.length - 1 ? unit.length : end;
    const segment = unit
      .slice(start, stop)
      .replace(/^[\s,;]+/, "")
      .replace(/[\s,;]+$/, "");
    if (segment) segments.push(segment);
    start = stop;
  });
  return segments;
}

/**
 * "Test your X" is always a test. "Test X" counts only when X is Talent or a skill of this
 * system, so ordinary words such as "test the rope" are left alone. Quoted speech and
 * "test your skills" are never a test. A plain "at -2" is kept as the modifier. Other
 * modifiers, such as "with a +1 bonus if you have a keyword", cannot be stored yet.
 */
function findTest(
  unit: string,
  system: SystemDef,
): { skill: string; unknownSkill: boolean; modifier: string; unstorable: boolean; count: number; at: number; rest: string } | null {
  const named = [...withoutSpeech(unit).matchAll(/\btest (your )?([A-Za-z]+)/gi)].filter((found) => {
    const word = found[2]?.toLowerCase() ?? "";
    if (word === "skills" || word === "skill") return false;
    return Boolean(found[1]) || word === "talent" || system.skills.some((entry) => entry.label.toLowerCase() === word);
  });
  const match = named[0];
  const word = match?.[2]?.toLowerCase();
  if (!match || !word) return null;
  const known = system.skills.find((entry) => entry.label.toLowerCase() === word);
  const talent = word === "talent";
  const rest = unit.slice((match.index ?? 0) + match[0].length);
  const plain = /^\s*\(?\s*at\s*([−+-]\s*\d+)\b\s*\)?/i.exec(rest);
  const after = plain ? rest.slice(plain[0].length) : rest;
  const modifier = plain?.[1] ? normalizePenalty(plain[1].replace(/\s+/g, "")) : "";
  const unstorable = (Boolean(plain) && !modifier) || /^\s*,?\s*\(?\s*(?:at\s*[−+-]?\s*\d|with\b)/i.test(after);
  // "Test A or Test B", or "Test Swimming twice", is more than one test.
  const count = named.length + (/^\s*twice\b/i.test(after) ? 1 : 0);
  return { skill: known?.id ?? "", unknownSkill: !known && !talent, modifier, unstorable, count, at: match.index ?? 0, rest: after };
}

/** Blank out quoted speech, keeping positions, so "'Let's test your skills!' it says" is not a test. */
function withoutSpeech(unit: string): string {
  return unit.replace(/(^|[\s(])(['‘“].+?[.!?,]['’”])(?=\s|$)/g, (_all, lead: string, quote: string) => lead + " ".repeat(quote.length));
}

function countValue(raw: string): string {
  const word = NUMBER_WORDS.indexOf(raw.toLowerCase());
  return word >= 0 ? String(word) : raw;
}

function passageText(lines: readonly string[]): string {
  const paragraphs: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (!line.trim()) {
      if (current.length > 0) paragraphs.push(current.join(" "));
      current = [];
      continue;
    }
    current.push(line.trim());
  }
  if (current.length > 0) paragraphs.push(current.join(" "));
  return paragraphs.join("\n\n");
}

function passageBody(passage: string): string[] | null {
  const parts = passage
    .split(/\n\n+/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (parts.length < 1 || parts.length > 12) return null;
  if (parts.some((part) => part.length > 2000 || [...part].some((char) => char.charCodeAt(0) < 32))) return null;
  return parts;
}

function normalizePenalty(raw: string): string {
  const trimmed = raw.trim().replaceAll("−", "-");
  if (!/^[+-]?\d+$/.test(trimmed)) return "";
  if (trimmed.startsWith("+")) return `+${trimmed.slice(1)}`;
  const digits = trimmed.replace(/^-/, "");
  return digits === "0" ? "0" : `−${digits}`;
}

function validRounds(value: string): boolean {
  return /^[1-9]$/.test(value) || value === "10" || value === "11" || value === "12";
}

function push(section: DraftSection | undefined, flag: string): void {
  if (!section || section.flags.includes(flag)) return;
  section.flags.push(flag);
}

function clip(value: string, max: number): string {
  return clean(value, max);
}

function clean(value: string, max: number): string {
  const text = [...value].filter((char) => char.charCodeAt(0) >= 32).join("").trim();
  return text.length <= max ? text : text.slice(0, max);
}
