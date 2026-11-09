import { expect, test } from "@playwright/test";

test("opens the rules summary and returns without moving the story", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 480 });
  await page.goto("/");
  await expect(page.getByTestId("save-status")).toHaveText("Saved on this device");
  await page.evaluate(() => window.scrollTo(0, 200));
  const scroll = await page.evaluate(() => window.scrollY);
  expect(scroll).toBeGreaterThan(0);
  await page.getByTestId("side-rules").click();
  await expect(page.getByTestId("rules-view")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rules" })).toBeVisible();
  await expect(page.getByTestId("rules-credit")).toHaveText("GNAT core rules by David M. Donachie, CC BY-SA 4.0");
  await expect(page.getByTestId("rules-skills")).toContainText("Climbing");
  await expect(page.getByTestId("rules-skills")).toContainText("pp. 7–8");
  await expect(page.getByTestId("rules-fortune")).toContainText("Not yet in this app");
  await expect(page.getByTestId("rules-fortune")).toContainText("pp. 8–9");
  await expect(page.getByTestId("side-rules")).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("section-title")).toHaveCount(0);

  await page.getByTestId("view-back").click();
  await expect(page.getByTestId("section-title")).toHaveText("The stair");
  expect(await page.evaluate(() => window.scrollY)).toBe(scroll);

  await page.getByTestId("side-rules").click();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("section-title")).toHaveText("The stair");
  expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
});

test("opens rules from the phone navigation without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("save-status")).toHaveText("Saved on this device");
  await page.getByTestId("mobile-rules").click();
  await expect(page.getByTestId("rules-view")).toBeVisible();
  await expect(page.getByTestId("rules-xp")).toContainText("p. 13");
  await expect(page.getByTestId("rules-xp")).toContainText("Not yet in this app");
  await expect(page.getByTestId("mobile-rules")).toHaveAttribute("aria-current", "page");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
