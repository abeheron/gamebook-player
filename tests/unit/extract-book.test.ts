import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { demoSystem } from "../../src/format/demo";
import { convertBytes, PROTECTED_EPUB, SCANNED_PDF, UNREADABLE, useNodePdf, xhtmlToText } from "../../src/format/extract-book";
import { countDraft, formatCounts } from "../../src/format/structure-book";

const require = createRequire(import.meta.url);
useNodePdf(
  pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")).href,
  new URL("./", pathToFileURL(require.resolve("pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf"))).href,
);

const dir = new URL("../fixtures/convert/", import.meta.url);

describe("file extraction", () => {
  it("reads the original PDF and EPUB down to the same counts", async () => {
    const pdf = await convertBytes(readFileSync(new URL("copper-lantern.pdf", dir)), "copper-lantern.pdf", demoSystem);
    const epub = await convertBytes(readFileSync(new URL("paper-moth.epub", dir)), "paper-moth.epub", demoSystem);
    expect(pdf.ok).toBe(true);
    expect(epub.ok).toBe(true);
    if (!pdf.ok || !epub.ok) return;
    expect(pdf.draft.title).toBe("The Copper Lantern");
    expect(epub.draft.title).toBe("The Paper Moth");
    expect(countDraft(pdf.draft)).toEqual(countDraft(epub.draft));
    expect(formatCounts(countDraft(pdf.draft))).not.toContain("moth");
    expect(pdf.draft.pages).toHaveLength(5);
  });

  it("rejects a scanned PDF, a protected EPUB, and a file that is neither", async () => {
    const scanned = await convertBytes(readFileSync(new URL("scanned.pdf", dir)), "scanned.pdf", demoSystem);
    const locked = await convertBytes(readFileSync(new URL("protected.epub", dir)), "protected.epub", demoSystem);
    const other = await convertBytes(readFileSync(new URL("unreadable.bin", dir)), "notes.txt", demoSystem);
    expect(scanned).toEqual({ ok: false, step: 2, error: SCANNED_PDF });
    expect(locked).toEqual({ ok: false, step: 2, error: PROTECTED_EPUB });
    expect(other).toEqual({ ok: false, step: 2, error: UNREADABLE });
  });

  it("keeps XHTML lines without the tags", () => {
    const text = xhtmlToText("<html><body><p>1.</p><p>Turn to 2.</p></body></html>");
    expect(text).toBe("1.\nTurn to 2.");
    expect(text).not.toContain("<");
  });
});
