import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const valid = {
  name: "imported-stair.json",
  mimeType: "application/json",
  buffer: readFileSync(new URL("../fixtures/imported-stair.json", import.meta.url)),
};
const invalid = {
  name: "imported-invalid.json",
  mimeType: "application/json",
  buffer: readFileSync(new URL("../fixtures/imported-invalid.json", import.meta.url)),
};

test("imports a valid book, keeps it after reload, and rejects an invalid file", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await page.getByTestId("side-library").click();
  await expect(page.getByTestId("library")).toBeVisible();
  await expect(page.getByTestId("library")).not.toContainText("Sample book");
  await expect(page.locator(".demo")).toHaveCount(0);
  await expect(page.getByTestId("library-book-lantern-stair")).toBeVisible();
  await expect(page.getByTestId("library-continue-lantern-stair")).toHaveText("Continue · §1");

  await page.getByTestId("import-input").setInputFiles(valid);
  await expect(page.getByTestId("import-step-1")).toHaveAttribute("data-state", "ok");
  await expect(page.getByTestId("import-step-2")).toHaveAttribute("data-state", "ok");
  await expect(page.getByTestId("import-step-3")).toHaveAttribute("data-state", "ok");
  await expect(page.getByTestId("import-step-4")).toHaveAttribute("data-state", "ok");
  await expect(page.getByTestId("library-book-imported-stair")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await page.getByTestId("side-library").click();
  await expect(page.getByTestId("library-book-imported-stair")).toBeVisible();
  await page.getByTestId("library-continue-imported-stair").click();
  await expect(page.getByTestId("section-title")).toHaveText("The landing import");

  await page.getByTestId("side-library").click();
  const before = await page.locator("[data-testid^=library-book-]").count();
  await page.getByTestId("import-input").setInputFiles(invalid);
  await expect(page.getByTestId("import-step-2")).toHaveAttribute("data-state", "fail");
  await expect(page.getByTestId("import-step-2")).toContainText("choices");
  await expect(page.getByTestId("library-book-broken-book")).toHaveCount(0);
  await expect(page.locator("[data-testid^=library-book-]")).toHaveCount(before);
});
