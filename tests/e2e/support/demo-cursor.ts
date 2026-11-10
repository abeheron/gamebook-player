import type { Locator, Page } from "@playwright/test";
import { installCursor } from "./demo-cursor-script.js";

/** Video recordings set DEMO_CURSOR=1. Ordinary e2e and CI leave it unset. */
export function demoCursorEnabled(): boolean {
  return process.env.DEMO_CURSOR === "1";
}

const HOVER_MS = 600;
const RIPPLE_MS = 220;
const BETWEEN_MS = 1000;

/** Installs a pointer overlay before the page loads. It is not part of the app. */
export async function installDemoCursor(page: Page): Promise<void> {
  if (!demoCursorEnabled()) return;
  await page.addInitScript(installCursor);
}

/** Confirms the overlay is on the page before a recording continues. */
export async function assertDemoCursor(page: Page): Promise<void> {
  if (!demoCursorEnabled()) return;
  await page.evaluate(installCursor);
  const ready = await page.evaluate(() => {
    const root = document.getElementById("demo-cursor");
    if (!root) return false;
    const style = getComputedStyle(root);
    const move = (window as Window & { __demoCursorMove?: unknown }).__demoCursorMove;
    return style.position === "fixed" && style.pointerEvents === "none" && parseFloat(style.width) >= 24 && typeof move === "function";
  });
  if (!ready) throw new Error("The demo cursor did not attach.");
}

/** Holds on a result so a viewer can read it. No wait when the cursor is off. */
export async function demoHold(page: Page, ms = 1500): Promise<void> {
  if (!demoCursorEnabled()) return;
  await page.waitForTimeout(ms);
}

/** Glides to a control, pauses, shows a click ripple, then clicks it. */
export async function demoClick(locator: Locator): Promise<void> {
  if (!demoCursorEnabled()) {
    await locator.click();
    return;
  }
  const page = locator.page();
  await approach(page, locator);
  await showRipple(page);
  await locator.click();
  await page.waitForTimeout(BETWEEN_MS);
}

/** Glides to a field, focuses it, then types. */
export async function demoFill(locator: Locator, value: string): Promise<void> {
  if (!demoCursorEnabled()) {
    await locator.fill(value);
    return;
  }
  const page = locator.page();
  await approach(page, locator);
  await showRipple(page);
  await locator.click();
  await locator.fill(value);
  await page.waitForTimeout(BETWEEN_MS);
}

/** Glides to a control, then sends a key while it is focused. */
export async function demoPress(locator: Locator, key: string): Promise<void> {
  if (!demoCursorEnabled()) {
    await locator.press(key);
    return;
  }
  const page = locator.page();
  await approach(page, locator);
  await showRipple(page);
  await locator.press(key);
  await page.waitForTimeout(BETWEEN_MS);
}

async function showRipple(page: Page): Promise<void> {
  await page.evaluate(() => {
    const ripple = document.querySelector("#demo-cursor .ripple");
    if (!(ripple instanceof HTMLElement)) throw new Error("The demo cursor has no ripple.");
    ripple.classList.remove("go");
    void ripple.offsetWidth;
    ripple.classList.add("go");
  });
  await page.waitForTimeout(RIPPLE_MS);
}

async function approach(page: Page, locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error("The demo cursor could not see that control.");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.evaluate(({ x, y }) => {
    const demo = window as Window & { __demoCursorMove?: (x: number, y: number) => Promise<void> };
    if (!demo.__demoCursorMove) throw new Error("The demo cursor is not on the page.");
    return demo.__demoCursorMove(x, y);
  }, { x, y });
  await page.waitForTimeout(HOVER_MS);
}

