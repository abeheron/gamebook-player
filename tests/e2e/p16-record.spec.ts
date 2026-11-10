import { expect, test } from "@playwright/test";
import { assertDemoCursor, demoClick, demoHold, installDemoCursor } from "./support/demo-cursor";

test.use({
  viewport: { width: 1280, height: 800 },
  video: { mode: "on", size: { width: 1280, height: 800 } },
});

test("records illustration display with a visible cursor", async ({ page }) => {
  test.setTimeout(120_000);
  await installDemoCursor(page);
  await page.goto("/");
  await assertDemoCursor(page);
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await expect(page.getByTestId("illus-figure")).toBeVisible();
  await demoHold(page, 2500);

  await demoClick(page.getByTestId("illus-mode-link"));
  await expect(page.getByTestId("illus-open")).toHaveText("View illustration for section 1");
  await demoHold(page, 2000);

  await demoClick(page.getByTestId("illus-mode-hidden"));
  await expect(page.getByTestId("illus-open")).toHaveCount(0);
  await demoHold(page, 2000);

  await demoClick(page.getByTestId("illus-mode-inline"));
  await expect(page.getByTestId("illus-figure")).toBeVisible();
  await demoHold(page, 1500);
  await demoClick(page.getByTestId("illus-open"));
  await expect(page.getByTestId("illus-viewer")).toBeVisible();
  await demoHold(page, 2500);
  await demoClick(page.getByTestId("illus-close"));
  await expect(page.getByTestId("illus-viewer")).toHaveCount(0);

  await demoClick(page.getByTestId("choice-take-lantern"));
  await expect(page.getByTestId("section-title")).toHaveText("The landing");
  await expect(page.getByTestId("illus-pref")).toHaveCount(0);
  await demoHold(page, 2500);
});
