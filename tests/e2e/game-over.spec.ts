import { expect, test, type Page } from "@playwright/test";
import { FIXTURE_URL, P32_FIXTURE_URL, P33_FIXTURE_URL } from "./support/fixture";

async function openRavine(page: Page): Promise<void> {
  await page.goto(P33_FIXTURE_URL);
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await expect(page.getByTestId("section-title")).toHaveText("§1");
}

/** Every die comes up 6 from here on: 6 + 6 = 12 misses Talent 9, so every round is a Wound. */
async function forceSixes(page: Page): Promise<void> {
  await page.evaluate(() => {
    Math.random = () => 0.999;
  });
}

/** Rolls the three rounds of the fight in front of the player through the fight UI, missing each one. */
async function loseFight(page: Page): Promise<void> {
  await forceSixes(page);
  for (let round = 1; round <= 3; round += 1) {
    await page.getByTestId("roll-combat").click();
    if (round < 3) await expect(page.getByTestId("roll-combat")).toHaveText(`Resolve round ${round + 1}`);
  }
}

async function expectCard(page: Page): Promise<void> {
  const card = page.getByTestId("game-over");
  await expect(card).toBeVisible();
  await expect(card.getByRole("heading", { name: "Game over" })).toBeVisible();
  await expect(page.getByTestId("game-over-happened")).toHaveText("You fell at §5 fighting the Cinder hound.");
  await expect(page.getByTestId("game-over-why")).toHaveText("This fight has no losing section, so a defeat ends the adventure.");
  await expect(page.getByTestId("game-over-new-game")).toHaveText("New game");
  await expect(page.getByTestId("game-over-library")).toHaveText("Library");
  await expect(card.getByRole("button")).toHaveCount(2);
  await expect(card.getByText("Undo turn")).toHaveCount(0);
}

test("a lost fight with no losing section shows the game-over card in the app shell", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openRavine(page);
  await page.getByTestId("choice-cross-bridge").click();
  await expect(page.getByTestId("section-title")).toHaveText("§5");
  await expect(page.getByTestId("game-over")).toHaveCount(0);
  await loseFight(page);

  await expectCard(page);
  await expect(page.getByTestId("combat")).toHaveCount(0);
  await expect(page.getByTestId("roll-combat")).toHaveCount(0);
  await expect(page.getByTestId("section-title")).toHaveCount(0);
  await expect(page.locator(".prose")).toHaveCount(0);
  await expect(page.getByTestId("sheet-stat-vitality")).toHaveText("0");
  await expect(page.getByTestId("side-nav")).toBeVisible();
  await expect(page.getByTestId("undo")).toBeEnabled();
  await expect(page.getByTestId("new-game")).toBeVisible();
  await expect(page.getByTestId("game-over-skull")).toHaveAttribute("aria-hidden", "true");
  const box = await page.getByTestId("game-over-new-game").boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  // Test & fight shows the same card, so there is no roll button to press.
  await page.getByTestId("side-test").click();
  await expect(page.getByTestId("test-view").getByTestId("game-over")).toBeVisible();
  await expect(page.getByTestId("roll-combat")).toHaveCount(0);

  // A reload keeps the save, and the card.
  await page.reload();
  await expect(page.getByTestId("game-over")).toBeVisible();
});

test("Undo in the toolbar leaves game over and brings the fight back", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openRavine(page);
  await page.getByTestId("choice-cross-bridge").click();
  await loseFight(page);
  await expect(page.getByTestId("game-over")).toBeVisible();
  await page.getByTestId("undo").click();
  await expect(page.getByTestId("game-over")).toHaveCount(0);
  await expect(page.getByTestId("section-title")).toHaveText("§5");
  await expect(page.getByTestId("combat")).toBeVisible();
  await expect(page.getByTestId("roll-combat")).toHaveText("Resolve round 3");
  await expect(page.getByTestId("sheet-stat-vitality")).toHaveText("1");
});

test("New game on the card opens character creation", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openRavine(page);
  await page.getByTestId("choice-cross-bridge").click();
  await loseFight(page);
  await page.getByTestId("game-over-new-game").click();
  await expect(page.getByTestId("creation")).toBeVisible();
  await expect(page.getByTestId("game-over")).toHaveCount(0);
});

test("Library on the card opens the Library", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openRavine(page);
  await page.getByTestId("choice-cross-bridge").click();
  await loseFight(page);
  await page.getByTestId("game-over-library").click();
  await expect(page.getByTestId("library")).toBeVisible();
  await expect(page.getByTestId("side-library")).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("game-over")).toHaveCount(0);
});

test("opening Test & fight before the last round and losing there shows the card there", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openRavine(page);
  await page.getByTestId("choice-cross-bridge").click();
  await page.getByTestId("side-test").click();
  await expect(page.getByTestId("combat")).toBeVisible();
  await loseFight(page);
  await expect(page.getByTestId("test-view").getByTestId("game-over")).toBeVisible();
  await expect(page.getByTestId("game-over-happened")).toHaveText("You fell at §5 fighting the Cinder hound.");
  await expect(page.getByTestId("roll-combat")).toHaveCount(0);
});

test("a fight with a losing section still turns there and shows no card", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openRavine(page);
  await page.getByTestId("choice-wade-ford").click();
  await expect(page.getByTestId("section-title")).toHaveText("§9");
  await loseFight(page);
  await expect(page.getByTestId("combat-outcome")).toContainText("Defeat · turn to §12");
  await expect(page.getByTestId("game-over")).toHaveCount(0);
  await page.getByTestId("fight-continue").click();
  await expect(page.getByTestId("section-title")).toHaveText("§12");
  await expect(page.getByTestId("sheet-stat-vitality")).toHaveText("0");
  await expect(page.getByTestId("game-over")).toHaveCount(0);
});

test("a test-only wound to 0 does not show the game-over card", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openRavine(page);
  await page.getByTestId("choice-climb-scree").click();
  await expect(page.getByTestId("section-title")).toHaveText("§17");
  await page.getByTestId("open-full-test").click();
  await page.getByTestId("dice-manual").click();
  await page.getByTestId("manual-die-1").fill("6");
  await page.getByTestId("manual-die-2").fill("6");
  await page.getByTestId("roll-test").click();
  await expect(page.getByTestId("test-result")).toHaveClass(/bad/);
  await page.getByTestId("view-back").click();
  await expect(page.getByTestId("section-title")).toHaveText("§17");
  await expect(page.getByTestId("sheet-stat-vitality")).toHaveText("0");
  await expect(page.getByTestId("game-over")).toHaveCount(0);
  await expect(page.getByTestId("choice-back-down")).toBeEnabled();
});

test("at 390px the card is centred, the buttons stack full width, and nothing scrolls sideways", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openRavine(page);
  await page.getByTestId("choice-cross-bridge").click();
  await loseFight(page);
  const card = page.getByTestId("game-over");
  await expect(card).toBeVisible();
  await expect(page.getByTestId("mobile-nav")).toBeVisible();
  await expect(page.getByTestId("sheet-stat-vitality")).toHaveText("0");
  const newGame = await page.getByTestId("game-over-new-game").boundingBox();
  const library = await page.getByTestId("game-over-library").boundingBox();
  const inner = await page.locator(".game-over-card").boundingBox();
  if (!newGame || !library || !inner) throw new Error("The card did not lay out.");
  expect(library.y).toBeGreaterThan(newGame.y + newGame.height - 1);
  expect(Math.abs(library.x - newGame.x)).toBeLessThan(1);
  expect(Math.abs(newGame.width - inner.width)).toBeLessThan(1);
  expect(newGame.height).toBeGreaterThanOrEqual(44);
  expect(library.height).toBeGreaterThanOrEqual(44);
  const centre = inner.x + inner.width / 2;
  expect(Math.abs(centre - 195)).toBeLessThan(2);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("the demo and p32 fixtures still open", async ({ page }) => {
  await page.goto(FIXTURE_URL);
  await expect(page.getByTestId("book-title")).toHaveText("The Lantern Stair");
  await page.goto(P32_FIXTURE_URL);
  await expect(page.getByTestId("book-title")).toHaveText("The Mist Glade");
});
