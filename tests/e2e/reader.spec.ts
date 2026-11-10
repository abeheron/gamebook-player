import { expect, test } from "@playwright/test";

test("saves, reloads, undoes, and still opens offline", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByTestId("book-title")).toHaveText("The Lantern Stair");
  await expect(page.getByTestId("section-title")).toHaveText("The stair");
  await expect(page.getByTestId("sheet-stat-fortune")).toHaveText("3 / 3");
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");

  const landed = await page.getByTestId("autosave").getAttribute("data-saved-count");
  await page.getByTestId("choice-take-lantern").click();
  await expect(page.getByTestId("section-title")).toHaveText("The landing");
  await expect(page.getByTestId("sheet-item-lantern")).toHaveText("Lantern");
  await expect(page.getByTestId("autosave")).not.toHaveAttribute("data-saved-count", landed ?? "");
  await page.getByTestId("open-sheet").click();
  await expect(page.getByTestId("sheet-view")).toBeVisible();
  await expect(page.getByTestId("sheet-item-lantern")).toHaveText("Lantern");
  await page.getByTestId("view-back").click();
  await expect(page.getByTestId("section-title")).toHaveText("The landing");

  await page.reload();
  await expect(page.getByTestId("section-title")).toHaveText("The landing");
  await expect(page.getByTestId("sheet-item-lantern")).toBeVisible();

  await expect(page.getByTestId("autosave")).toHaveAttribute("data-phase", "saved");
  const undone = await page.getByTestId("autosave").getAttribute("data-saved-count");
  await page.getByTestId("undo").click();
  await expect(page.getByTestId("section-title")).toHaveText("The stair");
  await expect(page.getByTestId("sheet-item-lantern")).toHaveCount(0);
  await expect(page.getByTestId("autosave")).not.toHaveAttribute("data-saved-count", undone ?? "");

  await page.reload();
  await expect(page.getByTestId("section-title")).toHaveText("The stair");
  await expect(page.getByTestId("sheet-stat-vitality")).toHaveText("3");

  await page.getByTestId("choice-take-lantern").click();
  await page.getByTestId("choice-tick-and-study").click();
  await expect(page.getByTestId("sheet-tick-landing-box")).toContainText("Landing box: 1");
  await expect(page.getByTestId("section-title")).toHaveText("The mark");
  await expect(page.getByTestId("sheet-tick-landing-box")).toHaveCount(1);
  await page.getByTestId("open-test").click();
  await expect(page.getByTestId("section-body")).toBeVisible();
  await expect(page.getByTestId("test-formula")).toContainText("2d6 ≤ Talent 9");
  await page.getByTestId("roll-test").click();
  await page.locator("[data-testid=destination-pass]:enabled, [data-testid=destination-fail]:enabled").click();
  await expect(page.getByTestId("section-title")).not.toHaveText("The mark");
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await expect(page.getByTestId("autosave")).toHaveAttribute("data-phase", "saved");
  const marked = await page.getByTestId("autosave").getAttribute("data-saved-count");
  await page.getByTestId("undo").click();
  await expect(page.getByTestId("section-title")).toHaveText("The mark");
  await expect(page.getByTestId("autosave")).not.toHaveAttribute("data-saved-count", marked ?? "");

  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration?.active?.state === "activated";
  });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await expect(page.getByTestId("section-title")).toHaveText("The mark");
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId("book-title")).toHaveText("The Lantern Stair");
  await expect(page.getByTestId("section-title")).toHaveText("The mark");
  await expect(page.getByTestId("sheet-item-lantern")).toBeVisible();
});

test("stacks the sheet on a phone and keeps Back off the story", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await expect(page.getByTestId("side-nav")).toBeHidden();
  await expect(page.getByTestId("mobile-nav")).toBeVisible();
  await page.getByTestId("choice-take-lantern").click();
  await page.getByTestId("mobile-character").click();
  await expect(page.getByTestId("sheet-view")).toBeVisible();
  await expect(page.getByTestId("sheet-item-lantern")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("section-title")).toHaveText("The landing");
  await expect(page.getByTestId("sheet-item-lantern")).toBeVisible();
  await page.getByTestId("undo").click();
  await expect(page.getByTestId("section-title")).toHaveText("The stair");
  await expect(page.getByTestId("sheet-item-lantern")).toHaveCount(0);
});
