import { expect, test } from "@playwright/test";
import { FIXTURE_URL } from "./support/fixture";
import { readFileSync } from "node:fs";
import { addCopperLantern } from "./support/sample-import";

const pdf = {
  name: "copper-lantern.pdf",
  mimeType: "application/pdf",
  buffer: readFileSync(new URL("../fixtures/convert/copper-lantern.pdf", import.meta.url)),
};
const scanned = {
  name: "scanned.pdf",
  mimeType: "application/pdf",
  buffer: readFileSync(new URL("../fixtures/convert/scanned.pdf", import.meta.url)),
};
const epub = {
  name: "paper-moth.epub",
  mimeType: "application/epub+zip",
  buffer: readFileSync(new URL("../fixtures/convert/paper-moth.epub", import.meta.url)),
};

test("converts a PDF through review, then an EPUB, and removes a book", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(FIXTURE_URL);
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await page.getByTestId("side-library").click();
  await expect(page.getByTestId("import-drop")).toContainText("Drop a book file (PDF or EPUB)");
  await expect(page.getByTestId("library")).toContainText("converted on this device, then you review the result before it is added");
  await expect(page.getByTestId("library")).not.toContainText("YAML");
  await expect(page.getByTestId("library-book-lantern-stair")).toHaveCount(0);
  await expect(page.getByTestId("library")).not.toContainText("The Lantern Stair");
  await expect(page.getByTestId("library-empty")).toHaveText("No books yet. Import a book file to start.");
  await expect(page.getByTestId("book-title")).toHaveText("The Lantern Stair");
  await expect(page.getByTestId("undo")).toHaveCount(0);
  await expect(page.getByTestId("new-game")).toHaveCount(0);
  await expect(page.getByTestId("view-back")).toHaveText("← Back to reading");

  await page.getByTestId("import-input").setInputFiles(pdf);
  await expect(page.getByTestId("review")).toBeVisible();
  await expect(page.getByTestId("import-step-1")).toHaveAttribute("data-state", "ok");
  await expect(page.getByTestId("import-step-2")).toHaveAttribute("data-state", "ok");
  await expect(page.getByTestId("import-step-3")).toHaveAttribute("data-state", "ok");
  await expect(page.getByTestId("import-step-5")).toHaveAttribute("data-state", "wait");
  await expect(page.getByTestId("review-flag-3")).toHaveText("CHECK");
  await expect(page.getByTestId("review-page-ref")).toHaveText("Page 4 of this PDF");
  await expect(page.getByTestId("review-tally")).toContainText("5 sections");
  await expect(page.getByTestId("review-still")).toHaveText("1 still flagged");
  await expect(page.getByTestId("review-editor")).toContainText("Section number");
  await expect(page.getByTestId("review-title")).toHaveValue("");
  await expect(page.getByTestId("review-section-3")).toContainText("§4 The landing is empty.");
  await expect(page.getByTestId("review-reason")).toContainText("Destination §9 does not exist.");
  await expect(page.getByTestId("review-unavailable")).toHaveText("Add to library stays unavailable while 1 section is still flagged.");
  const reasonColor = await page.getByTestId("review-reason").evaluate((node) => getComputedStyle(node).color);
  expect(reasonColor).toBe("rgb(138, 47, 29)");
  await page.getByTestId("review-section-0").click();
  await expect(page.getByTestId("review-test-none")).toHaveText("None on this section.");
  await expect(page.getByTestId("review-fight-none")).toHaveText("None on this section.");
  await page.getByTestId("review-add-test").click();
  await expect(page.getByTestId("review-pass")).toHaveAttribute("aria-label", "Pass → §");
  await page.getByTestId("review-section-4").click();
  await expect(page.getByTestId("review-fight")).toHaveValue("PAPER MOTH");
  await expect(page.getByTestId("review-penalty")).toBeVisible();
  await expect(page.getByTestId("review-win")).toHaveAttribute("aria-label", "Win → §4");
  await page.getByTestId("review-section-3").click();
  await expect(page.getByTestId("review-add")).toBeDisabled();
  await page.getByTestId("review-choice-to-0").fill("5");
  await page.getByTestId("review-mark").click();
  await expect(page.getByTestId("review-flag-3")).toHaveCount(0);
  await page.getByTestId("review-add").click();
  await expect(page.getByTestId("import-step-7")).toHaveAttribute("data-state", "ok");
  await expect(page.getByTestId("library-book-the-copper-lantern")).toContainText("5 sections");
  await expect(page.getByTestId("library-book-the-copper-lantern")).toContainText("Explored 0 sections");
  await expect(page.getByTestId("library-remove-the-copper-lantern")).toBeVisible();
  await expect(page.getByTestId("import-drop")).toBeVisible();
  await expect(page.getByTestId("library-book-lantern-stair")).toHaveCount(0);

  await page.reload();
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await page.getByTestId("side-library").click();
  await expect(page.getByTestId("library-book-the-copper-lantern")).toBeVisible();
  await page.getByTestId("library-continue-the-copper-lantern").click();
  await expect(page.getByTestId("creation")).toBeVisible();
  await expect(page.getByTestId("book-title")).toHaveText("The Copper Lantern");
  await expect(page.getByTestId("create-begin")).toContainText("→ §1");
  await page.getByTestId("create-skill-climbing").click();
  await page.getByTestId("create-skill-occult").click();
  await page.getByTestId("create-weapon-one-handed").click();
  await page.getByTestId("create-begin").click();
  await expect(page.getByTestId("section-title")).toHaveText("§1");
  await expect(page.getByTestId("sheet-skill-occult")).toHaveText("Occult +2");

  await page.getByTestId("side-library").click();
  await page.getByTestId("import-input").setInputFiles(scanned);
  await expect(page.getByTestId("import-step-2")).toHaveAttribute("data-state", "fail");
  await expect(page.getByTestId("import-step-2")).toContainText("✕");
  await expect(page.getByTestId("import-step-2")).toContainText("This PDF has no selectable text. A scanned book can't be converted yet.");
  await expect(page.getByTestId("import-message")).toHaveText("Import stopped at step 2.");
  await expect(page.getByTestId("import-step-3").locator(".s")).toHaveText("3");
  await expect(page.getByTestId("review")).toHaveCount(0);

  await page.getByTestId("import-input").setInputFiles(epub);
  await expect(page.getByTestId("review-page-ref")).toHaveText("Page 4 of this EPUB");
  await page.getByTestId("review-choice-to-0").fill("5");
  await page.getByTestId("review-mark").click();
  await page.getByTestId("review-add").click();
  await expect(page.getByTestId("library-book-the-paper-moth")).toBeVisible();

  await page.getByTestId("library-remove-the-paper-moth").click();
  await expect(page.getByTestId("remove-confirm")).toContainText("Remove The Paper Moth? Its saves on this device are deleted too.");
  await page.getByTestId("remove-keep").click();
  await expect(page.getByTestId("library-book-the-paper-moth")).toBeVisible();
  await page.getByTestId("library-remove-the-paper-moth").click();
  await page.getByTestId("remove-do").click();
  await expect(page.getByTestId("library-book-the-paper-moth")).toHaveCount(0);
  await expect(page.getByTestId("library-book-the-copper-lantern")).toBeVisible();
});

test("stacks the review on a phone and keeps the book buttons in a row", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("library")).toBeVisible();

  await page.getByTestId("import-input").setInputFiles(pdf);
  await expect(page.getByTestId("review")).toBeVisible();
  const choice = await page.getByTestId("review-choice-label-0").boundingBox();
  const destination = await page.locator(".choice-edit .dest-field").first().boundingBox();
  expect(choice && destination && Math.abs(choice.y - destination.y) < 8).toBe(true);
  expect(destination && Math.abs(destination.width - 90) <= 4).toBe(true);
  const list = await page.getByTestId("review-list").boundingBox();
  const source = await page.getByTestId("review-source").boundingBox();
  const editor = await page.getByTestId("review-editor").boundingBox();
  expect(list && source && editor && list.y < source.y && source.y < editor.y).toBe(true);
  const mark = await page.getByTestId("review-mark").evaluate((node) => node.getBoundingClientRect().height);
  expect(mark).toBeGreaterThanOrEqual(44);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.getByTestId("review-section-3").click();
  await page.getByTestId("review-choice-to-0").fill("5");
  await page.getByTestId("review-mark").click();
  await page.getByTestId("review-add").click();
  await expect(page.getByTestId("library-book-the-copper-lantern")).toBeVisible();
  const actions = page.getByTestId("library-book-the-copper-lantern").locator(".library-actions .btn");
  const row = await page.getByTestId("library-book-the-copper-lantern").locator(".library-actions").boundingBox();
  const boxes = await actions.evaluateAll((nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { w: Math.round(box.width) };
    }),
  );
  expect(row).toBeTruthy();
  expect(boxes.every((box) => row !== null && box.w <= row.width - 24)).toBe(true);
  expect(new Set(boxes.map((box) => box.w)).size).toBeGreaterThan(1);
  const tall = await actions.first().evaluate((node) => node.getBoundingClientRect().height);
  expect(tall).toBeGreaterThanOrEqual(44);
});

test("a first open has no book in play: an empty Library, no Lantern Stair card, no creation", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("library")).toBeVisible();
  await expect(page.getByTestId("side-library")).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("book-title")).toHaveText("No book in play");
  await expect(page.getByTestId("library-empty")).toHaveText("No books yet. Import a book file to start.");
  await expect(page.getByTestId("library-book-lantern-stair")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("The Lantern Stair");
  await expect(page.locator("main")).not.toContainText("Original sample text");
  await expect(page.getByTestId("creation")).toHaveCount(0);
  await expect(page.getByTestId("view-back")).toHaveCount(0);
  await expect(page.getByTestId("import-drop")).toBeVisible();
  for (const id of ["side-read", "side-character", "side-test", "side-keywords"]) {
    await expect(page.getByTestId(id)).toBeDisabled();
  }
  await expect(page.getByTestId("side-rules")).toBeEnabled();
  await page.getByTestId("side-rules").click();
  await expect(page.getByTestId("book-title")).toHaveText("No book in play");
  await page.getByTestId("view-back").click();
  await expect(page.getByTestId("library")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("mobile-book")).toHaveText("No book in play");
  await expect(page.getByTestId("mobile-library")).toHaveAttribute("aria-current", "page");

  await page.reload();
  await expect(page.getByTestId("mobile-book")).toHaveText("No book in play");
  await expect(page.getByTestId("library-empty")).toBeVisible();
});

test("review puts the tracker and flagged checklist above the editor and hides the book list and drop zone", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("import-drop")).toBeVisible();
  await page.getByTestId("import-input").setInputFiles(pdf);
  await expect(page.getByTestId("review")).toBeVisible();

  for (const n of [1, 2, 3]) {
    await expect(page.getByTestId(`import-step-${n}`)).toHaveAttribute("data-state", "ok");
    await expect(page.getByTestId(`import-step-${n}`).locator(".s")).toHaveText("✓");
  }
  await expect(page.getByTestId("import-step-4")).toHaveAttribute("aria-current", "step");
  await expect(page.getByTestId("import-step-4").locator(".s")).toHaveText("4");
  const ring = await page.getByTestId("import-step-4").locator(".s").evaluate((node) => getComputedStyle(node).boxShadow);
  expect(ring).toContain("rgb(138, 47, 29)");
  const tick = await page.getByTestId("import-step-1").locator(".s").evaluate((node) => getComputedStyle(node).backgroundColor);
  expect(tick).toBe("rgb(47, 107, 58)");
  for (const n of [5, 6, 7]) {
    await expect(page.getByTestId(`import-step-${n}`)).toHaveAttribute("data-state", "wait");
    await expect(page.getByTestId(`import-step-${n}`)).not.toHaveAttribute("aria-current", "step");
    await expect(page.getByTestId(`import-step-${n}`).locator(".s")).toHaveText(String(n));
  }
  await expect(page.getByTestId("import-steps")).toBeVisible();
  await expect(page.getByTestId("import-steps").locator("li .lab")).toHaveText([
    "Read file locally",
    "Extract text",
    "Structure as sections, choices, tests and fights",
    "Review and correct",
    "Validate against JSON Schema",
    "Check system file (GNAT)",
    "Add to library",
  ]);
  await expect(page.getByTestId("import-message")).toHaveText("Review and correct.");
  await expect(page.getByTestId("import-tracker-toggle")).toBeHidden();
  expect(await page.getByTestId("import-tracker").evaluate((node) => getComputedStyle(node).position)).toBe("sticky");

  await expect(page.getByTestId("import-drop")).toHaveCount(0);
  await expect(page.getByTestId("library-list")).toHaveCount(0);
  await expect(page.getByTestId("library-empty")).toHaveCount(0);
  await expect(page.getByTestId("view-back")).toHaveCount(0);
  await expect(page.getByTestId("review")).not.toContainText("Back to Library");

  const top = async (id: string) => (await page.getByTestId(id).boundingBox())?.y ?? Number.NaN;
  const sub = await page.locator(".library .sub").boundingBox();
  expect(sub && sub.y < (await top("import-tracker"))).toBe(true);
  expect(await top("import-tracker")).toBeLessThan(await top("review-checklist"));
  for (const id of ["review-tally", "review-flagged", "review-prev-flagged", "review-next-flagged", "review-mark", "review-add", "review-unavailable"]) {
    await expect(page.getByTestId("review-checklist").getByTestId(id)).toBeVisible();
    expect(await top(id)).toBeLessThan(await top("review-editor"));
  }
  await expect(page.getByTestId("review-tally")).toContainText("5 sections");
  await expect(page.getByTestId("review-still")).toHaveText("1 still flagged");
  await expect(page.getByTestId("review-flagged").locator(".section-row")).toHaveCount(1);
  await expect(page.getByTestId("review-flagged-3")).toContainText("§4 The landing is empty.");
  await expect(page.getByTestId("review-flagged-3").locator(".check-mark")).toHaveText("CHECK");
  expect(await page.getByTestId("review-flagged").evaluate((node) => getComputedStyle(node).maxHeight)).toBe("148px");
  await expect(page.getByTestId("review-add")).toBeDisabled();
  await expect(page.getByTestId("review-unavailable")).toHaveText("Add to library stays unavailable while 1 section is still flagged.");

  await expect(page.getByTestId("review-list")).toContainText("All sections");
  await expect(page.getByTestId("review-list").locator(".section-row")).toHaveCount(5);
  await expect(page.getByTestId("review-list").locator(".check-mark")).toHaveCount(1);
  await expect(page.getByTestId("review-flag-3")).toHaveText("CHECK");
  const listStyle = await page.getByTestId("review-list").locator(".section-list").evaluate((node) => {
    const style = getComputedStyle(node);
    return { max: style.maxHeight, overflow: style.overflowY };
  });
  expect(listStyle).toEqual({ max: "420px", overflow: "auto" });

  await page.getByTestId("review-section-0").click();
  await expect(page.getByTestId("review-number")).toHaveValue("1");
  await page.getByTestId("review-flagged-3").click();
  await expect(page.getByTestId("review-number")).toHaveValue("4");
  await expect(page.getByTestId("review-section-3")).toHaveAttribute("aria-current", "true");
  await page.getByTestId("review-section-0").click();
  await page.getByTestId("review-next-flagged").click();
  await expect(page.getByTestId("review-number")).toHaveValue("4");

  // Leaving the Library mid-review abandons it: the book list and drop zone come back.
  await page.getByTestId("side-rules").click();
  await page.getByTestId("side-library").click();
  await expect(page.getByTestId("review")).toHaveCount(0);
  await expect(page.getByTestId("import-drop")).toBeVisible();
  await expect(page.getByTestId("library-empty")).toHaveText("No books yet. Import a book file to start.");

  await addCopperLantern(page);
  await expect(page.getByTestId("review")).toHaveCount(0);
  await expect(page.getByTestId("import-drop")).toBeVisible();
  await expect(page.getByTestId("library-list")).toBeVisible();
  await expect(page.getByTestId("import-step-7")).toHaveAttribute("data-state", "ok");
  await expect(page.getByTestId("book-title")).toHaveText("No book in play");

  await page.getByTestId("library-continue-the-copper-lantern").click();
  await expect(page.getByTestId("creation")).toBeVisible();
  await expect(page.getByTestId("book-title")).toHaveText("The Copper Lantern");
  await expect(page.locator(".rights")).toHaveCount(0);
  await page.getByTestId("create-skill-climbing").click();
  await page.getByTestId("create-skill-occult").click();
  await page.getByTestId("create-weapon-one-handed").click();
  await page.getByTestId("create-begin").click();
  await expect(page.getByTestId("section-title")).toHaveText("§1");
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");

  // Removing the last imported book in play returns to no book in play, not to the sample book.
  await page.getByTestId("side-library").click();
  await page.getByTestId("library-remove-the-copper-lantern").click();
  await page.getByTestId("remove-do").click();
  await expect(page.getByTestId("library-book-the-copper-lantern")).toHaveCount(0);
  await expect(page.getByTestId("book-title")).toHaveText("No book in play");
  await expect(page.getByTestId("library-empty")).toHaveText("No books yet. Import a book file to start.");
  await expect(page.getByTestId("creation")).toHaveCount(0);
  await expect(page.getByTestId("side-read")).toBeDisabled();
  await page.reload();
  await expect(page.getByTestId("book-title")).toHaveText("No book in play");
  await expect(page.getByTestId("library-empty")).toBeVisible();
});

test("at 390px the tracker collapses to one line with a progress bar and expands on tap", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("mobile-book")).toHaveText("No book in play");
  await page.getByTestId("import-input").setInputFiles(pdf);
  await expect(page.getByTestId("review")).toBeVisible();
  await expect(page.getByTestId("import-drop")).toHaveCount(0);
  await expect(page.getByTestId("library-list")).toHaveCount(0);

  const toggle = page.getByTestId("import-tracker-toggle");
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByTestId("import-step-now")).toHaveText("Step 4 of 7 · Review and correct");
  const line = await page.getByTestId("import-step-now").evaluate((node) => {
    const box = node.getBoundingClientRect();
    return { height: box.height, lineHeight: parseFloat(getComputedStyle(node).lineHeight) || 21 };
  });
  expect(line.height).toBeLessThan(line.lineHeight * 1.6);
  await expect(page.getByTestId("import-steps")).toBeHidden();
  const progress = await page.getByTestId("import-progress").evaluate((node) => {
    const fill = node.firstElementChild as HTMLElement;
    return fill.getBoundingClientRect().width / node.getBoundingClientRect().width;
  });
  expect(progress).toBeCloseTo(4 / 7, 2);
  await expect(page.getByTestId("import-message")).toHaveText("Review and correct.");
  const tracker = await page.getByTestId("import-tracker").boundingBox();
  const checklist = await page.getByTestId("review-checklist").boundingBox();
  const editor = await page.getByTestId("review-editor").boundingBox();
  expect(tracker && checklist && editor && tracker.y < checklist.y && checklist.y < editor.y).toBe(true);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("import-steps")).toBeVisible();
  await expect(page.getByTestId("import-steps").locator("li .lab")).toHaveText([
    "Read file locally",
    "Extract text",
    "Structure as sections, choices, tests and fights",
    "Review and correct",
    "Validate against JSON Schema",
    "Check system file (GNAT)",
    "Add to library",
  ]);
  await expect(page.getByTestId("import-step-4")).toHaveAttribute("aria-current", "step");
  let overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await toggle.click();
  await expect(page.getByTestId("import-steps")).toBeHidden();
  overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("a fixture session plays The Lantern Stair but never lists it in the Library", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(FIXTURE_URL);
  await expect(page.getByTestId("book-title")).toHaveText("The Lantern Stair");
  await expect(page.getByTestId("section-title")).toBeVisible();
  await page.getByTestId("side-library").click();
  await expect(page.getByTestId("library-book-lantern-stair")).toHaveCount(0);
  await expect(page.getByTestId("library")).not.toContainText("The Lantern Stair");
  await expect(page.getByTestId("library-empty")).toBeVisible();
});
