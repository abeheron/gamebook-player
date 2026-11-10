import { expect, test } from "@playwright/test";

test("opens the full skill test and keeps the destination locked until the dice settle", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await page.getByTestId("side-test").click();
  await expect(page.getByTestId("test-empty")).toBeVisible();
  await expect(page.getByTestId("destination-go")).toHaveCount(0);
  await page.getByTestId("view-back").click();

  await page.getByTestId("choice-take-lantern").click();
  await page.getByTestId("choice-tick-and-study").click();
  await page.getByTestId("side-test").click();
  await expect(page.getByRole("heading", { name: "Test & fight" })).toBeVisible();
  await expect(page.getByTestId("test-formula")).toHaveText("2d6 ≤ Talent 9 + 2 Linguistics = 11");
  await expect(page.getByTestId("destination-go")).toHaveCount(0);
  await expect(page.getByTestId("manual-dice")).toHaveCount(0);
  await expect(page.getByTestId("side-test")).toHaveAttribute("aria-current", "page");

  await page.getByTestId("dice-manual").click();
  await page.getByTestId("manual-die-1").fill("7");
  await page.getByTestId("manual-die-2").fill("1");
  await page.getByTestId("roll-test").click();
  await expect(page.getByTestId("manual-error")).toHaveText("Each die must be a whole number from 1 to 6.");
  await expect(page.getByTestId("test-result")).toHaveCount(0);
  await expect(page.getByTestId("destination-go")).toHaveCount(0);

  await page.getByTestId("manual-die-1").fill("1");
  await page.getByTestId("manual-die-2").fill("1");
  await page.getByTestId("roll-test").click();
  await expect(page.getByTestId("test-result")).toHaveText("1 + 1 = 2. Linguistics +2. Pass.");
  await expect(page.getByTestId("destination-go")).toHaveCount(1);
  await expect(page.getByTestId("manual-dice")).toHaveCount(0);

  await page.getByTestId("view-back").click();
  await page.getByTestId("open-test").click();
  await expect(page.getByTestId("test-panel")).toBeVisible();
  await expect(page.getByTestId("test-result")).toHaveText("1 + 1 = 2. Linguistics +2. Pass.");
  await expect(page.getByTestId("destination-go")).toHaveCount(1);
  await expect(page.getByTestId("manual-dice")).toHaveCount(0);
});

test("runs the passage fight on the test screen and withholds the ending until the rounds are done", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await page.getByTestId("choice-face-the-moth").click();
  await expect(page.getByTestId("section-title")).toHaveText("The pale moth");
  await page.getByTestId("side-test").click();
  await expect(page.getByTestId("combat")).toBeVisible();
  await expect(page.getByTestId("combat-formula")).toHaveText("2d6 ≤ Talent 9 − 1 = 8");
  await expect(page.getByTestId("fight-continue")).toHaveCount(0);
  await expect(page.getByTestId("combat-summary")).toHaveText("Round 1 of 2 · 0 wounds taken");
  await expect(page.getByTestId("combat-vitality")).toContainText("3/3");
  await expect(page.getByTestId("combat-marker-1")).toHaveAttribute("aria-label", "Round 1: now");
  await expect(page.getByTestId("combat-marker-1")).toContainText("now");
  await expect(page.getByTestId("combat-marker-1")).toContainText("1");
  await expect(page.getByTestId("combat-marker-2")).toHaveAttribute("aria-label", "Round 2: later");
  await page.getByTestId("roll-combat").click();
  await expect(page.getByTestId("combat-roll")).toBeVisible();
  await expect(page.getByTestId("fight-continue")).toHaveCount(0);
  const firstRound = await page.getByTestId("combat-roll").innerText();
  if (firstRound.includes("You are hit.")) {
    await expect(page.getByTestId("combat-summary")).toHaveText("Round 2 of 2 · 1 wound taken");
    await expect(page.getByTestId("combat-vitality")).toContainText("2/3");
    await expect(page.getByTestId("combat-marker-1")).toHaveAttribute("aria-label", "Round 1: wound");
    await expect(page.getByTestId("combat-marker-1")).toContainText("wound");
  } else {
    await expect(page.getByTestId("combat-summary")).toHaveText("Round 2 of 2 · 0 wounds taken");
    await expect(page.getByTestId("combat-marker-1")).toHaveAttribute("aria-label", "Round 1: held");
    await expect(page.getByTestId("combat-marker-1")).toContainText("held");
  }
  await expect(page.getByTestId("combat-marker-2")).toHaveAttribute("aria-label", "Round 2: now");
  await expect(page.getByTestId("section-title")).toHaveCount(0);
  await page.getByTestId("roll-combat").click();
  await expect(page.getByTestId("fight-continue")).toBeVisible();
  await expect(page.getByTestId("combat-outcome")).toContainText("You win the fight");
});

test("wraps the fight tracker on a phone without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await page.getByTestId("choice-face-the-moth").click();
  await page.getByTestId("mobile-test").click();
  await expect(page.getByTestId("combat-summary")).toContainText("Round 1 of 2");
  await expect(page.getByTestId("combat-vitality")).toContainText("3/3");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("new game from the test screen returns to the opening", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await page.getByTestId("choice-take-lantern").click();
  await page.getByTestId("side-test").click();
  await expect(page.getByRole("heading", { name: "Test & fight" })).toBeVisible();
  await page.getByTestId("new-game").click();
  await expect(page.getByTestId("section-title")).toHaveText("The stair");
  await expect(page.getByTestId("side-read")).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("test-view")).toHaveCount(0);
  await expect(page.getByTestId("view-back")).toHaveCount(0);
});

test("opens the test screen on a phone without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await page.getByTestId("choice-take-lantern").click();
  await page.getByTestId("choice-tick-and-study").click();
  await page.getByTestId("mobile-test").click();
  await expect(page.getByTestId("test-formula")).toContainText("Linguistics");
  await expect(page.getByTestId("destination-go")).toHaveCount(0);
  await expect(page.getByTestId("mobile-test")).toHaveAttribute("aria-current", "page");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
