import { expect, test } from "@playwright/test";
import { assertDemoCursor, demoClick, demoFill, demoHold, installDemoCursor } from "./support/demo-cursor";

test.use({
  viewport: { width: 1280, height: 800 },
  video: { mode: "on", size: { width: 1280, height: 800 } },
});

test("records the Fortune demo with a visible cursor", async ({ page }) => {
  test.setTimeout(120_000);
  await installDemoCursor(page);
  await page.goto("/");
  await assertDemoCursor(page);
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await demoClick(page.getByTestId("choice-take-lantern"));
  await demoClick(page.getByTestId("choice-tick-and-study"));
  await expect(page.getByTestId("section-title")).toHaveText("The mark");
  await demoClick(page.getByTestId("side-test"));
  await demoClick(page.getByTestId("dice-manual"));
  await demoFill(page.getByTestId("manual-die-1"), "1");
  await demoFill(page.getByTestId("manual-die-2"), "1");
  await demoClick(page.getByTestId("roll-test"));
  await expect(page.getByTestId("test-result")).toHaveText("Double 1 — automatic pass");
  await expect(page.getByTestId("destination-pass")).toBeEnabled();
  await expect(page.getByTestId("destination-fail")).toBeDisabled();
  await demoHold(page, 3000);

  await demoClick(page.getByTestId("undo"));
  await demoClick(page.getByTestId("dice-manual"));
  await demoFill(page.getByTestId("manual-die-1"), "6");
  await demoFill(page.getByTestId("manual-die-2"), "6");
  await demoClick(page.getByTestId("roll-test"));
  await expect(page.getByTestId("test-result")).toHaveText("Double 6 — automatic fail");
  await expect(page.getByTestId("destination-fail")).toBeEnabled();
  await expect(page.getByTestId("destination-pass")).toBeDisabled();
  await demoHold(page, 3000);

  await demoClick(page.getByTestId("new-game"));
  await expect(page.getByTestId("section-title")).toHaveText("The stair");
  await demoClick(page.getByTestId("choice-face-the-moth"));
  await demoClick(page.getByTestId("side-test"));
  await demoClick(page.getByTestId("roll-combat"));
  await expect(page.getByTestId("combat-roll")).toBeVisible();
  await demoHold(page, 3000);
  await demoClick(page.getByTestId("die-1"));
  await demoClick(page.getByTestId("fortune-reroll"));
  await expect(page.getByTestId("combat-roll")).toBeVisible();
  await demoHold(page, 3000);
});
