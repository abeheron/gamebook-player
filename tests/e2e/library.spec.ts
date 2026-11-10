import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

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
  await page.goto("/");
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await page.getByTestId("side-library").click();
  await expect(page.getByTestId("import-drop")).toContainText("Drop a book file (PDF or EPUB)");
  await expect(page.getByTestId("library")).toContainText("converted on this device, then you review the result before it is added");
  await expect(page.getByTestId("library")).not.toContainText("YAML");
  await expect(page.getByTestId("library-book-lantern-stair")).toContainText("10 sections");
  await expect(page.getByTestId("library-book-lantern-stair")).toContainText("Explored 1 section");
  await expect(page.getByTestId("undo")).toHaveCount(0);
  await expect(page.getByTestId("new-game")).toHaveCount(0);
  await expect(page.getByTestId("view-back")).toHaveText("← Back to reading");
  await expect(page.getByTestId("library-remove-lantern-stair")).toHaveCount(0);

  await page.getByTestId("import-input").setInputFiles(pdf);
  await expect(page.getByTestId("review")).toBeVisible();
  await expect(page.getByTestId("import-step-1")).toHaveAttribute("data-state", "ok");
  await expect(page.getByTestId("import-step-2")).toHaveAttribute("data-state", "ok");
  await expect(page.getByTestId("import-step-3")).toHaveAttribute("data-state", "ok");
  await expect(page.getByTestId("import-step-5")).toHaveAttribute("data-state", "wait");
  await expect(page.getByTestId("review-flag-3")).toHaveText("CHECK");
  await expect(page.getByTestId("review-reason")).toContainText("Destination §9 does not exist.");
  await expect(page.getByTestId("review-add")).toBeDisabled();
  await page.getByTestId("review-choice-to-0").fill("5");
  await page.getByTestId("review-mark").click();
  await expect(page.getByTestId("review-flag-3")).toHaveCount(0);
  await page.getByTestId("review-add").click();
  await expect(page.getByTestId("import-step-7")).toHaveAttribute("data-state", "ok");
  await expect(page.getByTestId("library-book-the-copper-lantern")).toContainText("5 sections");
  await expect(page.getByTestId("library-book-the-copper-lantern")).toContainText("Explored 0 sections");
  await expect(page.getByTestId("library-remove-the-copper-lantern")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await page.getByTestId("side-library").click();
  await expect(page.getByTestId("library-book-the-copper-lantern")).toBeVisible();
  await page.getByTestId("library-continue-the-copper-lantern").click();
  await expect(page.getByTestId("section-title")).toHaveText("Section 1");

  await page.getByTestId("side-library").click();
  await page.getByTestId("import-input").setInputFiles(scanned);
  await expect(page.getByTestId("import-step-2")).toHaveAttribute("data-state", "fail");
  await expect(page.getByTestId("import-step-2")).toContainText("✕");
  await expect(page.getByTestId("import-step-2")).toContainText("This PDF has no selectable text. A scanned book can't be converted yet.");
  await expect(page.getByTestId("import-message")).toHaveText("Import stopped at step 2.");
  await expect(page.getByTestId("import-step-3").locator(".s")).toHaveText("3");
  await expect(page.getByTestId("review")).toHaveCount(0);

  await page.getByTestId("import-input").setInputFiles(epub);
  await expect(page.getByTestId("review-page-ref")).toHaveText("Page 4");
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
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await page.getByTestId("mobile-library").click();
  const actions = page.getByTestId("library-book-lantern-stair").locator(".library-actions .btn");
  const row = await page.getByTestId("library-book-lantern-stair").locator(".library-actions").boundingBox();
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

  await page.getByTestId("import-input").setInputFiles(pdf);
  await expect(page.getByTestId("review")).toBeVisible();
  const list = await page.getByTestId("review-list").boundingBox();
  const source = await page.getByTestId("review-source").boundingBox();
  const editor = await page.getByTestId("review-editor").boundingBox();
  expect(list && source && editor && list.y < source.y && source.y < editor.y).toBe(true);
  const mark = await page.getByTestId("review-mark").evaluate((node) => node.getBoundingClientRect().height);
  expect(mark).toBeGreaterThanOrEqual(44);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
