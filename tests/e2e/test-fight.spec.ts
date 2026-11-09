import { expect, test } from "@playwright/test";

test("opens the full skill test and keeps the destination locked until the dice settle", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("save-status")).toHaveText("Saved on this device");
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
  await expect(page.getByTestId("save-status")).toHaveText("Saved on this device");
  await page.getByTestId("choice-face-the-moth").click();
  await expect(page.getByTestId("section-title")).toHaveText("The pale moth");
  await page.getByTestId("side-test").click();
  await expect(page.getByTestId("combat")).toBeVisible();
  await expect(page.getByTestId("combat-formula")).toHaveText("2d6 ≤ Talent 9 − 1 = 8");
  await expect(page.getByTestId("fight-continue")).toHaveCount(0);
  await expect(page.getByTestId("combat-round-caption")).toHaveText("Round 1 of 2");
  await expect(page.getByTestId("combat-marker-1")).toHaveAttribute("aria-label", "Round 1: current");
  await expect(page.getByTestId("combat-marker-2")).toHaveAttribute("aria-label", "Round 2: upcoming");
  await page.getByTestId("roll-combat").click();
  await expect(page.getByTestId("combat-roll")).toBeVisible();
  await expect(page.getByTestId("fight-continue")).toHaveCount(0);
  await expect(page.getByTestId("combat-round-caption")).toHaveText("Round 2 of 2");
  const firstRound = await page.getByTestId("combat-roll").innerText();
  if (firstRound.includes("You are hit.")) {
    await expect(page.getByTestId("combat-marker-1")).toHaveAttribute("aria-label", "Round 1: wound");
    await expect(page.getByTestId("combat-marker-1")).toHaveText("✗");
  } else {
    await expect(page.getByTestId("combat-marker-1")).toHaveAttribute("aria-label", "Round 1: held");
    await expect(page.getByTestId("combat-marker-1")).toHaveText("✓");
  }
  await expect(page.getByTestId("combat-marker-2")).toHaveAttribute("aria-label", "Round 2: current");
  await expect(page.getByTestId("section-title")).toHaveCount(0);
  await page.getByTestId("roll-combat").click();
  await expect(page.getByTestId("fight-continue")).toBeVisible();
});

test("opens the test screen on a phone without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("save-status")).toHaveText("Saved on this device");
  await page.getByTestId("choice-take-lantern").click();
  await page.getByTestId("choice-tick-and-study").click();
  await page.getByTestId("mobile-test").click();
  await expect(page.getByTestId("test-formula")).toContainText("Linguistics");
  await expect(page.getByTestId("destination-go")).toHaveCount(0);
  await expect(page.getByTestId("mobile-test")).toHaveAttribute("aria-current", "page");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
