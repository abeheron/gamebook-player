import { expect, test } from "@playwright/test";

test("saves, reloads, undoes, and still opens offline", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByTestId("book-title")).toHaveText("The Lantern Stair");
  await expect(page.getByTestId("section-title")).toHaveText("The stair");
  await expect(page.getByTestId("sheet-stat-fortune")).toHaveText("3");
  await expect(page.getByTestId("save-status")).toHaveText("Saved on this device");

  await page.getByTestId("choice-take-lantern").click();
  await expect(page.getByTestId("section-title")).toHaveText("The landing");
  await expect(page.getByTestId("sheet-item-lantern")).toHaveText("Lantern");
  await expect(page.getByTestId("save-status")).toHaveText("Saved on this device");

  await page.reload();
  await expect(page.getByTestId("section-title")).toHaveText("The landing");
  await expect(page.getByTestId("sheet-item-lantern")).toBeVisible();

  await page.getByTestId("undo").click();
  await expect(page.getByTestId("section-title")).toHaveText("The stair");
  await expect(page.getByTestId("sheet-item-lantern")).toHaveCount(0);
  await expect(page.getByTestId("save-status")).toHaveText("Saved on this device");

  await page.reload();
  await expect(page.getByTestId("section-title")).toHaveText("The stair");
  await expect(page.getByTestId("sheet-stat-vitality")).toHaveText("3");

  await page.getByTestId("choice-take-lantern").click();
  await page.getByTestId("choice-tick-and-study").click();
  await expect(page.getByTestId("sheet-tick-landing-box")).toContainText("Landing box: 1");
  await expect(page.getByTestId("section-title")).toHaveText("The mark");
  await page.getByTestId("roll-test").click();
  await expect(page.getByTestId("section-title")).not.toHaveText("The mark");
  await expect(page.getByTestId("save-status")).toHaveText("Saved on this device");
  await page.getByTestId("undo").click();
  await expect(page.getByTestId("section-title")).toHaveText("The mark");

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
