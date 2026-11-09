import { describe, expect, it } from "vitest";
import { parseStoredPrefs, resolveDicePrefs, withPref } from "../../src/ui/dice-prefs";

describe("dice settings", () => {
  it("follows reduced motion and keeps sound on when nothing was stored", () => {
    expect(resolveDicePrefs(parseStoredPrefs(null), true)).toEqual({ anim: false, sound: true });
    expect(resolveDicePrefs(parseStoredPrefs("{}"), false)).toEqual({ anim: true, sound: true });
    expect(parseStoredPrefs("not json")).toEqual({});
    expect(parseStoredPrefs('{"anim":"yes","sound":0,"extra":true}')).toEqual({});
  });

  it("keeps an explicit choice, including off", () => {
    expect(resolveDicePrefs(parseStoredPrefs('{"sound":false}'), false)).toEqual({ anim: true, sound: false });
    expect(resolveDicePrefs(parseStoredPrefs('{"anim":true}'), true)).toEqual({ anim: true, sound: true });
    expect(withPref({ sound: false }, "anim", false)).toEqual({ sound: false, anim: false });
  });
});
