import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { assertDemoCursor, demoClick, demoFill, demoHold, installDemoCursor } from "./support/demo-cursor";

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

test.use({
  viewport: { width: 1280, height: 800 },
  video: { mode: "on", size: { width: 1280, height: 800 } },
});

test("records a PDF conversion and a scanned-PDF rejection", async ({ page }) => {
  test.setTimeout(120_000);
  await installDemoCursor(page);
  await page.goto("/");
  await assertDemoCursor(page);
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await demoClick(page.getByTestId("side-library"));
  await expect(page.getByTestId("library")).toBeVisible();
  await demoHold(page, 1200);

  const chooser = page.waitForEvent("filechooser");
  await demoClick(page.getByTestId("import-choose"));
  await (await chooser).setFiles(pdf);
  await expect(page.getByTestId("review-flag-3")).toHaveText("CHECK");
  await demoHold(page, 1500);
  await demoFill(page.getByTestId("review-choice-to-0"), "5");
  await demoClick(page.getByTestId("review-mark"));
  await expect(page.getByTestId("review-add")).toBeEnabled();
  await demoClick(page.getByTestId("review-add"));
  await expect(page.getByTestId("library-book-the-copper-lantern")).toBeVisible();
  await page.getByTestId("library-book-the-copper-lantern").scrollIntoViewIfNeeded();
  await demoHold(page, 1800);

  const rejected = page.waitForEvent("filechooser");
  await demoClick(page.getByTestId("import-choose"));
  await (await rejected).setFiles(scanned);
  await expect(page.getByTestId("import-step-2")).toHaveAttribute("data-state", "fail");
  await page.getByTestId("import-step-2").scrollIntoViewIfNeeded();
  await demoHold(page, 2200);
});
