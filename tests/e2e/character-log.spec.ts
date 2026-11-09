import { expect, test } from "@playwright/test";

test("opens the character sheet from the summary and lists only real fields", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("save-status")).toHaveText("Saved on this device");
  await page.getByTestId("choice-take-lantern").click();
  await page.getByTestId("open-sheet").click();
  await expect(page.getByTestId("sheet-view")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Character" })).toBeVisible();
  await expect(page.getByTestId("sheet-stat-talent")).toHaveText("9");
  await expect(page.getByTestId("sheet-item-lantern")).toHaveText("Lantern");
  await expect(page.getByTestId("sheet-missing")).toContainText("skills, titles, or money");
  await expect(page.getByText("Gold")).toHaveCount(0);
  await expect(page.getByTestId("side-character")).toHaveAttribute("aria-current", "page");
});

test("searches the shared keyword and tick log without changing the story", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 640 });
  await page.goto("/");
  await expect(page.getByTestId("save-status")).toHaveText("Saved on this device");
  await page.getByTestId("choice-take-lantern").click();
  await page.getByTestId("choice-tick-and-study").click();
  const tick = await page.getByTestId("sheet-tick-landing-box").innerText();
  await page.evaluate(() => window.scrollTo(0, 140));
  const scroll = await page.evaluate(() => window.scrollY);
  await page.getByTestId("side-keywords").click();
  await expect(page.getByTestId("log-view")).toBeVisible();
  await expect(page.getByTestId("log-row-landing-box")).toContainText("Landing box");
  await expect(page.getByTestId("side-keywords")).toHaveAttribute("aria-current", "page");
  await page.getByTestId("log-search").fill("Landing");
  await expect(page.getByTestId("log-row-landing-box")).toBeVisible();
  await page.getByTestId("log-search").fill("zzzz");
  await expect(page.getByTestId("log-empty")).toHaveText("No matches.");
  await page.getByTestId("view-back").click();
  await expect(page.getByTestId("section-title")).toHaveText("The mark");
  expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
  expect(await page.getByTestId("sheet-tick-landing-box").innerText()).toBe(tick);

  await page.getByTestId("side-keywords").click();
  await page.getByTestId("log-search").fill("Landing");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("section-title")).toHaveText("The mark");
  expect(await page.getByTestId("sheet-tick-landing-box").innerText()).toBe(tick);
});

test("opens the log from the phone navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("save-status")).toHaveText("Saved on this device");
  await page.getByTestId("choice-take-lantern").click();
  await page.getByTestId("choice-tick-and-study").click();
  await page.getByTestId("mobile-keywords").click();
  await page.getByTestId("log-search").fill("Landing");
  await expect(page.getByTestId("log-row-landing-box")).toBeVisible();
  await expect(page.getByTestId("mobile-keywords")).toHaveAttribute("aria-current", "page");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
