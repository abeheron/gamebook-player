import { expect, test, type Page } from "@playwright/test";
import { assertDemoCursor, demoClick, demoHold, installDemoCursor } from "./support/demo-cursor";
import { P35_FIXTURE_URL } from "./support/fixture";

test.use({
  viewport: { width: 1280, height: 800 },
  video: { mode: "on", size: { width: 1280, height: 800 } },
});

/** The next d6 faces the app rolls, so the recording is the same every time. */
async function nextFaces(page: Page, ...faces: number[]): Promise<void> {
  await page.evaluate((list) => {
    const queue = list.map((face) => (face - 0.5) / 6);
    Math.random = () => queue.shift() ?? 0.5;
  }, faces);
}

test("records a test before a fight: the waiting fight, Disadvantage's automatic re-roll, Fortune, Advantage, and a skip", async ({ page }) => {
  test.setTimeout(180_000);
  await installDemoCursor(page);
  await page.goto(P35_FIXTURE_URL);
  await assertDemoCursor(page);
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await demoHold(page, 1500);

  // §10: the Swimming test, with the fight waiting below it.
  await demoClick(page.getByTestId("choice-reed-channel"));
  await expect(page.getByTestId("section-title")).toHaveText("§10");
  await demoHold(page, 1500);
  await page.getByTestId("combat-waiting").scrollIntoViewIfNeeded();
  await page.getByTestId("combat-waiting").hover();
  await demoHold(page, 2500);
  await page.getByTestId("roll-combat").hover();
  await demoHold(page, 1500);

  // Fail the test, then take the fail: Disadvantage.
  await page.getByTestId("test-panel").scrollIntoViewIfNeeded();
  await nextFaces(page, 6, 6);
  await demoClick(page.getByTestId("roll-test"));
  await expect(page.getByTestId("test-result")).toHaveText("6 + 6 = 12. Swimming +2. Fail.");
  await demoHold(page, 1500);
  await demoClick(page.getByTestId("destination-fail"));
  await expect(page.getByTestId("combat-edge")).toHaveText("Disadvantage");
  await page.getByTestId("combat").scrollIntoViewIfNeeded();
  await page.getByTestId("combat-edge").hover();
  await demoHold(page, 2500);

  // Round 1: the 2 is replaced automatically, before Fortune.
  await nextFaces(page, 4, 2, 5);
  await demoClick(page.getByTestId("roll-combat"));
  await expect(page.getByTestId("reroll-line")).toHaveText("Disadvantage re-rolled a 2 to a 5.");
  await page.getByTestId("combat-roll").scrollIntoViewIfNeeded();
  await page.getByTestId("old-die-2").hover();
  await demoHold(page, 3000);

  // Fortune may re-roll the die Disadvantage already replaced.
  const fight = page.getByTestId("combat");
  await demoClick(fight.getByTestId("die-2"));
  await nextFaces(page, 3);
  await demoClick(fight.getByTestId("fortune-reroll"));
  await expect(fight.getByTestId("reroll-line")).toHaveText(["Disadvantage re-rolled a 2 to a 5.", "Fortune re-rolled a 5 to a 3."]);
  await demoHold(page, 3000);

  // Back to the causeway, then Advantage after a Stealth pass at §20.
  await page.evaluate(() => window.scrollTo(0, 0));
  await demoClick(page.getByTestId("new-game"));
  await demoClick(page.getByTestId("create-skill-climbing"));
  await demoClick(page.getByTestId("create-skill-stealth"));
  await demoClick(page.getByTestId("create-weapon-one-handed"));
  await demoClick(page.getByTestId("create-begin"));
  await demoClick(page.getByTestId("choice-toll-keeper"));
  await expect(page.getByTestId("section-title")).toHaveText("§20");
  await nextFaces(page, 3, 4);
  await demoClick(page.getByTestId("roll-test"));
  await expect(page.getByTestId("destination-pass")).toBeEnabled();
  await demoHold(page, 1200);
  await demoClick(page.getByTestId("destination-pass"));
  await expect(page.getByTestId("combat-edge")).toHaveText("Advantage");
  await page.getByTestId("combat").scrollIntoViewIfNeeded();
  await page.getByTestId("combat-edge").hover();
  await demoHold(page, 2500);
  await nextFaces(page, 6, 5);
  await demoClick(page.getByTestId("roll-combat"));
  await expect(page.getByTestId("combat-roll")).toHaveText("6 + 5 = 11. You are hit.");
  await demoHold(page, 1500);
  await demoClick(fight.getByTestId("die-1"));
  await nextFaces(page, 2);
  await demoClick(page.getByTestId("advantage-reroll"));
  await expect(page.getByTestId("combat-roll")).toHaveText("2 + 5 = 7. You hold.");
  await page.getByTestId("advantage-reroll").scrollIntoViewIfNeeded();
  await demoHold(page, 3000);

  // §30: a test the section offers can be skipped.
  await nextFaces(page, 3, 3);
  await demoClick(page.getByTestId("roll-combat"));
  await expect(page.getByTestId("combat-outcome")).toHaveText("You win the fight · turn to §90");
  await demoHold(page, 1200);
  await demoClick(page.getByTestId("fight-continue"));
  await expect(page.getByTestId("section-title")).toHaveText("§90");
  await demoClick(page.getByTestId("choice-back-causeway"));
  await expect(page.getByTestId("section-title")).toHaveText("§1");
  await demoClick(page.getByTestId("choice-heron"));
  await expect(page.getByTestId("skip-test")).toBeVisible();
  await demoHold(page, 1500);
  await demoClick(page.getByTestId("skip-test"));
  await expect(page.getByTestId("test-hint")).toHaveText("Skipped. Fight without Advantage.");
  await page.getByTestId("combat").scrollIntoViewIfNeeded();
  await demoHold(page, 3000);
});
