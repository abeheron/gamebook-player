import { expect, test } from "@playwright/test";

test("keeps Fortune beside the reroll on a desktop and under it at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await expect(page.getByTestId("choice-take-lantern")).not.toContainText("§");
  await page.getByTestId("choice-take-lantern").click();
  await page.getByTestId("choice-tick-and-study").click();
  await page.getByTestId("open-test").click();

  const wideReroll = await page.getByTestId("fortune-reroll").boundingBox();
  const wideCount = await page.getByTestId("fortune-count").boundingBox();
  expect(wideReroll && wideCount).toBeTruthy();
  expect(wideReroll!.height).toBeGreaterThanOrEqual(44);
  expect(wideCount!.x).toBeGreaterThan(wideReroll!.x + wideReroll!.width - 1);
  expect(wideCount!.y).toBeGreaterThan(wideReroll!.y - 1);
  expect(wideCount!.y).toBeLessThan(wideReroll!.y + wideReroll!.height);

  const pass = page.getByTestId("destination-pass");
  const fail = page.getByTestId("destination-fail");
  await expect(pass).toHaveText("Pass → §4 · The reading");
  await expect(fail).toHaveText("Fail → §5 · The scrape");
  await expect(pass).toHaveAccessibleName("Pass, section 4, The reading");
  await expect(pass.locator(".dest-keep")).toHaveCSS("white-space", "pre");
  const passBox = await pass.boundingBox();
  const failBox = await fail.boundingBox();
  expect(passBox && failBox).toBeTruthy();
  expect(Math.abs(passBox!.y - failBox!.y)).toBeLessThan(4);
  expect(failBox!.x).toBeGreaterThan(passBox!.x + passBox!.width - 2);
  expect(passBox!.width + failBox!.width).toBeLessThan(720);
  const full = await page.getByTestId("open-full-test").boundingBox();
  const close = await page.getByTestId("close-test").boundingBox();
  expect(full && close && Math.abs(full.y - close.y)).toBeLessThan(2);

  await expect(page.getByTestId("sheet-fortune")).toHaveAttribute("aria-label", "Fortune 3 of 3");
  await expect(page.getByTestId("sheet-stat-fortune")).toHaveText("3");
  await expect(page.locator(".fortune-max")).toHaveText("/ 3");
  await expect(page.getByTestId("fortune-pip")).toHaveCount(3);
  await expect(page.locator("[data-testid=fortune-pip].on")).toHaveCount(3);
  const pip = await page.getByTestId("fortune-pip").first().boundingBox();
  expect(pip?.width).toBe(10);
  expect(pip?.height).toBe(10);
  const fortuneType = await page.getByTestId("sheet-fortune").evaluate((element) => {
    const value = element.querySelector("[data-testid=sheet-stat-fortune]");
    const max = element.querySelector(".fortune-max");
    if (!(value instanceof HTMLElement) || !(max instanceof HTMLElement)) return null;
    return {
      valueSize: Number.parseFloat(getComputedStyle(value).fontSize),
      maxSize: Number.parseFloat(getComputedStyle(max).fontSize),
      color: getComputedStyle(max).color,
    };
  });
  expect(fortuneType).toBeTruthy();
  expect(fortuneType!.maxSize).toBeLessThan(fortuneType!.valueSize);
  expect(fortuneType!.color).toBe("rgb(92, 83, 72)");

  await page.setViewportSize({ width: 390, height: 844 });
  const narrowReroll = await page.getByTestId("fortune-reroll").boundingBox();
  const narrowCount = await page.getByTestId("fortune-count").boundingBox();
  const narrowPass = await page.getByTestId("destination-pass").boundingBox();
  const narrowFail = await page.getByTestId("destination-fail").boundingBox();
  expect(narrowReroll && narrowCount && narrowPass && narrowFail).toBeTruthy();
  expect(narrowCount!.y).toBeGreaterThanOrEqual(narrowReroll!.y + narrowReroll!.height - 1);
  expect(Math.abs(narrowCount!.x - narrowReroll!.x)).toBeLessThan(2);
  expect(narrowFail!.y).toBeGreaterThanOrEqual(narrowPass!.y + narrowPass!.height - 2);
  expect(narrowPass!.width).toBeGreaterThan(300);
  expect(narrowFail!.width).toBeGreaterThan(300);
  expect(narrowReroll!.width).toBeGreaterThan(300);
  const narrowFull = await page.getByTestId("open-full-test").boundingBox();
  const narrowClose = await page.getByTestId("close-test").boundingBox();
  expect(narrowFull && narrowClose && Math.abs(narrowFull.y - narrowClose.y)).toBeLessThan(2);
});
