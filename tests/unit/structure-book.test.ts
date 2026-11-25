import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { demoSystem } from "../../src/format/demo";
import { adventureOver, choose, currentSection, rollCombatRound, rollTest, startSession, visibleChoices } from "../../src/engine/rules";
import { fixtureCharacter } from "../../src/engine/creation";
import {
  FLAG,
  countDraft,
  draftToBook,
  flaggedNotice,
  formatCounts,
  listLabel,
  logicalLines,
  placeFlags,
  sentences,
  sourcePageHeading,
  structurePages,
} from "../../src/format/structure-book";

const copper = readFileSync(new URL("../fixtures/convert/copper-lantern.txt", import.meta.url), "utf8");

function pagesFrom(text: string) {
  return text.split("\f").map((page, index) => ({ ref: `Page ${index + 1}`, text: page.trim() }));
}

describe("section structuring", () => {
  it("structures the original sample and flags the missing destination", () => {
    const draft = structurePages(pagesFrom(copper), { title: "The Copper Lantern", author: "Original sample", source: "pdf" }, demoSystem);
    const counts = countDraft(draft);
    expect(counts).toEqual({ sections: 5, flagged: 1, choices: 4, tests: 1, fights: 1, missingDestinations: 1 });
    expect(formatCounts(counts)).not.toContain("lantern");
    const fight = draft.sections.find((section) => section.number === "5");
    expect(fight?.fightName).toBe("PAPER MOTH");
    expect(fight?.fightRounds).toBe("2");
    expect(fight?.winTo).toBe("4");
    expect(fight?.loseTo).toBe("3");
    expect(fight?.flags).toEqual([]);
    const broken = draft.sections.find((section) => section.number === "4");
    expect(broken?.title).toBe("");
    expect(broken?.flags).toContain("Destination §9 does not exist.");
    if (broken) expect(placeFlags(broken).choices[0]).toContain("Destination §9 does not exist.");
    expect(listLabel("4", broken?.passage ?? "")).toBe("§4 The landing is empty.");
    expect(sourcePageHeading("Page 4", "pdf")).toBe("Page 4 of this PDF");
    expect(flaggedNotice(1)).toBe("Add to library stays unavailable while 1 section is still flagged.");
    expect(flaggedNotice(2)).toBe("Add to library stays unavailable while 2 sections are still flagged.");
    expect(broken?.choices[0]?.to).toBe("9");
    const test = draft.sections.find((section) => section.number === "2");
    expect(test?.sawTest).toBe(true);
    expect(test?.skill).toBe("");
    expect(test?.passTo).toBe("4");
    expect(test?.failTo).toBe("3");

    const blocked = draftToBook(draft, demoSystem);
    expect(blocked.ok).toBe(false);
    const fixed = structuredClone(draft);
    const section = fixed.sections.find((entry) => entry.number === "4");
    if (!section?.choices[0]) throw new Error("missing choice");
    section.choices[0].to = "5";
    section.flags = [];
    const built = draftToBook(fixed, demoSystem);
    expect(built.ok).toBe(true);
    if (built.ok) {
      expect(built.book.id).toBe("the-copper-lantern");
      expect(built.book.sections[0]?.title).toBe("");
      expect(built.book.sections).toHaveLength(5);
      expect(built.book.sections.find((entry) => entry.id === "5")?.combat?.label).toBe("PAPER MOTH");
      expect(built.book.sections.find((entry) => entry.id === "2")?.test?.stat).toBe("talent");
    }
  });

  it("flags gaps, duplicates, an unknown skill, a partial fight, a tick, and a dead end", () => {
    const draft = structurePages(
      [
        {
          ref: "Page 1",
          text: [
            "2.",
            "The path is marked.",
            "Turn to 4.",
            "2.",
            "The same number comes again.",
            "Turn to 4.",
            "4.",
            "Test your Luck.",
            "If you are successful, turn to 2.",
            "6.",
            "A door.",
            "If you win, turn to 2.",
            "8.",
            "If the box above is ticked, turn to 2.",
            "10.",
            "The room is quiet.",
          ].join("\n"),
        },
      ],
      { title: "Edge", author: "Original sample", source: "pdf" },
      demoSystem,
    );
    const byNumber = (number: string) => draft.sections.filter((section) => section.number === number);
    expect(byNumber("2")).toHaveLength(2);
    expect(byNumber("2")[0]?.flags).toEqual(expect.arrayContaining(["Duplicate section number.", "Numbering does not start at 1."]));
    expect(byNumber("4")[0]?.flags).toEqual(expect.arrayContaining([FLAG.testSkill, FLAG.noFail]));
    expect(byNumber("4")[0]?.flags).not.toContain(FLAG.noPass);
    expect(byNumber("4")[0]?.flags).toContain("Numbering skips 3.");
    expect(byNumber("6")[0]?.flags).toContain(FLAG.fightRounds);
    if (byNumber("6")[0]) expect(placeFlags(byNumber("6")[0]!).fight).toEqual([FLAG.fightRounds]);
    expect(byNumber("6")[0]?.flags).not.toContain(FLAG.noWin);
    expect(byNumber("8")[0]?.tickTo).toBe("2");
    expect(byNumber("8")[0]?.flags).toContain(FLAG.tickNever);
    expect(byNumber("10")[0]?.flags).toContain("This section has no exits.");
    expect(countDraft(draft).missingDestinations).toBe(0);
  });

  it("keeps a known skill on a test", () => {
    const draft = structurePages(
      [
        {
          ref: "Page 1",
          text: ["1.", "The wall is steep. Test your Climbing.", "If you are successful, turn to 2.", "If you fail, turn to 2.", "2.", "You are down.", "Turn to 1."].join("\n"),
        },
      ],
      { title: "Climb", author: "Original sample", source: "pdf" },
      demoSystem,
    );
    expect(draft.sections[0]?.skill).toBe("climbing");
    expect(draft.sections[0]?.flags).toEqual([]);
    const built = draftToBook(draft, demoSystem);
    expect(built.ok).toBe(true);
    if (built.ok) expect(built.book.sections[0]?.test?.skill).toBe("climbing");
  });

  it("reads a fight penalty from rounds at a minus", () => {
    const draft = structurePages(
      [
        {
          ref: "Page 1",
          text: ["1.", "A moth blocks the step.", "MOTH", "3 rounds at −2.", "If you win, turn to 2.", "If you are defeated, turn to 2.", "2.", "The step is clear.", "Turn to 1."].join("\n"),
        },
      ],
      { title: "Moth", author: "Original sample", source: "pdf" },
      demoSystem,
    );
    const fight = draft.sections[0];
    expect(fight?.fightName).toBe("MOTH");
    expect(fight?.fightRounds).toBe("3");
    expect(fight?.fightPenalty).toBe("−2");
    expect(fight?.flags).toEqual([]);
    const built = draftToBook(draft, demoSystem);
    expect(built.ok).toBe(true);
    if (built.ok) expect(built.book.sections[0]?.combat?.modifier).toBe(-2);
  });

  it("names a ticked box after its section and wires its jump", () => {
    const draft = structurePages(
      [
        {
          ref: "Page 1",
          text: ["1.", "If the box above is ticked, turn to 2.", "If not, put a tick there now and read on.", "A box is here.", "Turn to 2.", "2.", "Onward.", "Turn to 1."].join("\n"),
        },
      ],
      { title: "Box", author: "Original sample", source: "pdf" },
      demoSystem,
    );
    const box = draft.sections[0];
    expect(box?.tickTo).toBe("2");
    expect(box?.tickOnEnter).toBe(true);
    expect(box?.choices).toEqual([{ label: "Turn to 2.", to: "2" }]);
    expect(box?.passage).toBe("If the box above is ticked, turn to 2. If not, put a tick there now and read on. A box is here.");
    expect(box?.flags).toEqual([]);
    const book = draftToBook(draft, demoSystem);
    expect(book.ok).toBe(true);
    if (book.ok) {
      expect(book.book.sections[0]?.enter).toEqual({
        jump: { when: { op: "ticked", id: "box-1" }, to: "2" },
        effects: [{ op: "tick", id: "box-1", label: "§1 box" }],
      });
      expect(book.book.sections[0]?.choices).toEqual([{ id: "c1", label: "Turn to 2.", to: "2" }]);
    }
  });
});

function draftOf(...lines: string[]) {
  return structurePages([{ ref: "Page 1", text: lines.join("\n") }], { title: "Sample", author: "Original sample", source: "pdf" }, demoSystem);
}

function section(draft: ReturnType<typeof draftOf>, number: string) {
  const found = draft.sections.find((entry) => entry.number === number);
  if (!found) throw new Error(`missing §${number}`);
  return found;
}

describe("wrapped and crowded PDF lines", () => {
  it("reads a header with a space before the dot, but not a destination wrapped onto its own line", () => {
    const draft = draftOf(
      "1 .",
      "The canal is narrow here. If you want to follow the towpath, turn to",
      "3 .",
      "Otherwise, turn",
      "to 2 .",
      "2 .",
      "A heron watches you.",
      "Turn to 3.",
      "3.",
      "The lock gate creaks.",
      "Turn to 1.",
    );
    expect(draft.sections.map((entry) => entry.number)).toEqual(["1", "2", "3"]);
    expect(section(draft, "1").choices).toEqual([
      { label: "If you want to follow the towpath, turn to 3.", to: "3" },
      { label: "Otherwise, turn to 2.", to: "2" },
    ]);
    expect(section(draft, "1").passage).toBe("The canal is narrow here.");
    expect(countDraft(draft)).toMatchObject({ sections: 3, flagged: 0, choices: 4, missingDestinations: 0 });
  });

  it("keeps a choice whole when its words wrap over lines", () => {
    const draft = draftOf(
      "1.",
      "If you would rather climb the bell tower and look out over the",
      "Saltmarsh, turn to 2.",
      "If you have a brass whistle and want to blow it, turn",
      "to 2.",
      "2.",
      "Gulls wheel overhead.",
      "Turn to 1.",
    );
    expect(section(draft, "1").choices.map((choice) => choice.label)).toEqual([
      "If you would rather climb the bell tower and look out over the Saltmarsh, turn to 2.",
      "If you have a brass whistle and want to blow it, turn to 2.",
    ]);
  });

  it("splits two links that share a line or a sentence", () => {
    const draft = draftOf(
      "1.",
      "You could take the ferry (turn to 2 ) or wade across the ford",
      "(turn to 3 ).",
      "2.",
      "The ferry rocks. If you have a coin, turn to 3 ; if not, turn to 1 .",
      "3.",
      "Dry land at last.",
      "Turn to 1.",
    );
    expect(section(draft, "1").choices).toEqual([
      { label: "You could take the ferry (turn to 2)", to: "2" },
      { label: "or wade across the ford (turn to 3).", to: "3" },
    ]);
    expect(section(draft, "2").choices).toEqual([
      { label: "If you have a coin, turn to 3", to: "3" },
      { label: "if not, turn to 1.", to: "1" },
    ]);
    expect(section(draft, "2").passage).toBe("The ferry rocks.");
    expect(section(draft, "2").flags).toEqual([]);
  });

  it("keeps a narrative sentence in the passage when a link shares its line", () => {
    const draft = draftOf("1.", "You thank the miller and step outside. Turn to 2 .", "2.", "Rain.", "Turn to 1.");
    expect(section(draft, "1").passage).toBe("You thank the miller and step outside.");
    expect(section(draft, "1").choices).toEqual([{ label: "Turn to 2.", to: "2" }]);
  });

  it("does not join a short name line to the stat line under it", () => {
    expect(logicalLines(["Old badger", "Fight one round", "If you win, turn to 2 ."])).toEqual(["Old badger", "Fight one round", "If you win, turn to 2."]);
    expect(sentences(["One. 'Two,' she says. Three?", "", "Four."])).toEqual(["One.", "'Two,' she says.", "Three?", "", "Four."]);
  });
});

describe("test and fight wording", () => {
  it("reads 'Test Skill' and 'If you succeed' on one line", () => {
    const draft = draftOf(
      "1.",
      "The hedge maze twists back on itself. Test Tracking .",
      "If you succeed, turn to 2 . If you fail, turn to 3 .",
      "2.",
      "Out.",
      "Turn to 1.",
      "3.",
      "Lost.",
      "Turn to 1.",
    );
    const maze = section(draft, "1");
    expect(maze.sawTest).toBe(true);
    expect(maze.skill).toBe("tracking");
    expect(maze.passTo).toBe("2");
    expect(maze.failTo).toBe("3");
    expect(maze.flags).toEqual([]);
    const built = draftToBook(draft, demoSystem);
    expect(built.ok).toBe(true);
    if (built.ok) expect(built.book.sections[0]?.test?.success?.to).toBe("2");
  });

  it("does not treat an ordinary use of 'test' as a test", () => {
    const draft = draftOf("1.", "You test the rope before trusting it.", "Turn to 2.", "2.", "Fine.", "Turn to 1.");
    expect(section(draft, "1").sawTest).toBe(false);
    expect(section(draft, "1").flags).toEqual([]);
  });

  it("keeps a plain 'at -N' modifier, but flags a keyword bonus the draft cannot hold", () => {
    const draft = draftOf(
      "1.",
      "Test your Talent at -2.",
      "If you succeed, turn to 2. If you fail, turn to 2.",
      "2.",
      "Test Diplomacy with a +1 bonus if you have a seal.",
      "If you succeed, turn to 1. If you fail, turn to 1.",
      "3.",
      "Test Occult (with a +1 bonus if you have the keyword Lamp), and if you succeed, turn to 1. If you fail, turn to 2.",
      "4.",
      "Test Search at +1. If you succeed, turn to 1. If you fail, turn to 2.",
    );
    expect(section(draft, "1").flags).toEqual([]);
    expect(section(draft, "1").testModifier).toBe("−2");
    expect(section(draft, "4").testModifier).toBe("+1");
    expect(section(draft, "2").flags).toEqual([FLAG.testModifier]);
    expect(section(draft, "3").flags).toEqual([FLAG.testModifier]);
    expect(placeFlags(section(draft, "2")).test).toEqual([FLAG.testModifier]);
    const fixed = structuredClone(draft);
    for (const entry of fixed.sections) entry.flags = [];
    const built = draftToBook(fixed, demoSystem);
    if (!built.ok) throw new Error(built.error);
    expect(built.book.sections[0]?.test?.modifier).toBe(-2);
    expect(built.book.sections[3]?.test?.modifier).toBe(1);
    expect(built.book.sections[1]?.test?.modifier).toBeUndefined();
  });

  it("keeps every link when a section holds more than one test", () => {
    const draft = draftOf(
      "1.",
      "To climb, Test Climbing and if you are successful, turn to 2.",
      "To swim, Test Swimming and if you are successful, turn to 3.",
      "2.",
      "Up.",
      "Turn to 1.",
      "3.",
      "Across.",
      "Turn to 1.",
    );
    const both = section(draft, "1");
    expect(both.passTo).toBe("2");
    expect(both.choices.map((choice) => choice.to)).toEqual(["3"]);
    expect(both.flags).toContain(FLAG.testTwice);
    expect(both.flags).toContain(FLAG.noFail);
    expect(placeFlags(both)).toMatchObject({ test: [FLAG.testTwice], fail: [FLAG.noFail], pass: [FLAG.secondPass] });
  });

  it("reads an enemy on its stat line, with rounds in words and a penalty", () => {
    const draft = draftOf(
      "1.",
      "Something stirs in the reeds. You must fight:",
      "Marsh troll Fight two rounds at -1",
      "If you survive, turn to 2 .",
      "2.",
      "The reeds fall still.",
      "Turn to 1.",
    );
    const fight = section(draft, "1");
    expect(fight.sawFight).toBe(true);
    expect(fight.fightName).toBe("Marsh troll");
    expect(fight.fightRounds).toBe("2");
    expect(fight.fightPenalty).toBe("−1");
    expect(fight.winTo).toBe("2");
    expect(fight.choices).toEqual([]);
    expect(fight.passage).toBe("Something stirs in the reeds. You must fight:");
    // No defeat destination: losing ends the adventure, so nothing is flagged.
    expect(fight.loseTo).toBe("");
    expect(fight.flags).toEqual([]);
    const built = draftToBook(draft, demoSystem);
    expect(built.ok).toBe(true);
    if (built.ok) {
      expect(built.book.sections[0]?.combat?.then).toBe("2");
      expect(built.book.sections[0]?.combat).not.toHaveProperty("defeatSection");
    }
  });

  it("keeps flagging a ticked-box link that depends on an earlier link", () => {
    // "If not, but" follows another condition, so jumping on arrival could skip that link.
    const draft = draftOf("1.", "A hut.", "If you hold a lantern, turn to 2.", "If not, but the box above is ticked, turn to 2.", "Turn to 2.", "2.", "End.", "Turn to 1.");
    expect(section(draft, "1").tickTo).toBe("");
    expect(section(draft, "1").flags).toEqual([FLAG.tickCondition]);
    expect(placeFlags(section(draft, "1")).choices[1]).toEqual([FLAG.tickCondition]);
  });
});


describe("fight condition words stay visible", () => {
  it("keeps condition words on the same line as the rounds", () => {
    const draft = draftOf(
      "1.",
      "A heron stabs at you:",
      "Grey heron Fight two rounds with Advantage if you carry a net",
      "If you win, turn to 2 .",
      "2.",
      "Calm water.",
      "Turn to 1.",
    );
    const fight = section(draft, "1");
    expect(fight.fightName).toBe("Grey heron");
    expect(fight.fightRounds).toBe("2");
    expect(fight.winTo).toBe("2");
    expect(fight.passage).toBe("A heron stabs at you: Grey heron Fight two rounds with Advantage if you carry a net");
    expect(fight.flags).toEqual([]);
  });

  it("keeps condition words that wrap onto the next line", () => {
    const draft = draftOf(
      "1.",
      "The kite swoops:",
      "Red kite Fight one round with Disadvantage unless you can",
      "shout a warding word, or if you hold a long pole",
      "If you win, turn to 2 .",
      "2.",
      "The sky clears.",
      "Turn to 1.",
    );
    const fight = section(draft, "1");
    expect(fight.fightName).toBe("Red kite");
    expect(fight.winTo).toBe("2");
    expect(fight.passage).toBe(
      "The kite swoops: Red kite Fight one round with Disadvantage unless you can shout a warding word, or if you hold a long pole",
    );
    expect(fight.flags).toEqual([]);
    const built = draftToBook(draft, demoSystem);
    expect(built.ok).toBe(true);
    if (built.ok) expect(built.book.sections[0]?.body.join(" ")).toContain("if you hold a long pole");
  });

  it("keeps condition words after a short name line above 'Fight one round'", () => {
    const draft = draftOf(
      "1.",
      "A shape rises from the bog.",
      "Bog wraith",
      "Fight one round with Advantage if you carry a torch",
      "If you win, turn to 2 .",
      "2.",
      "Mist.",
      "Turn to 1.",
    );
    const fight = section(draft, "1");
    expect(fight.fightName).toBe("Bog wraith");
    expect(fight.fightRounds).toBe("1");
    expect(fight.passage).toBe("A shape rises from the bog. Fight one round with Advantage if you carry a torch");
    expect(fight.flags).toEqual([]);
  });

  it("still drops a bare name and rounds line, which the fight already shows", () => {
    const draft = draftOf("1.", "A rat bites.", "Cellar rat Fight one round", "If you win, turn to 2 .", "2.", "Quiet.", "Turn to 1.");
    expect(section(draft, "1").passage).toBe("A rat bites.");
  });
});

describe("specific flag reasons", () => {
  it("names the missing, doubled, or overloaded win link and places it under Win", () => {
    const draft = draftOf(
      "1.",
      "A goat charges.",
      "Hill goat Fight two rounds",
      "2.",
      "A crab snaps.",
      "Shore crab Fight one round",
      "If you win, turn to 1. If you win, turn to 3.",
      "3.",
      "A boar.",
      "Boar Fight one round",
      "If you survive, add one to your score and turn to 1.",
      "If you lose, turn to 2. If you are defeated, turn to 1.",
    );
    expect(section(draft, "1").flags).toEqual([FLAG.noWin]);
    expect(placeFlags(section(draft, "1")).win).toEqual([FLAG.noWin]);
    expect(section(draft, "2").flags).toEqual(expect.arrayContaining([FLAG.secondWin]));
    expect(placeFlags(section(draft, "2")).win).toEqual([FLAG.secondWin]);
    const boar = section(draft, "3");
    expect(boar.flags).toEqual(expect.arrayContaining([FLAG.winExtra, FLAG.secondLose]));
    expect(boar.flags).not.toContain(FLAG.noWin);
    expect(placeFlags(boar)).toMatchObject({ win: [FLAG.winExtra], lose: [FLAG.secondLose], fight: [] });
  });

  it("never flags a fight only because it has no lose link", () => {
    const draft = draftOf("1.", "An eel.", "Pond eel Fight one round", "If you win, turn to 2.", "2.", "Done.", "Turn to 1.");
    expect(section(draft, "1").flags).toEqual([]);
    expect(draft.sections.flatMap((entry) => entry.flags)).not.toContain("No section to turn to if you lose.");
  });
});

describe("a ticked box with a fight", () => {
  const lines = [
    "1.",
    "A ford.",
    "Turn to 2.",
    "2.",
    "If the box above is ticked, turn to 4.",
    "If not, put a tick there now and read on.",
    "A gnat swarm rises:",
    "Gnat swarm Fight one round",
    "If you win, turn to 3.",
    "3.",
    "The swarm is gone.",
    "Turn to 1.",
    "4.",
    "Only the ford remains.",
    "Turn to 1.",
  ];

  it("ticks on the first visit, plays the fight, and takes the jump on a later visit", () => {
    const draft = draftOf(...lines);
    expect(section(draft, "2").flags).toEqual([]);
    const built = draftToBook(draft, demoSystem);
    if (!built.ok) throw new Error(built.error);
    const book = built.book;
    const always = () => 0;

    let session = startSession(book, demoSystem, fixtureCharacter(demoSystem));
    session = choose(session, book, demoSystem, "c1");
    expect(currentSection(book, session).id).toBe("2");
    expect(session.state.ticks["box-2"]).toEqual({ label: "§2 box", count: 1 });
    session = rollCombatRound(session, book, demoSystem, always);
    expect(currentSection(book, session).id).toBe("3");

    session = choose(session, book, demoSystem, "c1");
    session = choose(session, book, demoSystem, "c1");
    expect(currentSection(book, session).id).toBe("4");
    expect(session.state.ticks["box-2"]?.count).toBe(1);
  });

  it("ticks through the choice that says so when the section does not tick on arrival", () => {
    const draft = draftOf(
      "1.",
      "If the box above is ticked, turn to 3.",
      "A vase sits on a plinth.",
      "If you lift the vase, put a tick in the box above and turn to 2.",
      "If you leave it, turn to 3.",
      "2.",
      "It is heavy.",
      "Turn to 1.",
      "3.",
      "A quiet hall.",
      "Turn to 1.",
    );
    const vase = section(draft, "1");
    expect(vase.tickOnEnter).toBe(false);
    expect(vase.flags).toEqual([]);
    const built = draftToBook(draft, demoSystem);
    if (!built.ok) throw new Error(built.error);
    const book = built.book;
    expect(book.sections[0]?.enter).toEqual({ jump: { when: { op: "ticked", id: "box-1" }, to: "3" } });
    let session = startSession(book, demoSystem, fixtureCharacter(demoSystem));
    expect(currentSection(book, session).id).toBe("1");
    expect(visibleChoices(currentSection(book, session), session.state).map((choice) => choice.id)).toEqual(["c1", "c2"]);
    session = choose(session, book, demoSystem, "c1");
    expect(session.state.ticks["box-1"]?.count).toBe(1);
    session = choose(session, book, demoSystem, "c1");
    expect(currentSection(book, session).id).toBe("3");
  });

  it("ends the adventure when a fight with no lose link is lost", () => {
    const draft = draftOf(...lines);
    const built = draftToBook(draft, demoSystem);
    if (!built.ok) throw new Error(built.error);
    const book = built.book;
    let session = startSession(book, demoSystem, fixtureCharacter(demoSystem));
    session = choose(session, book, demoSystem, "c1");
    session.state.stats.vitality = 1;
    session = rollCombatRound(session, book, demoSystem, () => 0.99);
    expect(currentSection(book, session).id).toBe("2");
    expect(session.state.stats.vitality).toBe(0);
    expect(session.state.pending).toBeNull();
    expect(adventureOver(book, session.state)).toBe(true);
    expect(() => rollCombatRound(session, book, demoSystem, () => 0)).toThrow("The adventure is over.");
  });
});

describe("a test told in the section, then one shared destination", () => {
  it("sends both results to the shared link and puts the lost Talent on the fail branch", () => {
    const draft = draftOf(
      "1.",
      "The plank bends under you. Test your Talent.",
      "If you succeed, you hop across lightly. If you fail, you bang your knee; deduct one Talent.",
      "Turn to 2.",
      "2.",
      "The far bank.",
      "Turn to 1.",
    );
    const plank = section(draft, "1");
    expect(plank.flags).toEqual([]);
    expect(plank.choices).toEqual([]);
    expect(plank).toMatchObject({ passTo: "2", failTo: "2", passEffects: [], failEffects: [{ op: "adjustStat", stat: "talent", by: -1 }] });
    const built = draftToBook(draft, demoSystem);
    if (!built.ok) throw new Error(built.error);
    expect(built.book.sections[0]?.test).toMatchObject({
      success: { to: "2" },
      failure: { to: "2", effects: [{ op: "adjustStat", stat: "talent", by: -1 }] },
    });
    expect(built.book.sections[0]?.choices).toBeUndefined();
    const failed = rollTest(startSession(built.book, demoSystem, fixtureCharacter(demoSystem)), built.book, demoSystem, () => 0.99, [6, 6]);
    expect(currentSection(built.book, failed).id).toBe("2");
    expect(failed.state.stats.talent).toBe(8);
  });

  it("reads Wounds on either branch, a plain modifier, and 'If you are still alive'", () => {
    const draft = draftOf(
      "1.",
      "Hail drums on the roof. Test your Talent at -3; if you succeed, you only Take one Wound, but if you fail, you Take two Wounds.",
      "If you are still alive, you shelter in the porch; turn to 2.",
      "2.",
      "Dry at last.",
      "Turn to 1.",
    );
    const hail = section(draft, "1");
    expect(hail.flags).toEqual([]);
    expect(hail).toMatchObject({
      testModifier: "−3",
      passTo: "2",
      failTo: "2",
      passEffects: [{ op: "adjustStat", stat: "vitality", by: -1 }],
      failEffects: [{ op: "adjustStat", stat: "vitality", by: -2 }],
    });
    // The words of the shared link stay readable in the passage.
    expect(hail.passage).toContain("you shelter in the porch");
    const built = draftToBook(draft, demoSystem);
    if (!built.ok) throw new Error(built.error);
    expect(built.book.sections[0]?.test?.modifier).toBe(-3);
  });

  it("puts a keyword and a tick from the shared link on both branches", () => {
    const draft = draftOf(
      "1.",
      "The ferryman eyes your purse. Test Diplomacy.",
      "If you succeed, he grins. If you fail, he sulks and you must Take a Wound.",
      "Gain the keyword Oar, put a tick in the box above and turn to 2.",
      "2.",
      "Across the river.",
      "Turn to 1.",
    );
    const ferry = section(draft, "1");
    expect(ferry.flags).toEqual([]);
    const shared = [
      { op: "gainKeyword", id: "oar", label: "Oar" },
      { op: "tick", id: "box-1", label: "§1 box" },
    ];
    expect(ferry.passEffects).toEqual(shared);
    expect(ferry.failEffects).toEqual([{ op: "adjustStat", stat: "vitality", by: -1 }, ...shared]);
    expect(draftToBook(draft, demoSystem).ok).toBe(true);
  });

  it("leaves the cases it cannot wire flagged", () => {
    const draft = draftOf(
      // A test beside several ordinary choices now wires (P32), with the Wound on the fail branch.
      "1.",
      "Test your Talent. If you fail, you Take a Wound.",
      "If you want to go north, turn to 2.",
      "If you want to go south, turn to 3.",
      // Two alternative tests.
      "2.",
      "You can either Test Climbing to scale it, or Test Swimming to go round.",
      "If you fail both, lose one Talent.",
      "Turn to 1.",
      // A test that leads into a fight.
      "3.",
      "Test Stealth. If you fail, you fight with Disadvantage.",
      "Marsh troll Fight two rounds",
      "If you win, turn to 1.",
      // A keyword bonus.
      "4.",
      "Test Occult with a +1 bonus if you have the keyword Lamp.",
      "If you succeed, you feel calm. If you fail, lose one Talent.",
      "Turn to 1.",
      // A result the draft cannot store.
      "5.",
      "Test Diplomacy. If you succeed, she pays you two gold pieces.",
      "Turn to 1.",
    );
    expect(section(draft, "1").flags).toEqual([]);
    expect(section(draft, "1").failEffects).toEqual([{ op: "adjustStat", stat: "vitality", by: -1 }]);
    for (const number of ["2", "3"]) {
      expect(section(draft, number).flags).toEqual(expect.arrayContaining([FLAG.mixedExits]));
      expect(section(draft, number).passTo).toBe("");
    }
    expect(section(draft, "2").flags).toContain(FLAG.testTwice);
    expect(section(draft, "4").flags).toEqual([FLAG.testModifier]);
    // The gold cannot be stored, so the success result stays flagged. The rest is a test with a choice.
    expect(section(draft, "5").flags).toEqual([FLAG.passExtra]);
    expect(section(draft, "5").passTo).toBe("");
  });
});

describe("a test with plain choices beside it (P32)", () => {
  it("stores a success jump, a fail-only choice, and always-open choices", () => {
    const draft = draftOf(
      "1.",
      "Reeds hide a small boat. Test Naturalist and if you succeed, turn to 2.",
      "If you fail and want to push off anyway, turn to 3.",
      "If you want to wade along the bank, turn to 4.",
      "If you have the keyword Oar, turn to 5.",
      "Otherwise, you walk back to the road; turn to 6.",
      "2.", "A.", "Turn to 1.",
      "3.", "B.", "Turn to 1.",
      "4.", "C.", "Turn to 1.",
      "5.", "D.", "Turn to 1.",
      "6.", "E.", "Turn to 1.",
    );
    const reeds = section(draft, "1");
    expect(reeds.flags).toEqual([]);
    expect(reeds).toMatchObject({ passTo: "2", failTo: "", skill: "naturalist" });
    expect(reeds.choices.map((choice) => [choice.to, Boolean(choice.failOnly)])).toEqual([
      ["3", true],
      ["4", false],
      ["5", false],
      ["6", false],
    ]);
    const built = draftToBook(draft, demoSystem);
    if (!built.ok) throw new Error(built.error);
    const first = built.book.sections[0];
    expect(first?.test).toMatchObject({ skill: "naturalist", success: { to: "2" } });
    expect(first?.test?.failure).toBeUndefined();
    expect(first?.choices?.map((choice) => choice.when ?? null)).toEqual([{ op: "testFailed" }, null, null, null]);
  });

  it("makes every option of 'If you fail, you can either … or …' fail-only", () => {
    const draft = draftOf(
      "1.",
      "A plum tree leans over the wall. Test Naturalist, and if you succeed turn to 2.",
      "If you fail, you can either pick a plum (turn to 3)",
      "or climb the wall (turn to 4).",
      "2.", "A.", "Turn to 1.",
      "3.", "B.", "Turn to 1.",
      "4.", "C.", "Turn to 1.",
    );
    const plum = section(draft, "1");
    expect(plum.flags).toEqual([]);
    expect(plum.choices.map((choice) => [choice.to, choice.failOnly])).toEqual([
      ["3", true],
      ["4", true],
    ]);
    expect(draftToBook(draft, demoSystem).ok).toBe(true);
  });

  it("keeps a search that may be skipped, with no fail wording, beside the other way on", () => {
    const draft = draftOf(
      "1.",
      "Dust covers the shelves. If you want to search the shelves, Test Search and if you are successful, turn to 2.",
      "Otherwise, you leave by the far door; turn to 3.",
      "2.", "A.", "Turn to 1.",
      "3.", "B.", "Turn to 1.",
    );
    const shelves = section(draft, "1");
    expect(shelves.flags).toEqual([]);
    expect(shelves.flags).not.toContain(FLAG.noFail);
    expect(shelves.choices.map((choice) => choice.failOnly ?? false)).toEqual([false]);
  });

  it("stores a complete test beside a leave-instead choice", () => {
    const draft = draftOf(
      "1.",
      "A chest sits under the window. If you want to open it, Test Larceny; if you succeed, turn to 2, but if you fail, turn to 3.",
      "If you would rather leave it alone, turn to 4.",
      "2.", "A.", "Turn to 1.",
      "3.", "B.", "Turn to 1.",
      "4.", "C.", "Turn to 1.",
    );
    const chest = section(draft, "1");
    expect(chest.flags).toEqual([]);
    expect(chest).toMatchObject({ passTo: "2", failTo: "3" });
    const built = draftToBook(draft, demoSystem);
    if (!built.ok) throw new Error(built.error);
    expect(built.book.sections[0]?.test).toMatchObject({ success: { to: "2" }, failure: { to: "3" } });
    expect(built.book.sections[0]?.choices?.map((choice) => choice.to)).toEqual(["4"]);
  });

  it("stores both results in the section, with their steps, then the choices", () => {
    const draft = draftOf(
      "1.",
      "Thorns fill the gap in the hedge. Test your Talent at -1.",
      "If you succeed, you slip through untouched, but if you fail you Take a Wound and deduct one Talent.",
      "If you are still alive, you look around the garden.",
      "If you want to go to the pond, turn to 2.",
      "If you would rather go to the shed, turn to 3.",
      "2.", "A.", "Turn to 1.",
      "3.", "B.", "Turn to 1.",
    );
    const thorns = section(draft, "1");
    expect(thorns.flags).toEqual([]);
    expect(thorns).toMatchObject({
      passTo: "",
      failTo: "",
      testModifier: "−1",
      passEffects: [],
      failEffects: [
        { op: "adjustStat", stat: "vitality", by: -1 },
        { op: "adjustStat", stat: "talent", by: -1 },
      ],
    });
    const built = draftToBook(draft, demoSystem);
    if (!built.ok) throw new Error(built.error);
    const test = built.book.sections[0]?.test;
    expect(test?.success).toBeUndefined();
    expect(test?.failure).toEqual({ effects: thorns.failEffects });
    expect(built.book.sections[0]?.choices).toHaveLength(2);
  });

  it("keeps a result step the draft cannot store flagged, without calling it mixed", () => {
    const draft = draftOf(
      "1.",
      "A cold draught. Test Occult; if you succeed, you keep warm, but if you fail, the draught chills you to the bone.",
      "If you want to go on, turn to 2.",
      "If you want to go back, turn to 3.",
      "2.", "A.", "Turn to 1.",
      "3.", "B.", "Turn to 1.",
    );
    // "Chills you to the bone" is flavour; a step the draft cannot store is flagged.
    expect(section(draft, "1").flags).toEqual([]);
    const loss = draftOf(
      "1.",
      "A cold draught. Test Occult; if you succeed, you keep warm, but if you fail, the cold steals one Talent from you.",
      "If you want to go on, turn to 2.",
      "If you want to go back, turn to 3.",
      "2.", "A.", "Turn to 1.",
      "3.", "B.", "Turn to 1.",
    );
    expect(section(loss, "1").flags).toEqual([FLAG.failExtra]);
  });

  it("keeps a keyword bonus flagged but no longer calls a test with choices mixed", () => {
    const draft = draftOf(
      "1.",
      "Runes cover the arch. To read them, Test Linguistics (with a +1 bonus if you have the keyword Chalk), and if you succeed, turn to 2.",
      "If you want to walk through the arch, turn to 3.",
      "2.", "A.", "Turn to 1.",
      "3.", "B.", "Turn to 1.",
    );
    expect(section(draft, "1").flags).toEqual([FLAG.testModifier]);
  });

  it("leaves a die-roll table, an either/or test, and a test into a fight flagged as before", () => {
    const draft = draftOf(
      "1.",
      "Mud grips your boots. Test your Talent. If you succeed, you pull free, but if you fail you lose one Talent.",
      "Roll one die to see what you meet next.",
      "If you roll 1-3, turn to 2.",
      "If you roll 4-6, turn to 3.",
      "2.",
      "To cross, you will either need to Test Climbing successfully, or use a rope.",
      "If you can do either, turn to 3.",
      "If you cannot, turn to 1.",
      "3.",
      "Test Stealth. If you fail, you must fight.",
      "Bog toad Fight one round",
      "If you win, turn to 1.",
      "If you would rather run, turn to 2.",
    );
    expect(section(draft, "1").flags).toEqual(expect.arrayContaining([FLAG.mixedExits, FLAG.noPass, FLAG.noFail]));
    expect(section(draft, "2").flags).toContain(FLAG.mixedExits);
    expect(section(draft, "3").flags).toContain(FLAG.mixedExits);
  });

  it("does not let a fail-only option stand in for a fail link beside a fight", () => {
    const draft = draftOf(
      "1.",
      "Test Stealth and if you succeed, turn to 2.",
      "If you fail and want to fight the guard, turn to 3.",
      "Guard Fight one round",
      "If you win, turn to 2.",
      "2.", "A.", "Turn to 1.",
      "3.", "B.", "Turn to 1.",
    );
    const guard = section(draft, "1");
    expect(guard.flags).toEqual(expect.arrayContaining([FLAG.failExtra, FLAG.mixedExits]));
    expect(guard.choices.every((choice) => !choice.failOnly)).toBe(true);
  });
});

describe("near-miss destination wording", () => {
  it("accepts flavour before 'turn to N' and close win wording", () => {
    const draft = draftOf(
      "1.",
      "It snarls.",
      "Bog hound Fight one round",
      "If you win, you shake the mud from your boots; turn to 2.",
      "2.",
      "It hisses.",
      "Reed cat Fight one round",
      "If you overcome the cat, turn to 3.",
      "3.",
      "It roars.",
      "Hill giant Fight three rounds at -4",
      "If by some chance you win, turn to 4.",
      "4.",
      "It dives.",
      "Storm crow Fight two rounds",
      "If you survive this onslaught, turn to 5.",
      "5.",
      "It wakes.",
      "Cave bear Fight one round",
      "If you defeat the bear, you must still find the way out; turn to 6.",
      "6.",
      "It rises.",
      "Ash wraith Fight one round",
      "If you survive, the wraith fades into the walls. The air warms again.",
      "Turn to 1.",
    );
    expect(draft.sections.map((entry) => [entry.winTo, entry.flags])).toEqual([
      ["2", []],
      ["3", []],
      ["4", []],
      ["5", []],
      ["6", []],
      ["1", []],
    ]);
    expect(section(draft, "6").passage).toContain("The air warms again.");
  });

  it("accepts flavour on a test result", () => {
    const draft = draftOf(
      "1.",
      "Test Climbing.",
      "If you succeed, you reach the ledge and rest; turn to 2.",
      "If you fail, you slide back into the reeds; turn to 3.",
      "2.",
      "Up.",
      "Turn to 1.",
      "3.",
      "Down.",
      "Turn to 1.",
    );
    expect(section(draft, "1")).toMatchObject({ passTo: "2", failTo: "3", flags: [] });
  });

  it("still flags a real extra step on a fight or an extra option on a test", () => {
    const draft = draftOf(
      "1.",
      "Bog hound Fight one round",
      "If you win, put a tick in the box above and turn to 2.",
      "2.",
      "Reed cat Fight one round",
      "If you win, you can either take the bridge (turn to 1)",
      "or wade the ford (turn to 3).",
      "3.",
      "Rope ghost Fight one round",
      "If you win and are heading north, turn to 1.",
      "4.",
      "Test Naturalist and if you succeed, turn to 1.",
      "If you fail and want to taste the berries anyway, turn to 2.",
    );
    for (const number of ["1", "2", "3"]) expect(section(draft, number).flags).toContain(FLAG.winExtra);
    // P32: a fail option on a test is a fail-only choice, not an extra step.
    expect(section(draft, "4").flags).toEqual([]);
    expect(section(draft, "4").choices).toEqual([{ label: "If you fail and want to taste the berries anyway, turn to 2.", to: "2", failOnly: true }]);
  });

  it("stores a tick on the success branch and keeps the ticked-box jump", () => {
    const draft = draftOf(
      "1.",
      "If the box above is ticked, turn to 3. If not, read on.",
      "A loose tile glints; this could be a trap, so Test Larceny.",
      "If you succeed, put a tick in the box above and turn to 2. If you fail, turn to 3.",
      "2.",
      "Safe.",
      "Turn to 1.",
      "3.",
      "Ouch.",
      "Turn to 1.",
    );
    const tile = section(draft, "1");
    expect(tile.flags).toEqual([]);
    expect(tile).toMatchObject({ tickTo: "3", passTo: "2", failTo: "3", passEffects: [{ op: "tick", id: "box-1", label: "§1 box" }], failEffects: [] });
    const built = draftToBook(draft, demoSystem);
    if (!built.ok) throw new Error(built.error);
    expect(built.book.sections[0]).toMatchObject({
      enter: { jump: { when: { op: "ticked", id: "box-1" }, to: "3" } },
      test: { skill: "larceny", success: { to: "2", effects: [{ op: "tick", id: "box-1", label: "§1 box" }] }, failure: { to: "3" } },
    });
  });

  it("does not read quoted speech or 'test your skills' as a test", () => {
    const draft = draftOf(
      "1.",
      "The ogre laughs. 'Let's test your skills then!' it roars, and charges:",
      "Ogre Fight two rounds",
      "If you survive this onslaught, turn to 2.",
      "2.",
      "'Test your Talent, they always say,' mutters the guard.",
      "Turn to 1.",
    );
    expect(section(draft, "1")).toMatchObject({ sawTest: false, winTo: "2", flags: [] });
    expect(section(draft, "2")).toMatchObject({ sawTest: false, flags: [] });
  });
});
