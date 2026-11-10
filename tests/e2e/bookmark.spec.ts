import { expect, test } from "@playwright/test";

test("bookmarks the current section and keeps it after reload", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("save-status")).toHaveText("Saved on this device");
  await expect(page.getByTestId("bookmark")).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("bookmark")).toHaveText("☆ Bookmark");
  await page.getByTestId("choice-take-lantern").click();
  await expect(page.getByTestId("autosave")).toHaveText("Autosaved");
  await expect(page.getByTestId("save-status")).toHaveText("Saved on this device");
  await page.getByTestId("bookmark").click();
  await expect(page.getByTestId("bookmark")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("bookmark")).toHaveText("★ Bookmarked");
  await expect(page.getByTestId("save-status")).toHaveText("Saved on this device");
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
  await expect(page.getByTestId("save-status")).toHaveText("Saved on this device");
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
  await expect(page.getByTestId("autosave")).toHaveText("Autosaved");
});
