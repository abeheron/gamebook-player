import { expect, test } from "@playwright/test";
import { assertDemoCursor, demoClick, demoHold, installDemoCursor } from "./support/demo-cursor";

test.use({
  viewport: { width: 1280, height: 800 },
  video: { mode: "on", size: { width: 1280, height: 800 } },
});

test("records the library drop zone with a visible cursor", async ({ page }) => {
  test.setTimeout(60_000);
  await installDemoCursor(page);
  await page.goto("/");
  await assertDemoCursor(page);
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await demoClick(page.getByTestId("side-library"));
  await expect(page.getByTestId("import-drop")).toContainText("Drop a book file (PDF or EPUB)");
  await demoHold(page, 1200);
  await expect(page.getByTestId("undo")).toHaveCount(0);
});
