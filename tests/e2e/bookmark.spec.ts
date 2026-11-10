import { expect, test } from "@playwright/test";

test("bookmarks the current section and keeps it after reload", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await expect(page.locator(".kicker").getByTestId("bookmark")).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("bookmark")).toHaveText(/☆\s*Bookmark/);
  await expect(page.locator("aside").getByTestId("bookmark")).toHaveCount(0);
  await page.getByTestId("choice-take-lantern").click();
  await expect(page.getByTestId("autosave")).toHaveText(/✓\s*Autosaved on this device · \d{2}:\d{2}/);
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await expect(page.getByTestId("autosave")).toHaveAttribute("data-phase", "saved");
  const saved = await page.getByTestId("autosave").getAttribute("data-saved-count");
  await page.getByTestId("bookmark").click();
  await expect(page.getByTestId("bookmark")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("bookmark")).toHaveText(/★\s*Bookmarked/);
  await expect(page.getByTestId("autosave")).not.toHaveAttribute("data-saved-count", saved ?? "");
  await page.reload();
  await expect(page.getByTestId("section-title")).toHaveText("The landing");
  await expect(page.getByTestId("bookmark")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("choice-tick-and-study").click();
  await expect(page.getByTestId("bookmark")).toHaveAttribute("aria-pressed", "false");
  await page.getByTestId("undo").click();
  await expect(page.getByTestId("section-title")).toHaveText("The landing");
  await expect(page.getByTestId("bookmark")).toHaveAttribute("aria-pressed", "true");
});

test("loads a version 2 save without bookmarks", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  await page.evaluate(async () => {
    const record = {
      version: 2,
      savedAt: "2026-11-09T00:00:00.000Z",
      session: {
        bookId: "lantern-stair",
        state: {
          sectionId: "2",
          stats: { talent: 9, vitality: 3, fortune: 3 },
          skills: [
            { id: "climbing", bonus: 2 },
            { id: "linguistics", bonus: 2 },
          ],
          gold: 10,
          items: [{ id: "ration", label: "Ration" }],
          keywords: [],
          ticks: {},
          rolls: [],
          pending: null,
        },
        undo: [],
      },
    };
    await new Promise<void>((resolve, reject) => {
      const opening = indexedDB.open("gamebook-player", 1);
      opening.onerror = () => reject(opening.error);
      opening.onsuccess = () => {
        const database = opening.result;
        const transaction = database.transaction("saves", "readwrite");
        transaction.objectStore("saves").put(record, "demo");
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
    });
  });
  await page.reload();
  await expect(page.getByTestId("section-title")).toHaveText("The landing");
  await expect(page.getByTestId("bookmark")).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("autosave")).toHaveText(/✓\s*Autosaved on this device · \d{2}:\d{2}/);
});

test("keeps the bookmark on the section line at desktop and 390px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("autosave")).toContainText("Autosaved on this device");
  const desktop = await page.evaluate(() => {
    const section = document.querySelector(".secno")?.getBoundingClientRect();
    const button = document.querySelector("[data-testid=bookmark]")?.getBoundingClientRect();
    const sheet = document.querySelector("[data-testid=open-sheet]")?.getBoundingClientRect();
    const note = document.querySelector("[data-testid=autosave]")?.getBoundingClientRect();
    const style = button ? getComputedStyle(document.querySelector("[data-testid=bookmark]") as Element) : null;
    if (!section || !button || !sheet || !note || !style) return null;
    return {
      sameRow: Math.abs(section.top + section.height / 2 - (button.top + button.height / 2)) < 8,
      buttonRight: button.left > section.right,
      noteBelow: note.top >= sheet.bottom - 1,
      tall: button.height >= 44,
      filled: style.backgroundColor,
      ink: style.color,
    };
  });
  expect(desktop?.sameRow).toBe(true);
  expect(desktop?.buttonRight).toBe(true);
  expect(desktop?.noteBelow).toBe(true);
  expect(desktop?.tall).toBe(true);
  expect(desktop?.filled).toBe("rgba(0, 0, 0, 0)");
  expect(desktop?.ink).toBe("rgb(138, 47, 29)");

  await page.getByTestId("bookmark").click();
  const on = await page.getByTestId("bookmark").evaluate((el) => {
    const style = getComputedStyle(el);
    return { filled: style.backgroundColor, ink: style.color };
  });
  expect(on.filled).toBe("rgb(138, 47, 29)");
  expect(on.ink).toBe("rgb(255, 255, 255)");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("bookmark")).toHaveAttribute("aria-label", "Bookmarked");
  const phone = await page.evaluate(() => {
    const section = document.querySelector(".secno")?.getBoundingClientRect();
    const button = document.querySelector("[data-testid=bookmark]")?.getBoundingClientRect();
    const text = document.querySelector("[data-testid=bookmark] .txt");
    const sheet = document.querySelector("[data-testid=open-sheet]")?.getBoundingClientRect();
    const note = document.querySelector("[data-testid=autosave]")?.getBoundingClientRect();
    if (!section || !button || !text || !sheet || !note) return null;
    return {
      sameRow: Math.abs(section.top + section.height / 2 - (button.top + button.height / 2)) < 8,
      width: button.width,
      height: button.height,
      hidden: getComputedStyle(text).position === "absolute",
      noteBelow: note.top >= sheet.bottom - 1,
    };
  });
  expect(phone?.sameRow).toBe(true);
  expect(phone?.hidden).toBe(true);
  expect(phone?.width ?? 99).toBeLessThanOrEqual(48);
  expect(phone?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(phone?.noteBelow).toBe(true);
});
