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
  winTo: string;
  loseTo: string;
  sawTest: boolean;
  sawFight: boolean;
  pageIndex: number;
  flags: string[];
  checked: boolean;
}

export interface DraftBook {
  title: string;
  author: string;
  pages: SourcePage[];
  sections: DraftSection[];
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

const HEADER = /^(\d{1,4})\.\s*$/;
const WIN = /if you win(?: the fight)?,?\s*turn to (\d+)/i;
const LOSE = /if you (?:are defeated|lose),?\s*turn to (\d+)/i;
const ROUNDS = /fight for (\d+) rounds/i;
const TEST = /test your ([A-Za-z]+)/i;
const SUCCESS = /if you are successful,?\s*turn to (\d+)/i;
const FAIL = /if you fail,?\s*turn to (\d+)/i;
const TICK = /if the box above is ticked,?\s*turn to (\d+)/i;
const TURN = /turn to (\d+)/i;

/** Turn extracted pages into a draft. Uncertain structure is flagged, not guessed. */
export function structurePages(
  pages: readonly SourcePage[],
  meta: { title: string; author: string },
  system: SystemDef,
): DraftBook {
  const raws: { number: string; lines: string[]; pageIndex: number }[] = [];
  let current: { number: string; lines: string[]; pageIndex: number } | null = null;
  pages.forEach((page, pageIndex) => {
    for (const line of page.text.split(/\n/)) {
      const header = HEADER.exec(line.trim());
      if (header?.[1]) {
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
  const trimmed = raw.lines.map((line) => line.trim());
  const winIndex = trimmed.findIndex((line) => WIN.test(line));
  const sawFight = winIndex >= 0 || trimmed.some((line) => LOSE.test(line) || ROUNDS.test(line));
  const fightName = winIndex >= 0 ? monsterName(trimmed, winIndex) : "";
  const winLine = winIndex >= 0 ? trimmed[winIndex] ?? "" : "";
  const winTo = WIN.exec(winLine)?.[1] ?? "";
  let loseTo = "";
  let fightRounds = "";
  let sawTest = false;
  let testLabel = "";
  let skill = "";
  let unknownSkill = false;
  let passTo = "";
  let failTo = "";
  let ticked = false;
  const choices: DraftChoice[] = [];
  const body: string[] = [];

  for (const line of trimmed) {
    if (!line) {
      body.push("");
      continue;
    }
    const lose = LOSE.exec(line);
    if (lose?.[1]) {
      loseTo = lose[1];
      continue;
    }
    const rounds = ROUNDS.exec(line);
    if (rounds?.[1]) {
      fightRounds = rounds[1];
      continue;
    }
    if (WIN.test(line)) continue;
    if (sawFight && (/^talent\b/i.test(line) || /^vitality\b/i.test(line) || line === fightName)) continue;
    const tested = TEST.exec(line);
    if (tested?.[1]) {
      sawTest = true;
      testLabel = clip(line, 160);
      const known = system.skills.find((entry) => entry.label.toLowerCase() === tested[1]?.toLowerCase());
      if (known) skill = known.id;
      else if (tested[1].toLowerCase() !== "talent") unknownSkill = true;
      body.push(line);
      continue;
    }
    const success = SUCCESS.exec(line);
    if (success?.[1]) {
      passTo = success[1];
      continue;
    }
    const failure = FAIL.exec(line);
    if (failure?.[1]) {
      failTo = failure[1];
      continue;
    }
    const tick = TICK.exec(line);
    if (tick?.[1]) {
      ticked = true;
      choices.push({ label: clip(line, 160), to: tick[1] });
      continue;
    }
    const turn = TURN.exec(line);
    if (turn?.[1]) {
      choices.push({ label: clip(line, 160), to: turn[1] });
      continue;
    }
    body.push(line);
  }

  if (sawFight && (!fightName || !winTo || !loseTo || !validRounds(fightRounds))) flags.push("Unparsed fight.");
  if (sawTest && (unknownSkill || !passTo || !failTo)) flags.push("Unparsed test.");
  const modes = [sawFight, sawTest, choices.length > 0].filter(Boolean).length;
  if (modes > 1) flags.push("This section has more than one kind of exit.");
  if (!sawFight && !sawTest && choices.length === 0) flags.push("This section has no exits.");
  if (ticked) flags.push("A ticked box needs a name before it can be a condition.");
  const passage = passageText(body);
  if (!passage) flags.push("This section has no passage.");

  return {
    number: raw.number,
    title: `Section ${raw.number}`,
    passage,
    choices,
    testLabel,
    skill,
    passTo,
    failTo,
    fightName,
    fightRounds: validRounds(fightRounds) ? fightRounds : "",
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
    title: clip(section.title.trim() || `Section ${number}`, 120),
    body,
  };
  if (fightOn) {
    const id = bookSlug(section.fightName) === "imported-book" ? "fight" : bookSlug(section.fightName);
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

function monsterName(lines: readonly string[], winIndex: number): string {
  for (let index = winIndex - 1; index >= 0; index -= 1) {
    const line = lines[index] ?? "";
    if (!line) continue;
    if (/^talent\b/i.test(line) || /^vitality\b/i.test(line)) continue;
    if (ROUNDS.test(line) || LOSE.test(line) || WIN.test(line)) continue;
    if (/^if you\b/i.test(line) || TURN.test(line) || line.length > 40) continue;
    return line;
  }
  return "";
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
