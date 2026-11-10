export const DICE_PREFS_KEY = "gbp-prefs";

export interface StoredDicePrefs {
  anim?: boolean;
  sound?: boolean;
}

export interface DicePrefs {
  anim: boolean;
  sound: boolean;
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
    return stored;
  } catch {
    return {};
  }
}

export function resolveDicePrefs(stored: StoredDicePrefs, reducedMotion: boolean): DicePrefs {
  return {
    anim: stored.anim ?? !reducedMotion,
    sound: stored.sound ?? true,
  };
}

export function withPref(stored: StoredDicePrefs, key: keyof StoredDicePrefs, value: boolean): StoredDicePrefs {
  return { ...stored, [key]: value };
}
