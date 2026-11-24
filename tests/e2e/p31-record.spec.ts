import { expect, test } from "@playwright/test";
import { assertDemoCursor, demoClick, demoHold, installDemoCursor } from "./support/demo-cursor";

test.use({
  viewport: { width: 1280, height: 800 },
  video: { mode: "on", size: { width: 1280, height: 800 } },
});

test("records character creation from a first open to the start section", async ({ page }) => {
  test.setTimeout(120_000);
  await installDemoCursor(page);
  await page.goto("/");
  await assertDemoCursor(page);
  await expect(page.getByTestId("creation")).toBeVisible();
  await expect(page.getByTestId("create-reason")).toHaveText("To begin, pick 2 more skills and choose a weapon.");
  await demoHold(page, 1800);

  await demoClick(page.getByTestId("create-skill-search"));
  await demoClick(page.getByTestId("create-skill-stealth"));
  await expect(page.getByTestId("create-reason")).toHaveText("To begin, choose a weapon.");
  await demoClick(page.getByTestId("create-skill-occult"));
  await expect(page.getByTestId("create-talent")).toHaveText("8");
  await demoHold(page, 1500);
  await demoClick(page.getByTestId("create-undo"));
  await expect(page.getByTestId("create-talent")).toHaveText("9");
  await demoClick(page.getByTestId("create-skill-occult"));
  await expect(page.getByTestId("create-talent")).toHaveText("8");

  await demoClick(page.getByTestId("create-weapon-one-handed"));
  await demoClick(page.getByTestId("create-shield"));
  await expect(page.getByTestId("create-shield")).toBeChecked();
  await demoClick(page.getByTestId("create-weapon-long"));
  await expect(page.getByTestId("create-shield")).not.toBeChecked();
  await demoHold(page, 1200);
  await demoClick(page.getByTestId("create-weapon-one-handed"));
  await demoClick(page.getByTestId("create-shield"));
  await expect(page.getByTestId("create-reason")).toHaveText("Ready. You start with Talent 8.");
  await page.getByTestId("create-begin").scrollIntoViewIfNeeded();
  await demoHold(page, 1500);

  await demoClick(page.getByTestId("create-begin"));
  await expect(page.getByTestId("section-title")).toHaveText("The stair");
  await expect(page.getByTestId("sheet-stat-talent")).toHaveText("8");
  await demoHold(page, 1500);
  await demoClick(page.getByTestId("open-sheet"));
  await expect(page.getByTestId("sheet-weapon")).toHaveText("One-handed weapon + shield");
  await demoHold(page, 2500);
});
