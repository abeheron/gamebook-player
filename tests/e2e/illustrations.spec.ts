import { expect, test } from "@playwright/test";

test("switches illustration display and returns focus from the viewer", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await expect(page.getByTestId("section-title")).toHaveText("The stair");
  await expect(page.getByTestId("illus-figure")).toBeVisible();
  await expect(page.getByTestId("illus-figure").locator(".prov")).toHaveText("Sample art");
  await expect(page.locator("[data-testid=illus-figure] svg")).toHaveAttribute("aria-label", /Sample art/);

  const frame = page.getByTestId("illus-open");
  await frame.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("illus-viewer")).toBeVisible();
  await expect(page.getByTestId("illus-close")).toBeFocused();
  await expect(page.getByTestId("illus-viewer")).toContainText("Section 1 illustration · Sample art");
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("illus-close")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("illus-viewer")).toHaveCount(0);
  await expect(frame).toBeFocused();

  await page.getByTestId("illus-mode-link").click();
  await expect(page.getByTestId("illus-figure")).toHaveCount(0);
  await expect(page.getByTestId("illus-open")).toHaveText("View illustration for section 1");
  await expect(page.getByTestId("illus-link-row").locator(".prov")).toHaveText("Sample art");
  await page.getByTestId("illus-open").click();
  await expect(page.getByTestId("illus-close")).toBeFocused();
  await page.getByTestId("illus-viewer").click({ position: { x: 4, y: 4 } });
  await expect(page.getByTestId("illus-viewer")).toHaveCount(0);
  await expect(page.getByTestId("illus-open")).toBeFocused();

  await page.getByTestId("illus-mode-hidden").click();
  await expect(page.getByTestId("illus-open")).toHaveCount(0);
  await expect(page.getByTestId("illus-figure")).toHaveCount(0);
  await expect(page.getByTestId("illus-pref")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("illus-mode-hidden")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("illus-open")).toHaveCount(0);

  await page.getByTestId("choice-take-lantern").click();
  await expect(page.getByTestId("section-title")).toHaveText("The landing");
  await expect(page.getByTestId("illus-pref")).toHaveCount(0);
  await expect(page.getByTestId("illus-figure")).toHaveCount(0);
  await expect(page.getByTestId("illus-open")).toHaveCount(0);
  await expect(page.getByTestId("section-body")).toBeVisible();
});
