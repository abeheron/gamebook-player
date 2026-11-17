import type { Book, Section, SystemDef } from "./types";
import { BookValidationError, validateBook } from "./validate";

export interface SourcePage {
  ref: string;
  text: string;
}

export interface DraftChoice {
  label: string;
  to: string;
}

/** A section the reader can correct before it is stored. */
export interface DraftSection {
  number: string;
  title: string;
  passage: string;
  choices: DraftChoice[];
  testLabel: string;
  skill: string;
  passTo: string;
  failTo: string;
  fightName: string;
  fightRounds: string;
  /** Signed penalty, such as "−2". Empty when the text gives none. */
  fightPenalty: string;
  winTo: string;
  loseTo: string;
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
const TICK = /\bthe box above is ticked,?\s*turn to (\d+)/i;
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
    if (flag === "Unparsed test.") {
      placed.test.push(flag);
      continue;
    }
    if (flag === "Unparsed fight.") {
      placed.fight.push(flag);
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
    if (flag.startsWith("A ticked box")) {
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
  let winTo = "";
  let loseTo = "";
  let fightRounds = "";
  let fightPenalty = "";
  let sawTest = false;
  let tests = 0;
  let testLabel = "";
  let skill = "";
  let unclearTest = false;
  let passTo = "";
  let failTo = "";
  let ticked = false;
  let unclearFight = false;
  const choices: DraftChoice[] = [];
  const body: string[] = [];

  units.forEach((unit, index) => {
    if (!unit) {
      body.push("");
      return;
    }
    const roundsAt = ROUNDS_AT.exec(unit);
    const rounds = roundsAt ?? ROUNDS.exec(unit);
    if (rounds?.[1]) {
      fightRounds = countValue(rounds[1]);
      if (roundsAt?.[2]) fightPenalty = normalizePenalty(roundsAt[2]);
      const rest = unit.replace(rounds[0], "").replace(fightName, "").replace(/[\s.,;:]+/g, "");
      if (!rest) return;
    }
    if (sawFight && (/^talent\b/i.test(unit) || /^vitality\b/i.test(unit) || unit === fightName)) return;
    const test = findTest(unit, system);
    if (test) {
      sawTest = true;
      tests += 1;
      testLabel = clip(unit, 160);
      skill = test.skill;
      if (test.unclear) unclearTest = true;
    }
    const segments = segmented[index] ?? [];
    if (test || segments.length === 0) body.push(unit);
    for (const segment of segments) {
      const win = WIN.exec(segment);
      if (win?.[1] && !winTo) {
        winTo = win[1];
        continue;
      }
      if (win?.[1]) unclearFight = true;
      const lose = LOSE.exec(segment);
      if (lose?.[1] && !loseTo) {
        loseTo = lose[1];
        continue;
      }
      if (lose?.[1]) unclearFight = true;
      const success = SUCCESS.exec(segment);
      if (success?.[1] && !passTo) {
        passTo = success[1];
        continue;
      }
      if (success?.[1]) unclearTest = true;
      const failure = FAIL.exec(segment);
      if (failure?.[1] && !failTo) {
        failTo = failure[1];
        continue;
      }
      if (failure?.[1]) unclearTest = true;
      const to = TURN.exec(segment)?.[1] ?? "";
      if (TICK.test(segment)) ticked = true;
      choices.push({ label: clip(segment, 160), to });
    }
  });
  if ((passTo || failTo) && !sawTest) sawTest = true;

  if (sawFight && (unclearFight || !fightName || !winTo || !loseTo || !validRounds(fightRounds))) flags.push("Unparsed fight.");
  if (sawTest && (unclearTest || tests !== 1 || !passTo || !failTo)) flags.push("Unparsed test.");
  const modes = [sawFight, sawTest, choices.length > 0].filter(Boolean).length;
  if (modes > 1) flags.push("This section has more than one kind of exit.");
  if (!sawFight && !sawTest && choices.length === 0) flags.push("This section has no exits.");
  if (ticked) flags.push("A ticked box needs a name before it can be a condition.");
  const passage = passageText(body);
  if (!passage) flags.push("This section has no passage.");

  return {
    number: raw.number,
    title: "",
    passage,
    choices,
    testLabel,
    skill,
    passTo,
    failTo,
    fightName,
    fightRounds: validRounds(fightRounds) ? fightRounds : "",
    fightPenalty,
    winTo,
    loseTo,
    sawTest,
    sawFight,
    pageIndex: raw.pageIndex,
    flags,
    checked: false,
  };
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
  ].filter((destination) => destination !== "");
}

function buildSection(section: DraftSection, system: SystemDef): { ok: true; section: Section } | { ok: false; step: 5; error: string } {
  const number = section.number.trim();
  const body = passageBody(section.passage);
  if (!body) return { ok: false, step: 5, error: `Section ${number || "?"} needs a passage.` };
  const fightOn = Boolean(section.fightName.trim() && section.winTo.trim() && section.loseTo.trim() && validRounds(section.fightRounds));
  const testOn = Boolean(section.passTo.trim() && section.failTo.trim());
  const choices = section.choices.filter((choice) => choice.label.trim() || choice.to.trim());
  const filled = [fightOn, testOn, choices.length > 0].filter(Boolean).length;
  if (filled !== 1) {
    return { ok: false, step: 5, error: `Section ${number} needs one exit: choices, a test, or a fight.` };
  }
  const base = {
    id: number,
    title: clip(section.title.trim(), 120),
    body,
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
          defeatSection: section.loseTo.trim(),
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
    return {
      ok: true,
      section: {
        ...base,
        test: {
          id: "test",
          label,
          dice: "2d6",
          stat: "talent",
          ...(section.skill ? { skill: section.skill } : {}),
          success: { to: section.passTo.trim() },
          failure: { to: section.failTo.trim() },
        },
      },
    };
  }
  if (choices.length > 12) return { ok: false, step: 5, error: `Section ${number} has too many choices.` };
  const built = choices.map((choice, index) => ({
    id: `c${index + 1}`,
    label: clip(choice.label.trim(), 160),
    to: choice.to.trim(),
  }));
  if (built.some((choice) => !choice.label || !choice.to)) {
    return { ok: false, step: 5, error: `Section ${number} has a choice without words or a destination.` };
  }
  return { ok: true, section: { ...base, choices: built } };
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

/** Split logical lines into sentences. Blank lines stay as paragraph breaks. */
export function sentences(lines: readonly string[]): string[] {
  return lines.flatMap((line) => (line ? line.split(/(?<=[.!?]['"’”)]?)\s+(?=['"‘“(]?[A-Z])/).filter(Boolean) : [""]));
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
 * system, so ordinary words such as "test the rope" are left alone. A modifier such as
 * "at -2" or "with a bonus" cannot be stored on a draft test yet, so it keeps the test flagged.
 */
function findTest(unit: string, system: SystemDef): { skill: string; unclear: boolean } | null {
  const match = /\btest (your )?([A-Za-z]+)/i.exec(unit);
  const word = match?.[2]?.toLowerCase();
  if (!match || !word) return null;
  const known = system.skills.find((entry) => entry.label.toLowerCase() === word);
  const talent = word === "talent";
  if (!match[1] && !known && !talent) return null;
  const after = unit.slice((match.index ?? 0) + match[0].length);
  const modifier = /^\s*\(?\s*(?:at\s*[−+-]?\d|with\b)/i.test(after);
  return { skill: known?.id ?? "", unclear: (!known && !talent) || modifier };
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
