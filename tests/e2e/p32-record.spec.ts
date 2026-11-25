import { expect, test } from "@playwright/test";
import { assertDemoCursor, demoClick, demoFill, demoHold, installDemoCursor } from "./support/demo-cursor";
import { P32_FIXTURE_URL } from "./support/fixture";

test.use({
  viewport: { width: 1280, height: 800 },
  video: { mode: "on", size: { width: 1280, height: 800 } },
});

test("records a test with plain choices beside it: locked, failed, re-rolled, and passed", async ({ page }) => {
  test.setTimeout(120_000);
  await installDemoCursor(page);
  await page.goto(P32_FIXTURE_URL);
  await assertDemoCursor(page);
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await expect(page.getByTestId("test-panel")).toBeVisible();
  await expect(page.getByTestId("close-test")).toHaveCount(0);
  await demoHold(page, 2000);

  // The standing card, Or choose:, and the fail-only choice, locked with its reason.
  await page.getByTestId("or-choose").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("choice-why-eat-anyway")).toHaveText("Only if the Naturalist test fails.");
  await page.getByTestId("choice-eat-anyway").hover();
  await demoHold(page, 2500);

  // Fail the test with my dice: 6 and 6.
  await demoClick(page.getByTestId("open-full-test"));
  await expect(page.getByTestId("test-full")).toBeVisible();
  await demoClick(page.getByTestId("dice-manual"));
  await demoFill(page.getByTestId("manual-die-1"), "6");
  await demoFill(page.getByTestId("manual-die-2"), "6");
  await demoClick(page.getByTestId("roll-test"));
  await expect(page.getByTestId("test-result")).toHaveClass(/bad/);
  await demoHold(page, 1500);
  await demoClick(page.getByTestId("view-back"));
  await expect(page.getByTestId("test-hint")).toHaveText("The test failed. Choose below.");
  await expect(page.getByTestId("choice-eat-anyway")).toBeEnabled();
  await page.getByTestId("or-choose").scrollIntoViewIfNeeded();
  await demoHold(page, 2500);

  // Spend Fortune on the first die. It comes up 1, so 1 + 6 = 7 passes and the fail-only choice locks again.
  await page.getByTestId("test-panel").scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    Math.random = () => 0;
  });
  await demoClick(page.getByTestId("die-1"));
  await demoClick(page.getByTestId("fortune-reroll"));
  await expect(page.getByTestId("test-result")).toHaveClass(/ok/);
  await expect(page.getByTestId("fortune-count")).toHaveText("Fortune 2 / 3");
  await expect(page.getByTestId("choice-eat-anyway")).toBeDisabled();
  await expect(page.getByTestId("destination-pass")).toBeEnabled();
  await demoHold(page, 2500);

  await demoClick(page.getByTestId("destination-pass"));
  await expect(page.getByTestId("section-title")).toHaveText("§14");
  await demoHold(page, 2500);
});
