import { expect, test } from "@playwright/test";

test("remembers the dice toggles and keeps the sound credit", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("save-status")).toHaveText("Saved on this device");
  await page.getByTestId("side-test").click();
  await expect(page.getByTestId("dice-anim")).toBeChecked();
  await expect(page.getByTestId("dice-sound")).toBeChecked();
  await expect(page.getByTestId("dice-credit")).toContainText("Wuzzy");
  await expect(page.getByTestId("dice-credit").locator("a")).toHaveAttribute(
    "href",
    "https://opengameart.org/content/wooden-dice-on-wodden-table-roll",
  );

  await page.getByTestId("dice-sound").uncheck();
  await page.getByTestId("dice-anim").uncheck();
  await page.reload();
  await expect(page.getByTestId("save-status")).toHaveText(/Saved|Restored/);
  await page.getByTestId("side-test").click();
  await expect(page.getByTestId("dice-sound")).not.toBeChecked();
  await expect(page.getByTestId("dice-anim")).not.toBeChecked();
});

test("starts with animation off when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("save-status")).toHaveText("Saved on this device");
  await page.getByTestId("mobile-test").click();
  await expect(page.getByTestId("dice-anim")).not.toBeChecked();
  await expect(page.getByTestId("dice-sound")).toBeChecked();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("locks the destination until an animated roll settles", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("save-status")).toHaveText("Saved on this device");
  await page.getByTestId("choice-take-lantern").click();
  await page.getByTestId("choice-tick-and-study").click();
  await page.getByTestId("side-test").click();
  await expect(page.getByTestId("dice-anim")).toBeChecked();
  await page.getByTestId("roll-test").click();
  await expect(page.getByTestId("test-result")).toHaveText("Rolling…");
  await expect(page.locator(".die.rolling")).toHaveCount(2);
  await expect(page.getByTestId("destination-go")).toHaveCount(0);
  await expect(page.getByTestId("destination-go")).toBeVisible();
  await expect(page.getByTestId("test-result")).not.toHaveText("Rolling…");
});

test("pulses the current fight round only while the dice are rolling", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("save-status")).toHaveText("Saved on this device");
  await page.getByTestId("choice-face-the-moth").click();
  await page.getByTestId("side-test").click();
  await page.getByTestId("roll-combat").click();
  await expect(page.locator(".r.cur.rolling")).toHaveCount(1);
  await expect(page.getByTestId("dice-rolling")).toHaveText("Rolling…");
  await expect(page.getByTestId("fight-continue")).toHaveCount(0);
  await expect(page.getByTestId("combat-roll")).toBeVisible();
  await expect(page.locator(".r.cur.rolling")).toHaveCount(0);
});
