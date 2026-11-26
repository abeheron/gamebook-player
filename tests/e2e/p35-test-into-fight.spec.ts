import { expect, test, type Page } from "@playwright/test";
import { P35_FIXTURE_URL } from "./support/fixture";

/**
 * The next d6 faces the app rolls, in order. Set just before the click that rolls: the engine draws
 * them first, then the dice animation uses the fallback.
 */
async function nextFaces(page: Page, ...faces: number[]): Promise<void> {
  await page.evaluate((list) => {
    const queue = list.map((face) => (face - 0.5) / 6);
    Math.random = () => queue.shift() ?? 0.5;
  }, faces);
}

async function openMarsh(page: Page, choice: string, section: string): Promise<void> {
  await page.goto(P35_FIXTURE_URL);
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await page.getByTestId(`choice-${choice}`).click();
  await expect(page.getByTestId("section-title")).toHaveText(`§${section}`);
}

async function rollTest(page: Page, a: number, b: number): Promise<void> {
  await nextFaces(page, a, b);
  await page.getByTestId("roll-test").click();
  await expect(page.getByTestId("test-result")).not.toHaveText("Rolling…");
}

async function resolve(page: Page, round: number, ...faces: number[]): Promise<void> {
  await nextFaces(page, ...faces);
  await page.getByTestId("roll-combat").click();
  await expect(page.getByTestId("combat-roll")).toBeVisible();
  await expect(page.getByTestId("dice-rolling")).toHaveCount(0);
  if (round > 0) await expect(page.getByTestId("roll-combat")).toHaveText(`Resolve round ${round + 1}`);
}

/** The fight panel. The test card above it has its own dice and Fortune button. */
function fight(page: Page) {
  return page.getByTestId("combat");
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
});

test("a fight waits for its test: the stakes are on the panel and Resolve is disabled", async ({ page }) => {
  await openMarsh(page, "reed-channel", "10");
  const card = page.getByTestId("test-panel");
  await expect(card).toBeVisible();
  await expect(card.getByRole("heading", { name: "Test Swimming" })).toBeVisible();
  await expect(page.getByTestId("test-formula")).toHaveText("2d6 ≤ Talent 9 + 2 Swimming = 11");
  // P01 / P27 / P32: a standing card has no Close, and keeps Full test.
  await expect(page.getByTestId("close-test")).toHaveCount(0);
  await expect(page.getByTestId("open-full-test")).toBeVisible();
  await expect(page.getByTestId("open-test")).toHaveCount(0);
  await expect(page.getByTestId("skip-test")).toHaveCount(0);
  await expect(page.getByTestId("destination-pass")).toHaveText("Pass · Fight as normal");
  await expect(page.getByTestId("destination-fail")).toHaveText("Fail · Fight with Disadvantage");
  await expect(page.getByTestId("destination-pass")).toBeDisabled();
  await expect(page.getByTestId("destination-fail")).toBeDisabled();

  const fight = page.getByTestId("combat");
  await expect(fight).toHaveAttribute("data-edge", "waiting");
  await expect(fight).toHaveAttribute("aria-label", "Fight, waiting");
  await expect(page.getByTestId("combat-waiting")).toHaveText(
    "Waiting for the Swimming test. Pass: fight as normal. Fail: fight with Disadvantage.",
  );
  await expect(page.getByTestId("combat-edge")).toHaveCount(0);
  await expect(page.getByTestId("roll-combat")).toHaveText("Resolve round 1");
  await expect(page.getByTestId("roll-combat")).toBeDisabled();
  await expect(page.getByTestId("combat-summary")).toHaveText("Round 1 of 2 · 0 wounds taken");
  await expect(page.getByTestId("combat-win-note")).toHaveText("Win → §39. This fight has no losing section.");
  await expect(page.getByTestId("fight-fortune-count")).toHaveText("Fortune 3 / 3");
});

test("a fail opens the fight with Disadvantage; the first 1 or 2 is replaced, and Fortune can re-roll that die", async ({ page }) => {
  await openMarsh(page, "reed-channel", "10");
  await rollTest(page, 6, 6);
  await expect(page.getByTestId("destination-fail")).toBeEnabled();
  await expect(page.getByTestId("destination-pass")).toBeDisabled();
  await page.getByTestId("destination-fail").click();

  // The test card stays as a settled result.
  await expect(page.getByTestId("test-panel")).toBeVisible();
  await expect(page.getByTestId("test-result")).toHaveText("6 + 6 = 12. Swimming +2. Fail.");
  await expect(page.getByTestId("test-hint")).toHaveCount(0);
  await expect(page.getByTestId("test-panel")).not.toContainText("Fight below");
  // Both outcome buttons stay: the matching one filled and disabled, the other ghost and disabled.
  await expect(page.getByTestId("destination-fail")).toBeDisabled();
  await expect(page.getByTestId("destination-fail")).not.toHaveClass(/ghost/);
  await expect(page.getByTestId("destination-pass")).toBeDisabled();
  await expect(page.getByTestId("destination-pass")).toHaveClass(/ghost/);
  await expect(page.getByTestId("open-full-test")).toBeVisible();
  await expect(page.getByTestId("roll-test")).toHaveCount(0);
  await expect(page.getByTestId("section-title")).toHaveText("§10");

  await expect(page.getByTestId("combat")).toHaveAttribute("data-edge", "disadvantage");
  await expect(page.getByTestId("combat-waiting")).toHaveCount(0);
  await expect(page.getByTestId("combat-edge")).toHaveText("Disadvantage");
  await expect(page.getByTestId("combat-rule")).toHaveText("You must re-roll the first 1 or 2 you roll each round, and take the second result.");
  await expect(page.getByTestId("reroll-order")).toHaveText(
    "Re-rolls: Disadvantage is automatic, before Fortune. Then Fortune, then Advantage. Advantage does not apply in this fight.",
  );
  await expect(page.getByTestId("advantage-reroll")).toHaveCount(0);
  await expect(page.getByTestId("roll-combat")).toBeEnabled();

  await resolve(page, 1, 4, 2, 5);
  await expect(page.getByTestId("old-die-2")).toBeVisible();
  await expect(page.getByTestId("old-die-2")).toHaveAttribute("aria-label", "Die 2 was 2, replaced");
  await expect(page.getByTestId("combat-roll")).toHaveText("4 + 5 = 9. You hold.");
  await expect(page.getByTestId("reroll-line")).toHaveText("Disadvantage re-rolled a 2 to a 5.");

  // Fortune on the die Disadvantage already replaced.
  await fight(page).getByTestId("die-2").click();
  await nextFaces(page, 3);
  await fight(page).getByTestId("fortune-reroll").click();
  await expect(page.getByTestId("combat-roll")).toHaveText("4 + 3 = 7. You hold.");
  await expect(page.getByTestId("reroll-line")).toHaveText(["Disadvantage re-rolled a 2 to a 5.", "Fortune re-rolled a 5 to a 3."]);
  await expect(page.getByTestId("old-die-2")).toBeVisible();
  await expect(page.getByTestId("sheet-stat-fortune")).toContainText("2");
  await expect(page.getByTestId("fight-fortune-count")).toHaveText("Fortune 2 / 3");

  // A reload keeps the settled test and the Disadvantage.
  await page.reload();
  await expect(page.getByTestId("combat-edge")).toHaveText("Disadvantage");
  await expect(page.getByTestId("test-result")).toHaveText("6 + 6 = 12. Swimming +2. Fail.");
  await expect(page.getByTestId("roll-combat")).toHaveText("Resolve round 2");
});

test("a pass gives Advantage: one free re-roll a round, after Fortune, also on the round that ends the fight", async ({ page }) => {
  await openMarsh(page, "toll-keeper", "20");
  await expect(page.getByTestId("combat-waiting")).toHaveText(
    "Waiting for the Stealth test. Pass: fight with Advantage. Fail: fight without Advantage.",
  );
  await expect(page.getByTestId("test-formula")).toHaveText("2d6 ≤ Talent 9 − 2 Stealth = 7");
  await rollTest(page, 2, 3);
  await expect(page.getByTestId("destination-pass")).toHaveText("Pass · Fight with Advantage");
  await expect(page.getByTestId("destination-fail")).toHaveText("Fail · Fight without Advantage");
  await expect(page.getByTestId("test-result")).toHaveText("2 + 3 = 5. Stealth −2. Pass.");
  await page.getByTestId("destination-pass").click();
  await expect(page.getByTestId("combat-edge")).toHaveText("Advantage");
  await expect(page.getByTestId("combat-rule")).toHaveText(
    "You may re-roll any one die, after other re-rolls, and must take the second result. Once per round.",
  );
  await expect(page.getByTestId("advantage-reroll")).toHaveText("Re-roll one die (Advantage)");
  await expect(page.getByTestId("advantage-reroll")).toBeDisabled();

  await resolve(page, 1, 6, 5);
  await expect(page.getByTestId("combat-roll")).toHaveText("6 + 5 = 11. You are hit.");
  await fight(page).getByTestId("die-1").click();
  await nextFaces(page, 1);
  await page.getByTestId("advantage-reroll").click();
  await expect(page.getByTestId("combat-roll")).toHaveText("1 + 5 = 6. You hold.");
  await expect(page.getByTestId("reroll-line")).toHaveText("Advantage re-rolled a 6 to a 1.");
  await fight(page).getByTestId("die-2").click();
  // Once a round, and nothing after it.
  await expect(page.getByTestId("advantage-reroll")).toBeDisabled();
  await expect(fight(page).getByTestId("fortune-reroll")).toBeDisabled();

  // The last round: the fight is over, but Advantage still applies before you continue.
  await nextFaces(page, 6, 6);
  await page.getByTestId("roll-combat").click();
  await expect(page.getByTestId("combat-outcome")).toHaveText("You win the fight · turn to §90");
  await expect(page.getByTestId("combat-vitality")).toHaveAttribute("aria-label", "Vitality 2 of 3");
  await fight(page).getByTestId("die-2").click();
  await nextFaces(page, 2);
  await page.getByTestId("advantage-reroll").click();
  await expect(page.getByTestId("combat-roll")).toHaveText("6 + 2 = 8. You hold.");
  await expect(page.getByTestId("combat-vitality")).toHaveAttribute("aria-label", "Vitality 3 of 3");
  await page.getByTestId("fight-continue").click();
  await expect(page.getByTestId("section-title")).toHaveText("§90");
  await expect(page.getByTestId("sheet-stat-vitality")).toHaveText("3");
});

test("an optional test can be skipped: the fight opens without Advantage", async ({ page }) => {
  await openMarsh(page, "heron", "30");
  await expect(page.getByTestId("combat-waiting")).toHaveText(
    "Waiting for the Stealth test. Pass: fight with Advantage. Fail or skip: fight without Advantage.",
  );
  await expect(page.getByTestId("destination-pass")).toHaveText("Pass · Fight with Advantage");
  await expect(page.getByTestId("destination-fail")).toHaveText("Fail · Fight without Advantage");
  await expect(page.getByTestId("skip-test")).toHaveText("Skip · Fight without Advantage");
  await expect(page.getByTestId("skip-test")).toHaveClass(/ghost/);
  await expect(page.getByTestId("skip-test")).toBeEnabled();
  const skipBox = await page.getByTestId("skip-test").boundingBox();
  expect(skipBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  await page.getByTestId("skip-test").click();
  await expect(page.getByTestId("test-hint")).toHaveText("Skipped. Fight without Advantage.");
  await expect(page.getByTestId("test-panel")).toBeVisible();
  await expect(page.getByTestId("destination-pass")).toBeDisabled();
  await expect(page.getByTestId("destination-fail")).toBeDisabled();
  await expect(page.getByTestId("skip-test")).toHaveCount(0);
  await expect(page.getByTestId("roll-test")).toHaveCount(0);
  await expect(page.getByTestId("combat")).toHaveAttribute("data-edge", "none");
  await expect(page.getByTestId("combat-edge")).toHaveCount(0);
  await expect(page.getByTestId("advantage-reroll")).toHaveCount(0);
  await expect(page.getByTestId("roll-combat")).toBeEnabled();
  // Undo brings the test back.
  await page.getByTestId("undo").click();
  await expect(page.getByTestId("skip-test")).toBeVisible();
});

test("a bargain test changes only the gold, then the fight opens; a skip pays the full price", async ({ page }) => {
  await openMarsh(page, "eel-seller", "80");
  await expect(page.getByTestId("combat-waiting")).toHaveText(
    "Waiting for the Diplomacy test. Pass: pay 3 gold, then fight. Fail or skip: pay 6 gold, then fight.",
  );
  await expect(page.getByTestId("skip-test")).toHaveText("Skip · Pay 6 gold, then fight");
  await page.getByTestId("skip-test").click();
  await expect(page.getByTestId("combat")).toHaveAttribute("data-edge", "none");
  await page.getByTestId("open-sheet").click();
  await expect(page.getByTestId("sheet-view")).toContainText("4 gp");
});

test("ticking either box removes the fight's Disadvantage and its automatic re-roll", async ({ page }) => {
  await openMarsh(page, "gnats", "70");
  await expect(page.getByTestId("combat-edge")).toHaveText("Disadvantage");
  await expect(page.getByTestId("combat-box-flight-spell")).not.toBeChecked();
  await expect(page.getByTestId("combat-boxes").locator("label")).toHaveText(["I can cast a flight spell", "I have a ranged weapon"]);
  const box = page.getByTestId("combat-box-ranged-weapon");
  const size = await box.boundingBox();
  expect(size?.width ?? 0).toBeGreaterThanOrEqual(20);
  await box.check();
  await expect(page.getByTestId("combat-edge")).toHaveCount(0);
  await expect(page.getByTestId("combat")).toHaveAttribute("data-edge", "none");
  await resolve(page, 1, 1, 2);
  await expect(page.getByTestId("combat-roll")).toHaveText("1 + 2 = 3. You hold.");
  await expect(page.getByTestId("reroll-line")).toHaveCount(0);
  await expect(page.getByTestId("combat-box-ranged-weapon")).toBeDisabled();
});

test("Advantage and Disadvantage cancel: no Advantage button, no automatic re-roll; Fortune still works", async ({ page }) => {
  await openMarsh(page, "wight", "85");
  await expect(page.getByTestId("combat-waiting")).toHaveText(
    "Waiting for the Swimming test. Pass: fight with Advantage. Fail: fight; Advantage and Disadvantage cancel.",
  );
  await rollTest(page, 6, 6);
  await page.getByTestId("destination-fail").click();
  await expect(page.getByTestId("combat-edge")).toHaveText("Advantage and Disadvantage cancel");
  await expect(page.getByTestId("combat-rule")).toHaveText(
    "A magic weapon grants Advantage. If the fight also has Disadvantage, they cancel and neither applies.",
  );
  await expect(page.getByTestId("combat")).toHaveAttribute("data-edge", "cancel");
  await expect(page.getByTestId("reroll-order")).toHaveText(
    "No Advantage button, and no automatic re-roll of a 1 or 2. Fortune still works as usual.",
  );
  await expect(page.getByTestId("advantage-reroll")).toHaveCount(0);
  await resolve(page, 1, 2, 5);
  await expect(page.getByTestId("combat-roll")).toHaveText("2 + 5 = 7. You hold.");
  await expect(page.getByTestId("reroll-line")).toHaveCount(0);
  await fight(page).getByTestId("die-1").click();
  await expect(fight(page).getByTestId("fortune-reroll")).toBeEnabled();
});

test("a pass that turns away never opens the fight; a fail starts it", async ({ page }) => {
  await openMarsh(page, "ferry-hut", "50");
  await expect(page.getByTestId("destination-pass")).toHaveText("Pass → §90");
  await expect(page.getByTestId("destination-fail")).toHaveText("Fail · Fight the Ferry guards, 1 round at −2");
  await expect(page.getByTestId("combat-waiting")).toHaveText(
    "Waiting for the Diplomacy test. Pass: turn to §90. Fail: fight the Ferry guards, 1 round at −2.",
  );
  await rollTest(page, 2, 2);
  await page.getByTestId("destination-pass").click();
  await expect(page.getByTestId("section-title")).toHaveText("§90");
  await expect(page.getByTestId("combat")).toHaveCount(0);

  await page.getByTestId("undo").click();
  await page.getByTestId("undo").click();
  await expect(page.getByTestId("section-title")).toHaveText("§50");
  await rollTest(page, 6, 6);
  await page.getByTestId("destination-fail").click();
  await expect(page.getByTestId("section-title")).toHaveText("§50");
  await expect(page.getByTestId("roll-combat")).toBeEnabled();
});

test("a fail that takes a Wound shows Vitality reduced before round 1, with no fight-round wounds", async ({ page }) => {
  await openMarsh(page, "boardwalk", "40");
  await expect(page.getByTestId("destination-fail")).toHaveText("Fail · Take a Wound, then fight");
  await rollTest(page, 6, 6);
  await page.getByTestId("destination-fail").click();
  await expect(page.getByTestId("combat-vitality")).toHaveAttribute("aria-label", "Vitality 2 of 3");
  await expect(page.getByTestId("combat-summary")).toHaveText("Round 1 of 1 · 0 wounds taken");
  await expect(page.getByTestId("combat-edge")).toHaveCount(0);
});

test("a two-handed weapon re-rolls the first 6 of a fight round, in any fight", async ({ page }) => {
  await page.goto(P35_FIXTURE_URL);
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await page.getByTestId("new-game").click();
  await page.getByTestId("create-skill-climbing").click();
  await page.getByTestId("create-skill-swimming").click();
  await page.getByTestId("create-weapon-two-handed").click();
  await page.getByTestId("create-begin").click();
  await page.getByTestId("choice-deep-channel").click();
  await expect(page.getByTestId("section-title")).toHaveText("§66");
  await expect(page.getByTestId("reroll-order")).toHaveText(
    "Re-rolls: your two-handed weapon re-rolls the first 6 automatically, before Fortune. Then Fortune.",
  );
  await resolve(page, 1, 3, 6, 2);
  await expect(page.getByTestId("old-die-2")).toHaveAttribute("aria-label", "Die 2 was 6, replaced");
  await expect(page.getByTestId("combat-roll")).toHaveText("3 + 2 = 5. You hold.");
  await expect(page.getByTestId("reroll-line")).toHaveText("Two-handed weapon re-rolled a 6 to a 2.");
});

test("a fight with a losing section is unchanged", async ({ page }) => {
  await openMarsh(page, "deep-channel", "66");
  await expect(page.getByTestId("combat")).toHaveAttribute("data-edge", "none");
  await expect(page.getByTestId("reroll-order")).toHaveCount(0);
  await expect(page.getByTestId("test-panel")).toHaveCount(0);
  await expect(page.getByTestId("combat-win-note")).toHaveCount(0);
  await resolve(page, 1, 6, 6);
  await nextFaces(page, 6, 6);
  await page.getByTestId("roll-combat").click();
  await expect(page.getByTestId("combat-outcome")).toHaveText("You win the fight · turn to §90");
  await page.getByTestId("fight-continue").click();
  await expect(page.getByTestId("section-title")).toHaveText("§90");
});

test("Test & fight shows the full test and the fight together", async ({ page }) => {
  await openMarsh(page, "reed-channel", "10");
  await page.getByTestId("open-full-test").click();
  await expect(page.getByTestId("test-full")).toBeVisible();
  await expect(page.getByTestId("test-view").getByTestId("combat")).toHaveAttribute("data-edge", "waiting");
  await page.getByTestId("dice-manual").click();
  await page.getByTestId("manual-die-1").fill("1");
  await page.getByTestId("manual-die-2").fill("2");
  await page.getByTestId("roll-test").click();
  await expect(page.getByTestId("destination-pass")).toBeEnabled();
  await page.getByTestId("destination-pass").click();
  // The result opens the fight on this screen.
  await expect(page.getByTestId("test-view").getByTestId("combat")).toHaveAttribute("data-edge", "none");
  await expect(page.getByTestId("test-view").getByTestId("roll-combat")).toBeEnabled();
});

test("the Rules screen lists Advantage, Disadvantage, and the two-handed re-roll as in the app", async ({ page }) => {
  await page.goto(P35_FIXTURE_URL);
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await page.getByTestId("side-rules").click();
  const combat = page.getByTestId("rules-combat");
  for (const start of ["With Advantage you may re-roll", "With Disadvantage you must re-roll", "A two-handed weapon re-rolls"]) {
    const line = combat.locator("li", { hasText: start });
    await expect(line).toHaveCount(1);
    await expect(line).toContainText("pp. 10–11");
    await expect(line).not.toContainText("Not yet in this app");
  }
});

test("the 390px layout keeps the replaced die, the badge, and the controls on screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openMarsh(page, "reed-channel", "10");
  await rollTest(page, 6, 6);
  await page.getByTestId("destination-fail").click();
  await resolve(page, 1, 4, 2, 5);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(390);
  for (const id of ["combat-edge", "old-die-2", "fortune-reroll", "roll-combat"]) {
    await fight(page).getByTestId(id).scrollIntoViewIfNeeded();
    const box = await fight(page).getByTestId(id).boundingBox();
    expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  }
  // Fortune: the button is full width, and the count sits on the line below, left-aligned.
  const button = await fight(page).getByTestId("fortune-reroll").boundingBox();
  const count = await fight(page).getByTestId("fight-fortune-count").boundingBox();
  const panel = await fight(page).boundingBox();
  expect(button && count && panel).toBeTruthy();
  if (button && count && panel) {
    expect(button.width).toBeGreaterThan(panel.width - 60);
    expect(count.y).toBeGreaterThanOrEqual(button.y + button.height - 1);
    expect(Math.abs(count.x - button.x)).toBeLessThanOrEqual(2);
  }
  await expect(page.getByTestId("combat-win-note")).toHaveText("Win → §39. This fight has no losing section.");
});

test("the 390px skip control is a full-width ghost button, 44px tall", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openMarsh(page, "heron", "30");
  const skip = page.getByTestId("skip-test");
  await expect(skip).toHaveText("Skip · Fight without Advantage");
  const box = await skip.boundingBox();
  const card = await page.getByTestId("test-panel").boundingBox();
  expect(box && card).toBeTruthy();
  if (box && card) {
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThan(card.width - 60);
  }
});
