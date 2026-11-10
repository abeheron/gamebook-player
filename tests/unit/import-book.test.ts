import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { demoSystem } from "../../src/format/demo";
import { importBookText } from "../../src/format/import-book";

const valid = readFileSync(new URL("../fixtures/imported-stair.json", import.meta.url), "utf8");
const invalid = readFileSync(new URL("../fixtures/imported-invalid.json", import.meta.url), "utf8");
const other = readFileSync(new URL("../fixtures/imported-other-system.json", import.meta.url), "utf8");

describe("book import", () => {
  it("accepts a JSON book for the bundled system", () => {
    const result = importBookText(valid, demoSystem, []);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.book.title).toBe("Imported stair");
  });

  it("reports schema errors and does not return a book", () => {
    const result = importBookText(invalid, demoSystem, []);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.step).toBe(2);
      expect(result.errors[0]).toMatch(/choices|test|combat/);
    }
  });

  it("rejects a system this app does not include", () => {
    const result = importBookText(other, demoSystem, []);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.step).toBe(3);
      expect(result.errors[0]).toMatch(/fighting-fantasy/);
    }
  });

  it("does not add a book id that is already in the library", () => {
    const result = importBookText(valid, demoSystem, ["imported-stair"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.step).toBe(4);
  });

  it("rejects a file that is not JSON at the schema step", () => {
    const result = importBookText("title: nope", demoSystem, []);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.step).toBe(2);
  });
});
