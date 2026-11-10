export const SAVING_DELAY_MS = 300;

export type SettledSave = "idle" | "saved" | "failed";
export type SaveNoteKind = "idle" | "saving" | "saved" | "failed";

export function formatSaveClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Saving appears only once a write has already taken the delay. A settled note stays until then. */
export function noteKind(settled: SettledSave, writing: boolean, elapsedMs: number): SaveNoteKind {
  if (writing && elapsedMs >= SAVING_DELAY_MS) return "saving";
  if (settled === "failed") return "failed";
  if (settled === "saved") return "saved";
  return "idle";
}

export type SaveHook = { delayMs: number; fail: boolean };

const DELAY_KEY = "gbp-save-delay";
const FAIL_KEY = "gbp-save-fail";

/** Test-only session flags. Production never sets them, so a normal write is unchanged. */
export function readSaveHook(storage: Pick<Storage, "getItem"> | null): SaveHook {
  if (!storage) return { delayMs: 0, fail: false };
  try {
    const raw = storage.getItem(DELAY_KEY);
    const delay = raw === null ? 0 : Number(raw);
    return {
      delayMs: Number.isFinite(delay) && delay > 0 ? Math.min(delay, 10_000) : 0,
      fail: storage.getItem(FAIL_KEY) === "1",
    };
  } catch {
    return { delayMs: 0, fail: false };
  }
}
