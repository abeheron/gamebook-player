import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

/** The repo's own original sample PDF. It is not published book text. */
export const copperPdf = {
  name: "copper-lantern.pdf",
  mimeType: "application/pdf",
  buffer: readFileSync(new URL("../../fixtures/convert/copper-lantern.pdf", import.meta.url)),
};

/** Imports copper-lantern.pdf from an open Library, fixes its one flagged section, and adds it. */
export async function addCopperLantern(page: Page): Promise<void> {
  await page.getByTestId("import-input").setInputFiles(copperPdf);
  await expect(page.getByTestId("review-flag-3")).toHaveText("CHECK");
  await page.getByTestId("review-section-3").click();
  await page.getByTestId("review-choice-to-0").fill("5");
  await page.getByTestId("review-mark").click();
  await page.getByTestId("review-add").click();
  await expect(page.getByTestId("library-book-the-copper-lantern")).toBeVisible();
}

/** Reads one save slot straight from IndexedDB, or null when there is none. */
export async function savedSlot(page: Page, slot: string): Promise<unknown> {
  return page.evaluate(
    (key) =>
      new Promise((resolve, reject) => {
        const opening = indexedDB.open("gamebook-player", 2);
        opening.onerror = () => reject(opening.error);
        opening.onsuccess = () => {
          const database = opening.result;
          if (!database.objectStoreNames.contains("saves")) {
            database.close();
            resolve(null);
            return;
          }
          const reading = database.transaction("saves", "readonly").objectStore("saves").get(key);
          reading.onsuccess = () => {
            database.close();
            resolve(reading.result ?? null);
          };
          reading.onerror = () => reject(reading.error);
        };
      }),
    slot,
  );
}
