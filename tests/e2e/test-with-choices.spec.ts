import { expect, test, type Page } from "@playwright/test";
import { FIXTURE_URL, P32_FIXTURE_URL } from "./support/fixture";
import { copperPdf } from "./support/sample-import";

const ALWAYS_OPEN = ["follow-stream", "climb-oak", "leave-glade"];

async function openGlade(page: Page): Promise<void> {
  await page.goto(P32_FIXTURE_URL);
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await expect(page.getByTestId("section-title")).toHaveText("§1");
}

/** Rolls the chosen faces through Full test → My dice, then goes back to the reading view. */
async function rollMyDice(page: Page, first: number, second: number): Promise<void> {
  await page.getByTestId("open-full-test").click();
  await expect(page.getByTestId("test-full")).toBeVisible();
  await page.getByTestId("dice-manual").click();
  await page.getByTestId("manual-die-1").fill(String(first));
  await page.getByTestId("manual-die-2").fill(String(second));
  await page.getByTestId("roll-test").click();
  await expect(page.getByTestId("test-result")).not.toHaveText("Rolling…");
  await page.getByTestId("view-back").click();
  await expect(page.getByTestId("section-title")).toHaveText("§1");
}

test("shows the standing test card, Or choose:, and the locked fail-only choice before the test", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openGlade(page);
  const card = page.getByTestId("test-panel");
  await expect(card).toBeVisible();
  await expect(page.getByTestId("open-test")).toHaveCount(0);
  await expect(page.getByTestId("close-test")).toHaveCount(0);
  await expect(page.getByTestId("open-full-test")).toBeVisible();
  await expect(page.getByTestId("test-formula")).toHaveText("2d6 ≤ Talent 9 + 2 Naturalist = 11");
  await expect(page.getByTestId("destination-pass")).toHaveText("Pass → §14");
  await expect(page.getByTestId("destination-pass")).toBeDisabled();
  await expect(page.getByTestId("destination-fail")).toHaveCount(0);
  await expect(page.getByTestId("test-hint")).toHaveText("If you fail, choose from the options below.");
  await expect(page.getByTestId("or-choose")).toHaveText("Or choose:");

  // The order is test card, then Or choose:, then the choices.
  const cardBox = await card.boundingBox();
  const labelBox = await page.getByTestId("or-choose").boundingBox();
  const listBox = await page.getByTestId("choices").boundingBox();
  expect(labelBox!.y).toBeGreaterThan(cardBox!.y + cardBox!.height);
  expect(listBox!.y).toBeGreaterThan(labelBox!.y);

  await expect(page.getByTestId("choice-eat-anyway")).toBeDisabled();
  await expect(page.getByTestId("choice-why-eat-anyway")).toHaveText("Only if the Naturalist test fails.");
  await expect(page.getByTestId("choice-to-eat-anyway")).toHaveText("§23");
  for (const id of ALWAYS_OPEN) await expect(page.getByTestId(`choice-${id}`)).toBeEnabled();
  await expect(page.getByTestId("choice-to-follow-stream")).toHaveText("§8");
  await expect(page.getByTestId("choice-to-climb-oak")).toHaveText("§31");
  await expect(page.getByTestId("choice-to-leave-glade")).toHaveText("§40");
  // The section number sits on the right of the card, muted while locked.
  const choice = await page.getByTestId("choice-follow-stream").boundingBox();
  const to = await page.getByTestId("choice-to-follow-stream").boundingBox();
  expect(to!.x + to!.width).toBeGreaterThan(choice!.x + choice!.width - 40);
  const locked = await page.getByTestId("choice-to-eat-anyway").evaluate((node) => getComputedStyle(node).color);
  const open = await page.getByTestId("choice-to-follow-stream").evaluate((node) => getComputedStyle(node).color);
  expect(locked).not.toBe(open);
});

test("opens the fail-only choice after a failed test and keeps Pass locked", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openGlade(page);
  await rollMyDice(page, 6, 6);
  const result = page.getByTestId("test-result");
  await expect(result).toHaveClass(/bad/);
  await expect(result).toHaveCSS("color", "rgb(155, 42, 31)");
  await expect(page.getByTestId("test-hint")).toHaveText("The test failed. Choose below.");
  await expect(page.getByTestId("destination-pass")).toBeDisabled();
  await expect(page.getByTestId("choice-eat-anyway")).toBeEnabled();
  await expect(page.getByTestId("choice-why-eat-anyway")).toHaveCount(0);
  for (const id of ALWAYS_OPEN) await expect(page.getByTestId(`choice-${id}`)).toBeEnabled();

  await page.getByTestId("choice-eat-anyway").click();
  await expect(page.getByTestId("section-title")).toHaveText("§23");
});

test("locks the fail-only choice again when a Fortune re-roll turns the fail into a pass", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openGlade(page);
  await rollMyDice(page, 6, 6);
  await expect(page.getByTestId("choice-eat-anyway")).toBeEnabled();
  // The next die face is 1, so the re-rolled pair is 1 + 6 = 7, a pass.
  await page.evaluate(() => {
    Math.random = () => 0;
  });
  await page.getByTestId("die-1").click();
  await page.getByTestId("fortune-reroll").click();
  await expect(page.getByTestId("fortune-count")).toHaveText("Fortune 2 / 3");
  await expect(page.getByTestId("test-result")).toHaveClass(/ok/);
  await expect(page.getByTestId("destination-pass")).toBeEnabled();
  await expect(page.getByTestId("choice-eat-anyway")).toBeDisabled();
  await expect(page.getByTestId("choice-why-eat-anyway")).toHaveText("Only if the Naturalist test fails.");
  await page.getByTestId("destination-pass").click();
  await expect(page.getByTestId("section-title")).toHaveText("§14");
});

test("takes an always-open choice without rolling", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openGlade(page);
  await page.getByTestId("choice-climb-oak").click();
  await expect(page.getByTestId("section-title")).toHaveText("§31");
  await expect(page.getByTestId("test-panel")).toHaveCount(0);
});

test("turns to the pass section after a pass", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openGlade(page);
  await rollMyDice(page, 1, 1);
  await expect(page.getByTestId("test-result")).toHaveClass(/ok/);
  await expect(page.getByTestId("destination-pass")).toBeEnabled();
  await expect(page.getByTestId("choice-eat-anyway")).toBeDisabled();
  await page.getByTestId("destination-pass").click();
  await expect(page.getByTestId("section-title")).toHaveText("§14");
  await expect(page.getByTestId("choice-to-back-to-glade")).toHaveText("§1");
});

test("the full test view follows the same destinations and hint", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openGlade(page);
  await page.getByTestId("open-full-test").click();
  await expect(page.getByTestId("test-full")).toBeVisible();
  await expect(page.getByTestId("destination-fail")).toHaveCount(0);
  await expect(page.getByTestId("test-hint")).toHaveText("If you fail, choose from the options below.");
  await expect(page.getByTestId("choices")).toHaveCount(0);
});

test("keeps open-test and Close on a test-only section, and §N on ordinary choices", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(FIXTURE_URL);
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await expect(page.getByTestId("choice-to-take-lantern")).toHaveText("§2");
  await expect(page.getByTestId("or-choose")).toHaveCount(0);
  await page.getByTestId("choice-take-lantern").click();
  await page.getByTestId("choice-tick-and-study").click();
  await expect(page.getByTestId("section-title")).toHaveText("The mark");
  await expect(page.getByTestId("test-panel")).toHaveCount(0);
  await expect(page.getByTestId("open-test")).toContainText("test");
  await page.getByTestId("open-test").click();
  await expect(page.getByTestId("close-test")).toBeVisible();
  await expect(page.getByTestId("destination-fail")).toBeVisible();
  await expect(page.getByTestId("test-hint")).toHaveCount(0);
});

test("fits a 390px phone with the Fortune count under the re-roll button", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openGlade(page);
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await overflow()).toBeLessThanOrEqual(0);
  const reroll = await page.getByTestId("fortune-reroll").boundingBox();
  const roll = await page.getByTestId("roll-test").boundingBox();
  expect(Math.abs(roll!.width - reroll!.width)).toBeLessThanOrEqual(1);
  const count = await page.getByTestId("fortune-count").boundingBox();
  expect(count!.y).toBeGreaterThanOrEqual(reroll!.y + reroll!.height - 1);
  expect(Math.abs(count!.x - reroll!.x)).toBeLessThanOrEqual(1);
  // Choices stack in one column.
  const first = await page.getByTestId("choice-eat-anyway").boundingBox();
  const second = await page.getByTestId("choice-follow-stream").boundingBox();
  expect(second!.y).toBeGreaterThan(first!.y + first!.height - 1);
  expect(Math.abs(second!.x - first!.x)).toBeLessThanOrEqual(1);

  await rollMyDice(page, 6, 6);
  await expect(page.getByTestId("choice-eat-anyway")).toBeEnabled();
  expect(await overflow()).toBeLessThanOrEqual(0);
});

test("the import review can keep a test beside choices, with no fail link and a fail-only choice", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.getByTestId("import-input")).toBeAttached();
  await page.getByTestId("import-input").setInputFiles(copperPdf);
  await expect(page.getByTestId("review")).toBeVisible();
  // §4 has the one flagged link in the original sample.
  await page.getByTestId("review-section-3").click();
  await page.getByTestId("review-choice-to-0").fill("5");
  await page.getByTestId("review-mark").click();

  // §2 is a test. Leave its fail link blank and add two choices beside it, one of them fail-only.
  await page.getByTestId("review-section-1").click();
  await expect(page.getByTestId("review-pass")).toHaveValue("4");
  await page.getByTestId("review-fail").fill("");
  await page.getByTestId("review-add-choice").click();
  await page.getByTestId("review-choice-label-0").fill("Drop the lantern");
  await page.getByTestId("review-choice-to-0").fill("3");
  await page.getByTestId("review-choice-fail-only-0").check();
  await page.getByTestId("review-add-choice").click();
  await page.getByTestId("review-choice-label-1").fill("Go back down");
  await page.getByTestId("review-choice-to-1").fill("1");
  await expect(page.getByTestId("review-choice-fail-only-1")).not.toBeChecked();
  await page.getByTestId("review-add").click();
  await expect(page.getByTestId("library-book-the-copper-lantern")).toBeVisible();

  await page.getByTestId("library-continue-the-copper-lantern").click();
  await page.getByTestId("create-skill-climbing").click();
  await page.getByTestId("create-skill-occult").click();
  await page.getByTestId("create-weapon-one-handed").click();
  await page.getByTestId("create-begin").click();
  await expect(page.getByTestId("section-title")).toHaveText("§1");
  await page.getByTestId("choice-c1").click();
  await expect(page.getByTestId("section-title")).toHaveText("§2");
  await expect(page.getByTestId("test-panel")).toBeVisible();
  await expect(page.getByTestId("close-test")).toHaveCount(0);
  await expect(page.getByTestId("or-choose")).toHaveText("Or choose:");
  await expect(page.getByTestId("choice-c1")).toBeDisabled();
  await expect(page.getByTestId("choice-why-c1")).toHaveText("Only if the Talent test fails.");
  await expect(page.getByTestId("choice-c2")).toBeEnabled();
});
