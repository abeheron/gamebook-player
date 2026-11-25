import { expect, test } from "@playwright/test";
import { assertDemoCursor, demoClick, demoHold, installDemoCursor } from "./support/demo-cursor";
import { P33_FIXTURE_URL } from "./support/fixture";

test.use({
  viewport: { width: 1280, height: 800 },
  video: { mode: "on", size: { width: 1280, height: 800 } },
});

test("records a lost fight with no losing section: the game-over card, New game, Library, and toolbar Undo", async ({ page }) => {
  test.setTimeout(120_000);
  await installDemoCursor(page);
  await page.goto(P33_FIXTURE_URL);
  await assertDemoCursor(page);
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await demoHold(page, 1500);

  // Into the fight with the Cinder hound (§5, no losing section).
  await demoClick(page.getByTestId("choice-cross-bridge"));
  await expect(page.getByTestId("section-title")).toHaveText("§5");
  await page.getByTestId("combat").scrollIntoViewIfNeeded();
  await demoHold(page, 2000);

  // Every die comes up 6 from here: 12 misses Talent 9, so each round is a Wound.
  await page.evaluate(() => {
    Math.random = () => 0.999;
  });
  for (let round = 1; round <= 3; round += 1) {
    await demoClick(page.getByTestId("roll-combat"));
    if (round < 3) await expect(page.getByTestId("roll-combat")).toHaveText(`Resolve round ${round + 1}`);
    await demoHold(page, 800);
  }

  // The card, with Vitality 0 in the character summary.
  await expect(page.getByTestId("game-over")).toBeVisible();
  await expect(page.getByTestId("sheet-stat-vitality")).toHaveText("0");
  await page.evaluate(() => window.scrollTo(0, 0));
  await demoHold(page, 3000);
  await page.getByTestId("sheet-stat-vitality").hover();
  await demoHold(page, 1500);

  // The two actions on the card.
  await page.getByTestId("game-over-new-game").hover();
  await demoHold(page, 1500);
  await page.getByTestId("game-over-library").hover();
  await demoHold(page, 1500);

  // Undo is only in the toolbar. It rewinds the last round and brings the fight back.
  await expect(page.getByTestId("game-over").getByText("Undo turn")).toHaveCount(0);
  await demoClick(page.getByTestId("undo"));
  await expect(page.getByTestId("game-over")).toHaveCount(0);
  await expect(page.getByTestId("roll-combat")).toHaveText("Resolve round 3");
  await page.getByTestId("combat").scrollIntoViewIfNeeded();
  await demoHold(page, 2500);

  // Lose the last round again, then open the Library from the card.
  await demoClick(page.getByTestId("roll-combat"));
  await expect(page.getByTestId("game-over")).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await demoHold(page, 2000);
  await demoClick(page.getByTestId("game-over-library"));
  await expect(page.getByTestId("library")).toBeVisible();
  await demoHold(page, 2000);

  // Back to the card, then New game opens character creation.
  await demoClick(page.getByTestId("side-read"));
  await expect(page.getByTestId("game-over")).toBeVisible();
  await demoHold(page, 1500);
  await demoClick(page.getByTestId("game-over-new-game"));
  await expect(page.getByTestId("creation")).toBeVisible();
  await demoHold(page, 2500);
});
