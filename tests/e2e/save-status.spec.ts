import { expect, test } from "@playwright/test";

test("shows the autosave time and leaves the toolbar without a save line", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const note = page.getByTestId("autosave");
  await expect(note).toHaveText(/✓\s*Autosaved on this device · \d{2}:\d{2}/);
  await expect(note).toHaveAttribute("aria-live", "polite");
  await expect(page.getByTestId("save-status")).toHaveCount(0);
  await expect(page.locator(".toolbar")).toHaveText(/Undo turn\s*New game/);
  const color = await note.evaluate((el) => getComputedStyle(el).color);
  expect(color).toBe("rgb(92, 83, 72)");
});

test("shows Saving only when the write is slow", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("gbp-save-delay", "1200"));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const note = page.getByTestId("autosave");
  await expect(note).toContainText("Saving…");
  await expect(note).toHaveAttribute("aria-live", "polite");
  await expect(note.locator(".dot")).toBeVisible();
  await expect(note).toHaveText(/✓\s*Autosaved on this device · \d{2}:\d{2}/);
  await expect(page.getByTestId("save-status")).toHaveCount(0);
});

test("keeps a refused save until Try again succeeds", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("gbp-save-fail", "1"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const note = page.getByTestId("autosave");
  await expect(note).toContainText("Not saved — this device's storage refused the save");
  await expect(note).toHaveAttribute("role", "alert");
  await expect(note).toHaveAttribute("aria-live", "assertive");
  const color = await note.evaluate((el) => getComputedStyle(el).color);
  expect(color).toBe("rgb(155, 42, 31)");
  const aligned = await note.evaluate((el) => {
    const mark = el.querySelector(".mark");
    const copy = el.querySelector(".fail-copy");
    if (!mark || !copy) return false;
    return Math.abs(mark.getBoundingClientRect().top - copy.getBoundingClientRect().top) < 2;
  });
  expect(aligned).toBe(true);
  await page.waitForTimeout(500);
  await expect(note).toContainText("Not saved — this device's storage refused the save");
  await page.evaluate(() => sessionStorage.removeItem("gbp-save-fail"));
  await page.getByTestId("save-retry").click();
  await expect(note).toHaveText(/✓\s*Autosaved on this device · \d{2}:\d{2}/);
});
