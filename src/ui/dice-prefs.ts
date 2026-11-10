export const DICE_PREFS_KEY = "gbp-prefs";

export type IllustrationMode = "inline" | "link" | "hidden";

const ILLUSTRATION_MODES: readonly IllustrationMode[] = ["inline", "link", "hidden"];

export interface StoredDicePrefs {
  anim?: boolean;
  sound?: boolean;
  illus?: IllustrationMode;
}

export interface DicePrefs {
  anim: boolean;
  sound: boolean;
  illus: IllustrationMode;
}

/** Missing keys keep the defaults. An explicit stored false is kept. */
export function parseStoredPrefs(raw: string | null): StoredDicePrefs {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
    const record = value as Record<string, unknown>;
    const stored: StoredDicePrefs = {};
    if (typeof record.anim === "boolean") stored.anim = record.anim;
    if (typeof record.sound === "boolean") stored.sound = record.sound;
    if (typeof record.illus === "string" && ILLUSTRATION_MODES.includes(record.illus as IllustrationMode)) {
      stored.illus = record.illus as IllustrationMode;
    }
    return stored;
  } catch {
    return {};
  }
}

export function resolveDicePrefs(stored: StoredDicePrefs, reducedMotion: boolean): DicePrefs {
  return {
    anim: stored.anim ?? !reducedMotion,
    sound: stored.sound ?? true,
    illus: stored.illus ?? "inline",
  };
}

export function withPref(stored: StoredDicePrefs, key: "anim" | "sound", value: boolean): StoredDicePrefs {
  return { ...stored, [key]: value };
}

/** Stores only the changed illustration choice. A missing key stays Inline. */
export function withIllustration(stored: StoredDicePrefs, value: IllustrationMode): StoredDicePrefs {
  return { ...stored, illus: value };
}
