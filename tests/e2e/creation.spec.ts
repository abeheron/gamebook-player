import { expect, test, type Page } from "@playwright/test";
import { FIXTURE_URL } from "./support/fixture";
import { addCopperLantern, savedSlot } from "./support/sample-import";

/** A first open has no book in play. Importing the sample book and opening it with no save starts creation. */
async function openCopperCreation(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByTestId("library")).toBeVisible();
  await expect(page.getByTestId("library-empty")).toHaveText("No books yet. Import a book file to start.");
  await addCopperLantern(page);
  await page.getByTestId("library-continue-the-copper-lantern").click();
  await expect(page.getByTestId("creation")).toBeVisible();
}

test("opening an imported book with no save goes through creation, trades Talent for a skill, and begins at the start section", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await openCopperCreation(page);
  await expect(page.getByTestId("book-title")).toHaveText("The Copper Lantern");
  await expect(page.locator(".rights")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("Converted on this device from a file the reader supplied.");
  await expect(page.locator("main")).not.toContainText("Original sample text");
  await expect(page.getByRole("heading", { name: "New character" })).toBeVisible();
  await expect(page.getByTestId("creation")).toContainText(
    "Pick two skills and a weapon. You can give up 1 Talent for each extra skill, up to three times.",
  );
  await expect(page.getByTestId("side-new-character")).toHaveAttribute("aria-current", "step");
  for (const id of ["side-read", "side-character", "side-test", "side-keywords", "side-library", "side-rules"]) {
    await expect(page.getByTestId(id)).toBeDisabled();
  }
  await expect(page.getByTestId("side-locked-note")).toHaveText("Other screens open after you begin.");
  await expect(page.getByTestId("undo")).toHaveCount(0);
  await expect(page.getByTestId("new-game")).toHaveCount(0);
  await expect(page.getByTestId("section-title")).toHaveCount(0);

  const reason = page.getByTestId("create-reason");
  const begin = page.getByTestId("create-begin");
  await expect(reason).toHaveText("To begin, pick 2 more skills and choose a weapon.");
  await expect(begin).toBeDisabled();
  await expect(begin).toHaveText("Begin adventure → §1");
  await expect(page.getByTestId("create-summary-skills")).toHaveText("None yet");
  await expect(page.getByTestId("create-summary-weapon")).toHaveText("Not chosen");
  await expect(page.getByTestId("create-cost-search")).toHaveText("Free");
  await expect(page.getByTestId("create-undo")).toBeDisabled();

  await page.getByTestId("create-skill-search").click();
  await expect(reason).toHaveText("To begin, pick 1 more skill and choose a weapon.");
  await page.getByTestId("create-skill-stealth").click();
  await expect(reason).toHaveText("To begin, choose a weapon.");
  await expect(page.getByTestId("create-counter")).toHaveText("2 of 2 free · Trades 0 of 3");
  await expect(page.getByTestId("create-cost-occult")).toHaveText("−1 Talent");
  await expect(page.getByTestId("create-talent")).toHaveText("9");
  await expect(page.getByTestId("create-talent-note")).toHaveText("");

  await page.getByTestId("create-skill-occult").click();
  await expect(page.getByTestId("create-talent")).toHaveText("8");
  await expect(page.getByTestId("create-talent-note")).toHaveText("Started at 9");
  await expect(page.getByTestId("create-talent-stat")).toHaveClass(/changed/);
  await expect(page.getByTestId("create-counter")).toHaveText("2 of 2 free · Trades 1 of 3");
  await expect(page.getByTestId("create-summary-skills").locator(".chip.traded")).toHaveText("Occult +2");

  await page.getByTestId("create-undo").click();
  await expect(page.getByTestId("create-skill-occult")).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("create-talent")).toHaveText("9");
  await expect(page.getByTestId("create-undo")).toBeDisabled();

  await page.getByTestId("create-skill-occult").click();
  await page.getByTestId("create-skill-tracking").click();
  await expect(page.getByTestId("create-talent")).toHaveText("7");
  await page.getByTestId("create-skill-tracking").click();
  await expect(page.getByTestId("create-talent")).toHaveText("8");

  await page.getByTestId("create-skill-tracking").click();
  await page.getByTestId("create-skill-climbing").click();
  await expect(page.getByTestId("create-talent")).toHaveText("6");
  await expect(page.getByTestId("create-skill-larceny")).toBeDisabled();
  await expect(page.getByTestId("create-cost-larceny")).toHaveText("");
  await page.getByTestId("create-undo").click();
  await page.getByTestId("create-undo").click();
  await expect(page.getByTestId("create-talent")).toHaveText("8");
  await expect(page.getByTestId("create-skill-larceny")).toBeEnabled();

  const shield = page.getByTestId("create-shield");
  await expect(shield).toBeDisabled();
  await expect(page.getByTestId("create-shield-text")).toHaveText("Shield: only with a one-handed weapon.");
  await page.getByTestId("create-weapon-one-handed").click();
  await expect(shield).toBeEnabled();
  await expect(shield).not.toBeChecked();
  await expect(page.getByTestId("create-shield-text")).toHaveText(
    "Take a shield (optional). It lowers a fight penalty by 1, or by 2 against several foes.",
  );
  await shield.check();
  await expect(page.getByTestId("create-summary-weapon")).toHaveText("One-handed weapon + shield");
  await page.getByTestId("create-weapon-long").click();
  await expect(shield).not.toBeChecked();
  await expect(shield).toBeDisabled();
  await expect(page.getByTestId("create-summary-weapon")).toHaveText("Long weapon");
  await page.getByTestId("create-weapon-one-handed").click();
  await expect(shield).not.toBeChecked();
  await shield.check();
  await page.getByTestId("create-weapon-two-handed").click();
  await expect(shield).not.toBeChecked();
  await page.getByTestId("create-weapon-one-handed").click();
  await shield.check();

  await expect(reason).toHaveText("Ready. You start with Talent 8.");
  expect(await reason.evaluate((node) => getComputedStyle(node).color)).toBe("rgb(47, 107, 58)");
  await expect(begin).toBeEnabled();
  expect(await savedSlot(page, "the-copper-lantern")).toBeNull();

  await begin.click();
  await expect(page.getByTestId("section-title")).toHaveText("§1");
  await expect(page.getByTestId("book-title")).toHaveText("The Copper Lantern");
  await expect(page.getByTestId("creation")).toHaveCount(0);
  await expect(page.getByTestId("side-read")).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await page.getByTestId("open-sheet").click();
  await expect(page.getByTestId("sheet-stat-talent")).toHaveText("8");
  await expect(page.getByTestId("sheet-skill-search")).toHaveText("Search +2");
  await expect(page.getByTestId("sheet-skill-stealth")).toHaveText("Stealth +2");
  await expect(page.getByTestId("sheet-skill-occult")).toHaveText("Occult +2");
  await expect(page.getByTestId("sheet-skill-climbing")).toHaveCount(0);
  await expect(page.getByTestId("sheet-weapon")).toHaveText("One-handed weapon + shield");
  await expect(page.getByTestId("sheet-gold")).toHaveText("10 gp");
  await expect(page.getByTestId("sheet-item-ration")).toHaveText("Ration");

  await page.reload();
  await expect(page.getByTestId("section-title")).toHaveText("§1");
  await expect(page.getByTestId("creation")).toHaveCount(0);
  await expect(page.getByTestId("sheet-stat-talent")).toHaveText("8");
});

test("New game opens creation and keeps the old save until Begin", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await openCopperCreation(page);
  await page.getByTestId("create-skill-larceny").click();
  await page.getByTestId("create-skill-naturalist").click();
  await page.getByTestId("create-weapon-two-handed").click();
  await page.getByTestId("create-begin").click();
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await page.getByTestId("choice-c2").click();
  await expect(page.getByTestId("section-title")).toHaveText("§3");
  await expect(page.getByTestId("autosave")).toHaveAttribute("data-phase", "saved");

  await page.getByTestId("new-game").click();
  await expect(page.getByTestId("creation")).toBeVisible();
  await expect(page.getByTestId("create-reason")).toHaveText("To begin, pick 2 more skills and choose a weapon.");
  await page.getByTestId("create-skill-swimming").click();
  await page.reload();
  await expect(page.getByTestId("section-title")).toHaveText("§3");
  await expect(page.getByTestId("sheet-skill-larceny")).toHaveText("Larceny +2");
});

test("stacks creation on a phone: character, skills, weapon, kit, then Begin", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await openCopperCreation(page);
  await expect(page.getByTestId("side-nav")).toBeHidden();
  await expect(page.getByTestId("mobile-nav")).toHaveCount(0);
  const order = ["create-summary", "create-skills", "create-weapon", "create-kit", "create-begin-card"];
  const tops: number[] = [];
  for (const id of order) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box).toBeTruthy();
    tops.push(box?.y ?? 0);
  }
  expect([...tops].sort((a, b) => a - b)).toEqual(tops);
  const first = await page.getByTestId("create-skill-climbing").boundingBox();
  const second = await page.getByTestId("create-skill-diplomacy").boundingBox();
  expect(first && second && second.y > first.y && Math.abs(second.x - first.x) < 2).toBe(true);
  const one = await page.getByTestId("create-weapon-one-handed").boundingBox();
  const long = await page.getByTestId("create-weapon-long").boundingBox();
  expect(one && long && long.y > one.y && Math.abs(long.x - one.x) < 2).toBe(true);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.getByTestId("create-skill-climbing").click();
  await page.getByTestId("create-skill-search").click();
  await page.getByTestId("create-skill-tracking").click();
  await page.getByTestId("create-weapon-long").click();
  await expect(page.getByTestId("create-talent")).toHaveText("8");
  await page.getByTestId("create-begin").click();
  await expect(page.getByTestId("section-title")).toHaveText("§1");
  await expect(page.getByTestId("mobile-nav")).toBeVisible();
  await expect(page.getByTestId("mobile-book")).toHaveText("The Copper Lantern");
});

test("New game on the hidden fixture book shows no sample-rights line under creation", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(FIXTURE_URL);
  await expect(page.getByTestId("book-title")).toHaveText("The Lantern Stair");
  await expect(page.locator(".rights")).toContainText("Original sample text");
  await page.getByTestId("new-game").click();
  await expect(page.getByTestId("creation")).toBeVisible();
  await expect(page.locator(".rights")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("Original sample text");
});
