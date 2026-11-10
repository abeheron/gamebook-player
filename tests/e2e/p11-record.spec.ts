import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { assertDemoCursor, demoClick, demoHold, installDemoCursor } from "./support/demo-cursor";

const valid = {
  name: "imported-stair.json",
  mimeType: "application/json",
  buffer: readFileSync(new URL("../fixtures/imported-stair.json", import.meta.url)),
};
const invalid = {
  name: "imported-invalid.json",
  mimeType: "application/json",
  buffer: readFileSync(new URL("../fixtures/imported-invalid.json", import.meta.url)),
};

test.use({
  viewport: { width: 1280, height: 800 },
  video: { mode: "on", size: { width: 1280, height: 800 } },
});

test("records a local book import with a visible cursor", async ({ page }) => {
  test.setTimeout(120_000);
  await installDemoCursor(page);
  await page.goto("/");
  await assertDemoCursor(page);
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await demoClick(page.getByTestId("side-library"));
  await expect(page.getByTestId("library")).toBeVisible();
  await demoHold(page, 1500);

  const chooser = page.waitForEvent("filechooser");
  await demoClick(page.getByTestId("import-choose"));
  await (await chooser).setFiles(valid);
  await expect(page.getByTestId("library-book-imported-stair")).toBeVisible();
  await expect(page.getByTestId("import-step-4")).toHaveAttribute("data-state", "ok");
  await demoHold(page, 2000);

  await page.reload();
  await assertDemoCursor(page);
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await demoClick(page.getByTestId("side-library"));
  await expect(page.getByTestId("library-book-imported-stair")).toBeVisible();
  await demoHold(page, 1500);
  await demoClick(page.getByTestId("library-continue-imported-stair"));
  await expect(page.getByTestId("section-title")).toHaveText("The landing import");
  await demoHold(page, 2000);

  await demoClick(page.getByTestId("side-library"));
  const rejected = page.waitForEvent("filechooser");
  await demoClick(page.getByTestId("import-choose"));
  await (await rejected).setFiles(invalid);
  await expect(page.getByTestId("import-step-2")).toHaveAttribute("data-state", "fail");
  await expect(page.getByTestId("library-book-broken-book")).toHaveCount(0);
  await demoHold(page, 2500);
});
