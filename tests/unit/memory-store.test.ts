import { describe, expect, it } from "vitest";
import { demoBook, demoSystem } from "../../src/format/demo";
import { startSession } from "../../src/engine/rules";
import { createMemoryStore } from "../../src/storage/memory";
import { SAVE_VERSION } from "../../src/storage/types";

describe("memory save store", () => {
  it("round-trips a session and isolates later edits", async () => {
    const store = createMemoryStore();
    const session = startSession(demoBook, demoSystem);
    await store.save("demo", { version: SAVE_VERSION, savedAt: "2026-11-07T00:00:00.000Z", session, bookmarks: [] });
    session.state.sectionId = "7";
    const loaded = await store.load("demo");
    expect(loaded?.session.state.sectionId).toBe("1");
    await store.clear("demo");
    expect(await store.load("demo")).toBeNull();
  });
});
