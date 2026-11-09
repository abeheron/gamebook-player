import { expect, test } from "@playwright/test";

test("uses the parchment shell and only opens screens the app has", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.getByTestId("save-status")).toHaveText("Saved on this device");
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).toBe("rgb(246, 241, 231)");

  const labels = await page.locator("[data-testid=side-nav] button").allTextContents();
  expect(labels.map((label) => label.replace(/\s+/g, " ").trim())).toEqual([
    "Read",
    "Character",
    "Test & fight Not in this build",
    "Keywords & ticks",
    "Library Not in this build",
    "Rules Not in this build",
  ]);
  await expect(page.getByTestId("side-read")).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("sheet-stat-talent")).toHaveText("9");
  await expect(page.getByTestId("sheet-stat-fortune")).toHaveText("3");

  await page.getByTestId("side-library").focus();
  await expect(page.getByTestId("side-library")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("section-title")).toHaveText("The stair");
  await expect(page.getByTestId("side-read")).toHaveAttribute("aria-current", "page");

  await page.getByTestId("choice-take-lantern").click();
  await page.getByTestId("side-character").click();
  await expect(page.getByTestId("sheet-view")).toBeVisible();
  await expect(page.getByTestId("sheet-item-lantern")).toHaveText("Lantern");
  await expect(page.getByTestId("side-character")).toHaveAttribute("aria-current", "page");
});

test("keeps the same navigation on a 390px screen without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("save-status")).toHaveText("Saved on this device");
  await expect(page.getByTestId("mobile-nav")).toBeVisible();
  await expect(page.getByTestId("mobile-read")).toHaveAttribute("aria-current", "page");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.getByTestId("mobile-rules").focus();
  await expect(page.getByTestId("mobile-rules")).toBeFocused();
  await page.getByTestId("mobile-character").click();
  await expect(page.getByTestId("sheet-view")).toBeVisible();
  await expect(page.getByTestId("sheet-stat-vitality")).toHaveText("3");
  const overflowAfter = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflowAfter).toBeLessThanOrEqual(1);
});
