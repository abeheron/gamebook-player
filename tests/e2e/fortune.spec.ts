import { expect, test } from "@playwright/test";

async function reachMark(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await page.getByTestId("choice-take-lantern").click();
  await page.getByTestId("choice-tick-and-study").click();
  await expect(page.getByTestId("section-title")).toHaveText("The mark");
}

test("spends Fortune on a selected die until the cap and keeps the roll after reload", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await reachMark(page);
  await page.getByTestId("open-test").click();
  await expect(page.getByTestId("fortune-count")).toHaveText("Fortune 3 / 3");
  await expect(page.getByTestId("fortune-reroll")).toBeDisabled();
  await page.getByTestId("roll-test").click();
  await expect(page.getByTestId("test-result")).toContainText("=");
  await expect(page.getByTestId("autosave")).toHaveAttribute("data-phase", "saved");
  const before = await page.getByTestId("test-result").innerText();

  await page.getByTestId("die-1").click();
  await expect(page.getByTestId("die-1")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("fortune-reroll").click();
  await expect(page.getByTestId("fortune-count")).toHaveText("Fortune 2 / 3");
  await expect(page.getByTestId("sheet-stat-fortune")).toHaveText("2");

  await page.getByTestId("die-2").click();
  await page.getByTestId("fortune-reroll").click();
  await expect(page.getByTestId("fortune-count")).toHaveText("Fortune 1 / 3");
  await page.getByTestId("die-1").click();
  await page.getByTestId("fortune-reroll").click();
  await expect(page.getByTestId("fortune-count")).toHaveText("Fortune 0 / 3");
  await expect(page.getByTestId("fortune-reroll")).toBeDisabled();
  const settled = await page.getByTestId("test-result").innerText();
  expect(settled).not.toBe("");

  await expect(page.getByTestId("autosave")).toHaveAttribute("data-phase", "saved");
  await page.reload();
  await expect(page.getByTestId("test-panel")).toBeVisible();
  await expect(page.getByTestId("test-result")).toHaveText(settled);
  await expect(page.getByTestId("fortune-count")).toHaveText("Fortune 0 / 3");
  await expect(page.getByTestId("section-title")).toHaveText("The mark");
  expect(before.length).toBeGreaterThan(0);
});

test("shows the same Fortune control on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await reachMark(page);
  await page.getByTestId("open-test").click();
  await page.getByTestId("roll-test").click();
  await expect(page.getByTestId("die-1")).toBeVisible();
  await page.getByTestId("die-1").click();
  await expect(page.getByTestId("fortune-reroll")).toBeEnabled();
  const box = await page.getByTestId("die-1").boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(40);
});
