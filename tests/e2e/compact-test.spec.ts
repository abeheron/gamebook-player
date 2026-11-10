import { expect, test } from "@playwright/test";

async function reachMark(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await page.getByTestId("choice-take-lantern").click();
  await page.getByTestId("choice-tick-and-study").click();
  await expect(page.getByTestId("section-title")).toHaveText("The mark");
  await expect(page.getByTestId("sheet-tick-landing-box")).toContainText("Landing box: 1");
}

test("opens a compact test beside the passage on a desktop width", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 520 });
  await reachMark(page);
  const tick = await page.getByTestId("sheet-tick-landing-box").innerText();
  await page.getByTestId("open-test").scrollIntoViewIfNeeded();
  const scroll = await page.evaluate(() => window.scrollY);
  await page.getByTestId("open-test").click();
  await expect(page.getByTestId("test-panel")).toBeVisible();
  await expect(page.getByTestId("test-formula")).toHaveText("2d6 ≤ Talent 9 + 2 Linguistics = 11");
  await expect(page.getByTestId("section-body")).toBeVisible();
  await expect(page.getByTestId("destination-pass")).toBeDisabled();
  await expect(page.getByTestId("destination-fail")).toBeDisabled();
  expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
  expect(await page.getByTestId("sheet-tick-landing-box").innerText()).toBe(tick);

  await page.getByTestId("roll-test").evaluate((button) => {
    if (button instanceof HTMLButtonElement) {
      button.click();
      button.click();
    }
  });
  await expect(page.getByTestId("test-result")).toHaveCount(1);
  await expect(page.getByTestId("test-result")).toContainText(/Linguistics \+2|Double 1|Double 6/);
  await expect(page.locator("[data-testid=destination-pass]:enabled, [data-testid=destination-fail]:enabled")).toHaveCount(1);
  const result = await page.getByTestId("test-result").innerText();

  await page.getByTestId("close-test").click();
  await expect(page.getByTestId("test-panel")).toHaveCount(0);
  await expect(page.getByTestId("open-test")).toBeFocused();
  await page.getByTestId("open-test").click();
  await expect(page.getByTestId("test-result")).toHaveText(result);
  await expect(page.getByTestId("roll-test")).toHaveCount(0);

  await page.getByTestId("open-full-test").click();
  await expect(page.getByTestId("test-full")).toBeVisible();
  await expect(page.getByTestId("test-result")).toHaveText(result);
  await page.getByTestId("view-back").click();
  await expect(page.getByTestId("test-panel")).toBeVisible();
  await expect(page.getByTestId("test-result")).toHaveText(result);
  await expect(page.getByTestId("section-title")).toHaveText("The mark");

  await page.evaluate(() => {
    const pass = document.querySelector("[data-testid=destination-pass]");
    const fail = document.querySelector("[data-testid=destination-fail]");
    const button = pass instanceof HTMLButtonElement && !pass.disabled ? pass : fail;
    if (button instanceof HTMLButtonElement) {
      button.click();
      button.click();
    }
  });
  await expect(page.getByTestId("section-title")).not.toHaveText("The mark");
  await page.getByTestId("undo").click();
  await expect(page.getByTestId("section-title")).toHaveText("The mark");
});

test("keeps the compact test on a phone width and restores focus with Esc", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await reachMark(page);
  await page.getByTestId("open-test").scrollIntoViewIfNeeded();
  const scroll = await page.evaluate(() => window.scrollY);
  await page.getByTestId("open-test").click();
  await expect(page.getByTestId("test-panel")).toBeVisible();
  await expect(page.getByTestId("section-body")).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("test-panel")).toHaveCount(0);
  await expect(page.getByTestId("open-test")).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
  await expect(page.getByTestId("section-title")).toHaveText("The mark");
});

test("shows the absent-skill penalty on its own test", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await page.getByTestId("choice-take-lantern").click();
  await page.getByTestId("choice-search-crack").click();
  await expect(page.getByTestId("section-title")).toHaveText("The crack");
  await page.getByTestId("open-test").click();
  await expect(page.getByTestId("test-formula")).toHaveText("2d6 ≤ Talent 9 − 2 Search = 7");
  await page.getByTestId("roll-test").click();
  await expect(page.getByTestId("test-result")).toContainText(/Search −2|Double 1|Double 6/);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("test-panel")).toHaveCount(0);
  await expect(page.getByTestId("open-test")).toBeFocused();
  await expect(page.getByTestId("section-title")).toHaveText("The crack");
});

test("leaves the full-screen fight on its own path", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await page.getByTestId("choice-climb-dark").click();
  await page.getByTestId("choice-keep-climbing").click();
  await expect(page.getByTestId("combat")).toBeVisible();
  await expect(page.getByTestId("roll-combat")).toBeVisible();
  await expect(page.getByTestId("open-test")).toHaveCount(0);
  await expect(page.getByTestId("test-panel")).toHaveCount(0);
});
