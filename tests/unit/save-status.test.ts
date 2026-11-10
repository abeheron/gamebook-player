import { describe, expect, it } from "vitest";
import { formatSaveClock, noteKind, readSaveHook, SAVING_DELAY_MS } from "../../src/ui/save-status";

describe("save status note", () => {
  it("formats the local time of a successful save as hours and minutes", () => {
    expect(formatSaveClock(new Date(2026, 10, 9, 9, 36))).toBe("09:36");
    expect(formatSaveClock(new Date(2026, 10, 9, 0, 0))).toBe("00:00");
    expect(formatSaveClock(new Date(2026, 10, 9, 23, 5))).toBe("23:05");
  });

  it("keeps a fast write on the previous note and shows Saving only after the delay", () => {
    expect(SAVING_DELAY_MS).toBe(300);
    expect(noteKind("idle", true, 0)).toBe("idle");
    expect(noteKind("idle", true, 299)).toBe("idle");
    expect(noteKind("saved", true, 299)).toBe("saved");
    expect(noteKind("failed", true, 299)).toBe("failed");
    expect(noteKind("saved", true, 300)).toBe("saving");
    expect(noteKind("failed", true, 800)).toBe("saving");
    expect(noteKind("failed", false, 800)).toBe("failed");
    expect(noteKind("saved", false, 0)).toBe("saved");
  });

  it("reads the test-only delay and failure flags", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
    };
    expect(readSaveHook(null)).toEqual({ delayMs: 0, fail: false });
    expect(readSaveHook(storage)).toEqual({ delayMs: 0, fail: false });
    values.set("gbp-save-delay", "800");
    values.set("gbp-save-fail", "1");
    expect(readSaveHook(storage)).toEqual({ delayMs: 800, fail: true });
    values.set("gbp-save-delay", "nope");
    values.set("gbp-save-fail", "0");
    expect(readSaveHook(storage)).toEqual({ delayMs: 0, fail: false });
  });
});
