import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { demoSystem } from "../../src/format/demo";
import { countDraft, draftToBook, formatCounts, structurePages } from "../../src/format/structure-book";

const copper = readFileSync(new URL("../fixtures/convert/copper-lantern.txt", import.meta.url), "utf8");

function pagesFrom(text: string) {
  return text.split("\f").map((page, index) => ({ ref: `Page ${index + 1}`, text: page.trim() }));
}

describe("section structuring", () => {
  it("structures the original sample and flags the missing destination", () => {
    const draft = structurePages(pagesFrom(copper), { title: "The Copper Lantern", author: "Original sample" }, demoSystem);
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
    expect(broken?.flags).toContain("Destination §9 does not exist.");
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
      { title: "Edge", author: "Original sample" },
      demoSystem,
    );
    const byNumber = (number: string) => draft.sections.filter((section) => section.number === number);
    expect(byNumber("2")).toHaveLength(2);
    expect(byNumber("2")[0]?.flags).toEqual(expect.arrayContaining(["Duplicate section number.", "Numbering does not start at 1."]));
    expect(byNumber("4")[0]?.flags).toContain("Unparsed test.");
    expect(byNumber("4")[0]?.flags).toContain("Numbering skips 3.");
    expect(byNumber("6")[0]?.flags).toContain("Unparsed fight.");
    expect(byNumber("8")[0]?.flags).toContain("A ticked box needs a name before it can be a condition.");
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
      { title: "Climb", author: "Original sample" },
      demoSystem,
    );
    expect(draft.sections[0]?.skill).toBe("climbing");
    expect(draft.sections[0]?.flags).toEqual([]);
    const built = draftToBook(draft, demoSystem);
    expect(built.ok).toBe(true);
    if (built.ok) expect(built.book.sections[0]?.test?.skill).toBe("climbing");
  });
});
