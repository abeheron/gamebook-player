import { describe, expect, it } from "vitest";
import { canRestore } from "../../src/engine/restore";
import { startSession } from "../../src/engine/rules";
import { demoBook, demoSystem } from "../../src/format/demo";
import { migrateSave } from "../../src/storage/migrate";
import { SAVE_VERSION } from "../../src/storage/types";

describe("save migration", () => {
  it("gives a version 1 save the sample skills, 10gp, and a ration", () => {
    const earlier = {
      sectionId: "1",
      stats: { talent: 9, vitality: 3, fortune: 3 },
      items: [],
      keywords: [],
      ticks: {},
      rolls: [],
      pending: null,
    };
    const saved = migrateSave(
      {
        version: 1,
        savedAt: "2026-11-08T00:00:00.000Z",
        session: {
          bookId: demoBook.id,
          state: {
            sectionId: "2",
            stats: { talent: 9, vitality: 3, fortune: 3 },
            items: [{ id: "lantern", label: "Lantern" }],
            keywords: [],
            ticks: { "landing-box": { label: "Landing box", count: 1 } },
            rolls: [],
            pending: null,
          },
          undo: [earlier],
        },
      },
      demoSystem,
      demoBook,
    );
    expect(saved?.version).toBe(SAVE_VERSION);
    expect(saved?.savedAt).toBe("2026-11-08T00:00:00.000Z");
    expect(saved?.session.state.sectionId).toBe("2");
    expect(saved?.session.state.skills).toEqual([
      { id: "climbing", bonus: 2 },
      { id: "linguistics", bonus: 2 },
    ]);
    expect(saved?.session.state.gold).toBe(10);
    expect(saved?.session.state.items.map((item) => item.id)).toEqual(["ration", "lantern"]);
    expect(saved?.session.state.ticks["landing-box"]?.count).toBe(1);
    expect(saved?.session.undo[0]?.items.map((item) => item.id)).toEqual(["ration"]);
    expect(saved?.session.undo[0]?.gold).toBe(10);
    expect(saved?.bookmarks).toEqual([]);
    expect(saved && canRestore(saved.session, demoBook, demoSystem)).toBe(true);
  });

  it("does not add the ration again to a version 2 save", () => {
    const session = startSession(demoBook, demoSystem);
    session.state.items = session.state.items.filter((item) => item.id !== "ration");
    const saved = migrateSave(
      { version: 2, savedAt: "2026-11-09T00:00:00.000Z", session },
      demoSystem,
      demoBook,
    );
    expect(saved?.version).toBe(SAVE_VERSION);
    expect(saved?.bookmarks).toEqual([]);
    expect(saved?.session.state.items).toEqual([]);
    expect(saved?.session.state.gold).toBe(10);
    expect(saved?.session.state.skills.map((skill) => skill.id)).toEqual(["climbing", "linguistics"]);
  });

  it("keeps version 3 bookmarks and rejects an unknown section", () => {
    const session = startSession(demoBook, demoSystem);
    const saved = migrateSave(
      { version: 3, savedAt: "2026-11-09T00:00:00.000Z", session, bookmarks: ["2"] },
      demoSystem,
      demoBook,
    );
    expect(saved?.bookmarks).toEqual(["2"]);
    expect(migrateSave({ version: 3, savedAt: "2026-11-09T00:00:00.000Z", session, bookmarks: ["99"] }, demoSystem, demoBook)).toBeNull();
    expect(migrateSave({ version: 4, savedAt: "2026-11-09T00:00:00.000Z", session, bookmarks: [] }, demoSystem, demoBook)).toBeNull();
    expect(migrateSave({ version: 1, session }, demoSystem, demoBook)).toBeNull();
  });
});
