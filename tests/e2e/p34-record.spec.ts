import { expect, test } from "@playwright/test";
import { assertDemoCursor, demoClick, demoFill, demoHold, installDemoCursor } from "./support/demo-cursor";
import { copperPdf } from "./support/sample-import";

test.use({
  viewport: { width: 1280, height: 800 },
  video: { mode: "on", size: { width: 1280, height: 800 } },
});

test("records the import review layout from an empty Library to an added book", async ({ page }) => {
  test.setTimeout(120_000);
  await installDemoCursor(page);
  await page.goto("/");
  await assertDemoCursor(page);
  await expect(page.getByTestId("book-title")).toHaveText("No book in play");
  await expect(page.getByTestId("library-empty")).toHaveText("No books yet. Import a book file to start.");
  await expect(page.getByTestId("library-book-lantern-stair")).toHaveCount(0);
  await demoHold(page, 2200);

  const chooser = page.waitForEvent("filechooser");
  await demoClick(page.getByTestId("import-choose"));
  await (await chooser).setFiles(copperPdf);
  await expect(page.getByTestId("review")).toBeVisible();
  await expect(page.getByTestId("import-step-4")).toHaveAttribute("aria-current", "step");
  await expect(page.getByTestId("import-drop")).toHaveCount(0);
  await demoHold(page, 2500);

  await demoClick(page.getByTestId("review-section-0"));
  await expect(page.getByTestId("review-number")).toHaveValue("1");
  await demoClick(page.getByTestId("review-flagged-3"));
  await expect(page.getByTestId("review-number")).toHaveValue("4");
  await demoHold(page, 1200);
  await demoFill(page.getByTestId("review-choice-to-0"), "5");
  await page.getByTestId("review-checklist").scrollIntoViewIfNeeded();
  await demoClick(page.getByTestId("review-mark"));
  await expect(page.getByTestId("review-still")).toHaveText("0 still flagged");
  await expect(page.getByTestId("review-add")).toBeEnabled();
  await demoHold(page, 1200);
  await demoClick(page.getByTestId("review-add"));
  await expect(page.getByTestId("library-book-the-copper-lantern")).toBeVisible();
  await expect(page.getByTestId("import-drop")).toBeVisible();
  await expect(page.getByTestId("import-step-7")).toHaveAttribute("data-state", "ok");
  await page.evaluate(() => window.scrollTo(0, 0));
  await demoHold(page, 2500);
});
